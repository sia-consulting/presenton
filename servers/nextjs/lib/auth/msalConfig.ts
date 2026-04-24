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
 * Scopes requested when acquiring tokens.
 * `User.Read` is needed to read the signed-in user's profile via MS Graph.
 */
export const loginRequest = {
  scopes: ["User.Read"],
};
