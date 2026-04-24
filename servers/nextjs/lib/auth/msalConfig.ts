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
 * Build the login/token request with the correct scope for the backend API.
 *
 * The scope `api://{clientId}/.default` requests an access token whose
 * `aud` matches the application's own client ID — exactly what the FastAPI
 * backend expects.  We do **not** request `User.Read` because we never call
 * Microsoft Graph.
 *
 * Must be called **after** the MSAL provider has initialised (i.e. after
 * the auth config has been fetched from `/api/auth-config`).
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
