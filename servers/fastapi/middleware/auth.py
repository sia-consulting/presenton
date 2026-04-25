"""
Mandatory Entra ID JWT bearer-token validation middleware.

Requires *both* AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID environment
variables.  The application will **fail to start** if they are absent,
unless ``DISABLE_AUTH=true`` is set for local development.

The middleware validates the ``Authorization: Bearer <token>`` header on every
request by:

1. Fetching Microsoft's public JWKS (cached in-memory for 1 hour).
2. Verifying the JWT signature (RS256) against the JWKS, including support
   for Microsoft access tokens that embed a ``nonce`` in the JWT header.
3. Checking ``iss``, ``exp`` / ``nbf`` claims.

No client secret is required — this relies purely on Microsoft's published
public keys.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict, Optional

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lightweight RSA JWT verification (stdlib + httpx, no PyJWT dependency)
# ---------------------------------------------------------------------------

import base64
import hashlib
import hmac
import struct

# We only need the built-in ``int.from_bytes`` + RSA math for RS256.


def _b64url_decode(data: str) -> bytes:
    """Base64url-decode *data* (with padding fix)."""
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def _int_from_b64url(data: str) -> int:
    return int.from_bytes(_b64url_decode(data), byteorder="big")


def _b64url_encode(data: bytes) -> str:
    """Base64url-encode *data* without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _build_signing_input(header_b64: str, payload_b64: str) -> bytes:
    """Return the byte-string that was actually signed.

    Microsoft Entra ID access tokens (e.g. for Microsoft Graph) include a
    ``nonce`` claim in the JWT header.  When the token is signed the nonce
    value is replaced by ``base64url(SHA-256(nonce))`` in the header that
    forms the signing input.  The delivered token then carries the original
    (unhashed) nonce so the recipient can reconstruct the signed bytes.

    For tokens **without** a header nonce the signing input is simply the
    standard ``header_b64.payload_b64``.
    """
    header = json.loads(_b64url_decode(header_b64))

    if "nonce" not in header:
        return f"{header_b64}.{payload_b64}".encode()

    # Replace nonce with its SHA-256 hash (base64url, no padding)
    nonce_hash = _b64url_encode(
        hashlib.sha256(header["nonce"].encode("ascii")).digest()
    )
    header["nonce"] = nonce_hash

    # Re-serialise with compact JSON (no whitespace) – dict ordering is
    # preserved by Python ≥ 3.7, matching the original key order.
    modified_header_b64 = _b64url_encode(
        json.dumps(header, separators=(",", ":")).encode("utf-8")
    )
    return f"{modified_header_b64}.{payload_b64}".encode()


def _verify_rs256(token: str, n: int, e: int) -> Dict[str, Any]:
    """Verify an RS256-signed JWT and return its decoded payload.

    Supports Microsoft Entra ID access tokens whose JWT header contains a
    ``nonce`` claim (see :func:`_build_signing_input`).

    Raises ``ValueError`` on any verification failure.
    """
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Malformed JWT")

    header_b64, payload_b64, sig_b64 = parts

    header = json.loads(_b64url_decode(header_b64))
    if header.get("alg") != "RS256":
        raise ValueError(f"Unsupported algorithm: {header.get('alg')}")

    # RSA signature verification (PKCS#1 v1.5 / RS256)
    signature = _b64url_decode(sig_b64)
    sig_int = int.from_bytes(signature, byteorder="big")

    # RSA public-key operation: m = s^e mod n
    key_len = (n.bit_length() + 7) // 8
    m = pow(sig_int, e, n)
    em = m.to_bytes(key_len, byteorder="big")

    # PKCS#1 v1.5 encoding: 0x00 0x01 <padding 0xff> 0x00 <DigestInfo>
    # DigestInfo for SHA-256: fixed prefix
    digest_info_prefix = (
        b"\x30\x31\x30\x0d\x06\x09\x60\x86\x48\x01\x65\x03\x04\x02\x01"
        b"\x05\x00\x04\x20"
    )
    message = _build_signing_input(header_b64, payload_b64)
    expected_digest = hashlib.sha256(message).digest()
    expected_suffix = digest_info_prefix + expected_digest

    # em should be: 0x00 0x01 [0xff padding] 0x00 <expected_suffix>
    if not em.startswith(b"\x00\x01"):
        raise ValueError("Invalid signature (bad prefix)")
    # Find the 0x00 separator after the padding
    try:
        separator_idx = em.index(b"\x00", 2)
    except ValueError:
        raise ValueError("Invalid signature (no separator)")
    padding_bytes = em[2:separator_idx]
    if not all(b == 0xFF for b in padding_bytes):
        raise ValueError("Invalid signature (bad padding)")
    actual_suffix = em[separator_idx + 1:]
    if actual_suffix != expected_suffix:
        raise ValueError("Invalid signature (digest mismatch)")

    payload = json.loads(_b64url_decode(payload_b64))
    return payload


