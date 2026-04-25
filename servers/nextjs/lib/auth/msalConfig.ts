import { Configuration, BrowserCacheLocation } from "@azure/msal-browser";

/** Shape returned by the /api/auth-config server route. */
export interface AuthConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

/**
 * Entra ID authentication is mandatory for this fork.
 * This constant is kept for backward compatibility but is always true.
 */
export const isEntraAuthEnabled = true;

/**
 * Build an MSAL {@link Configuration} from values fetched at runtime.
 *
 * The auth config is served by `GET /api/auth-config` so that the Docker
 * image does not need build-time `NEXT_PUBLIC_*` args — the same image works
 * in any environment.
 */
export function createMsalConfig(cfg: AuthConfig): Configuration {
  return {
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: cfg.redirectUri,
      postLogoutRedirectUri: cfg.redirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  };
}

/**
 * Build the login/token request with standard OIDC scopes.
 *
 * We request only OIDC scopes (`openid`, `email`, `profile`,
 * `offline_access`) instead of a resource-specific scope like
 * `{clientId}/.default`.  This avoids AADSTS errors caused by an
 * application requesting an access token for itself.
 *
 * The frontend sends the **ID token** (not the access token) to the
 * backend.  The ID token is a standard RS256 JWT with `aud` = our
 * client ID, verifiable against the tenant JWKS.  The access token
 * from OIDC-only scopes targets Microsoft Graph and uses a non-standard
 * nonce-based signature that our backend cannot verify.
 */
export function getLoginRequest(): { scopes: string[] } {
  return { scopes: ["openid", "email", "profile", "offline_access"] };
}

// ---------------------------------------------------------------------------
// Runtime clientId storage (set by MsalProvider after fetching auth config)
// ---------------------------------------------------------------------------

let _storedClientId: string | null = null;

export function setStoredClientId(id: string): void {
  _storedClientId = id;
}

export function getStoredClientId(): string {
  if (!_storedClientId) {
    throw new Error(
      "Client ID has not been set yet. " +
        "Ensure the auth config has been fetched and setStoredClientId() has been called.",
    );
  }
  return _storedClientId;
}
