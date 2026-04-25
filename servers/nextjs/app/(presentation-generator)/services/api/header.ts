import { getLoginRequest } from "@/lib/auth/msalConfig";
import { getMsalInstance } from "@/lib/auth/MsalProvider";

/**
 * Acquire a Bearer **ID token** from the MSAL cache.
 * Falls back to an interactive redirect if the silent acquisition fails.
 *
 * We use the ID token (not the access token) because the requested scopes
 * are standard OIDC scopes (`openid`, `email`, `profile`, `offline_access`)
 * — the resulting access token's `aud` is Microsoft Graph, not our app.
 * The ID token's `aud` *is* the application's client ID, which is what the
 * FastAPI backend validates.
 */
async function getIdToken(): Promise<string | null> {
  const instance = getMsalInstance();
  const account = instance.getActiveAccount();
  if (!account) return null;

  const request = getLoginRequest();

  try {
    const response = await instance.acquireTokenSilent({
      ...request,
      account,
    });
    return response.idToken;
  } catch {
    // Token expired / interaction required — trigger a redirect
    await instance.acquireTokenRedirect(request);
    return null;
  }
}

export const getHeader = async () => {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const getHeaderForFormData = async () => {
  const token = await getIdToken();
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