# ---------------------------------------------------------------------------
# JWKS cache
# ---------------------------------------------------------------------------

_jwks_cache: Dict[str, Any] = {}
_jwks_cache_expiry: float = 0.0
_JWKS_CACHE_TTL = 3600  # 1 hour


async def _get_jwks(tenant_id: str) -> Dict[str, Any]:
    """Fetch (and cache) Microsoft's JWKS for *tenant_id*."""
    global _jwks_cache, _jwks_cache_expiry

    now = time.time()
    if _jwks_cache and now < _jwks_cache_expiry:
        return _jwks_cache

    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_expiry = now + _JWKS_CACHE_TTL
        return _jwks_cache


def _find_key(jwks: Dict[str, Any], kid: str) -> Optional[Dict[str, Any]]:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid and key.get("kty") == "RSA":
            return key
    return None


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------


class EntraJWTAuthMiddleware(BaseHTTPMiddleware):
    """Validate Entra ID JWT bearer tokens (mandatory)."""

    def __init__(self, app: Any) -> None:
        super().__init__(app)
        self.tenant_id = os.getenv("AZURE_AD_TENANT_ID", "")
        self.client_id = os.getenv("AZURE_AD_CLIENT_ID", "")
        # Auth can be explicitly disabled for local development
        self._disabled = os.getenv("DISABLE_AUTH", "").lower() in ("true", "1", "yes")
        if self._disabled:
            logger.warning(
                "Entra ID JWT auth middleware DISABLED via DISABLE_AUTH env var"
            )
        elif not (self.tenant_id and self.client_id):
            raise RuntimeError(
                "Entra ID auth is required but AZURE_AD_TENANT_ID and/or "
                "AZURE_AD_CLIENT_ID are not set. Set both env vars or set "
                "DISABLE_AUTH=true for local development."
            )
        else:
            logger.info(
                "Entra ID JWT auth middleware enabled (tenant=%s)", self.tenant_id
            )

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        if self._disabled:
            return await call_next(request)

        # Allow pre-flight CORS and health-check endpoints through
        if request.method == "OPTIONS":
            return await call_next(request)

        # Allow health endpoint without auth
        if request.url.path == "/health":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401, content={"detail": "Missing or invalid Authorization header"}
            )

        token = auth_header[len("Bearer "):]

        try:
            # Decode header to get kid
            header_b64 = token.split(".")[0]
            header = json.loads(_b64url_decode(header_b64))
            kid = header.get("kid")
            if not kid:
                raise ValueError("JWT header missing 'kid'")

            jwks = await _get_jwks(self.tenant_id)
            key_data = _find_key(jwks, kid)
            if not key_data:
                # Force-refresh JWKS in case keys rotated
                global _jwks_cache_expiry
                _jwks_cache_expiry = 0
                jwks = await _get_jwks(self.tenant_id)
                key_data = _find_key(jwks, kid)
                if not key_data:
                    raise ValueError(f"No matching key found for kid={kid}")

            n = _int_from_b64url(key_data["n"])
            e = _int_from_b64url(key_data["e"])

            payload = _verify_rs256(token, n, e)

            # Validate standard claims (±5-min clock skew tolerance)
            now = time.time()
            if payload.get("exp", 0) < now - 300:
                raise ValueError("Token has expired")
            if payload.get("nbf", 0) > now + 300:
                raise ValueError("Token not yet valid")

            # Validate issuer
            valid_issuers = {
                f"https://login.microsoftonline.com/{self.tenant_id}/v2.0",
                f"https://sts.windows.net/{self.tenant_id}/",
            }
            if payload.get("iss", "") not in valid_issuers:
                raise ValueError(f"Invalid issuer: {payload.get('iss')}")

            # NOTE: audience (aud) is intentionally NOT validated here.
            # With OIDC-only scopes the access token's audience is
            # Microsoft Graph (https://graph.microsoft.com), not our
            # application's client ID.  Tenant-level isolation is ensured
            # by the issuer check above and the signature verification.

            # Attach user info to request state for downstream handlers
            request.state.user = {
                "sub": payload.get("sub"),
                "name": payload.get("name"),
                "email": payload.get("preferred_username"),
                "oid": payload.get("oid"),
            }

        except Exception as exc:
            logger.warning("JWT validation failed: %s", exc)
            return JSONResponse(
                status_code=401, content={"detail": f"Authentication failed: {exc}"}
            )

        return await call_next(request)
