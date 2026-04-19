import { Configuration, BrowserCacheLocation } from "@azure/msal-browser";

const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? "";
const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? "";
const redirectUri = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI ?? "/";

/**
 * Whether Entra ID authentication is enabled.
 * Auth is enabled only when both client ID and tenant ID are set.
 */
export const isEntraAuthEnabled = Boolean(clientId && tenantId);

/**
 * MSAL configuration for the Entra ID SPA (PKCE) flow.
 * No client secret is required — PKCE handles the proof-of-possession.
 */
export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
  },
};

/**
 * Scopes requested when acquiring tokens.
 * `User.Read` is needed to read the signed-in user's profile via MS Graph.
 */
export const loginRequest = {
  scopes: ["User.Read"],
};
