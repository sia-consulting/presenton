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
 * Build the login/token request with an application-specific scope.
 *
 * We request `api://{clientId}/.default` so that MSAL issues an access
 * token whose audience (`aud`) is our own application — not Microsoft
 * Graph.  This access token is a standard RS256 JWT that the backend
 * can verify against the tenant's JWKS endpoint.
 *
 * MSAL automatically appends the OIDC scopes (`openid`, `profile`,
 * `offline_access`) so the login flow still returns an ID token and
 * refresh token alongside the access token.
 *
 * **Pre-requisite:** The Entra ID app registration must have an
 * Application ID URI configured (typically `api://{clientId}`).
 */
export function getLoginRequest(): { scopes: string[] } {
  const clientId = getStoredClientId();
  return { scopes: [`api://${clientId}/.default`] };
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
