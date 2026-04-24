"""Managed Identity token provider for Azure PostgreSQL Flexible Server.

When ``DB_USE_MANAGED_IDENTITY`` is ``true``, the application authenticates to
PostgreSQL using an Entra ID OAuth token instead of a static password.

Tokens are cached in-process and refreshed automatically when they approach
expiry (within 5 minutes of ``expires_on``).
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Azure AD token scope for OSS RDBMS (PostgreSQL / MySQL)
_POSTGRES_AAD_SCOPE = "https://ossrdbms-aad.database.windows.net/.default"

# Refresh the token when it has fewer than this many seconds remaining.
_REFRESH_BUFFER_SECONDS = 300  # 5 minutes

# Module-level cache
_cached_token: Optional[str] = None
_cached_expires_on: float = 0.0
_lock = threading.Lock()
_credential = None  # lazily initialised


def is_managed_identity_enabled() -> bool:
    """Return True when the app should use MI token auth for the database."""
    return os.getenv("DB_USE_MANAGED_IDENTITY", "").lower() in ("true", "1", "yes")


def _get_credential():
    """Lazily create and return a ``DefaultAzureCredential`` instance."""
    global _credential
    if _credential is None:
        from azure.identity import DefaultAzureCredential

        client_id = os.getenv("AZURE_MANAGED_IDENTITY_CLIENT_ID", "")
        kwargs = {}
        if client_id:
            kwargs["managed_identity_client_id"] = client_id
        _credential = DefaultAzureCredential(**kwargs)
        logger.info(
            "DefaultAzureCredential initialised%s",
            f" (managed_identity_client_id={client_id})" if client_id else "",
        )
    return _credential


def get_postgres_access_token() -> str:
    """Return a valid Azure AD access token for PostgreSQL.

    The token is cached and only refreshed when it is within 5 minutes of
    expiry.  Thread-safe.
    """
    global _cached_token, _cached_expires_on

    now = time.time()
    if _cached_token and now < (_cached_expires_on - _REFRESH_BUFFER_SECONDS):
        return _cached_token

    with _lock:
        # Double-check after acquiring lock
        now = time.time()
        if _cached_token and now < (_cached_expires_on - _REFRESH_BUFFER_SECONDS):
            return _cached_token

        credential = _get_credential()
        token = credential.get_token(_POSTGRES_AAD_SCOPE)
        _cached_token = token.token
        _cached_expires_on = token.expires_on
        logger.info(
            "Acquired new PostgreSQL access token (expires_on=%.0f, "
            "remaining=%.0fs)",
            _cached_expires_on,
            _cached_expires_on - now,
        )
        return _cached_token
