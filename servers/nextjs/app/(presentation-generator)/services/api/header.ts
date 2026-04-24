import { loginRequest } from "@/lib/auth/msalConfig";
import { getMsalInstance } from "@/lib/auth/MsalProvider";

/**
 * Acquire a Bearer token from the MSAL cache.
 * Falls back to an interactive redirect if the silent acquisition fails.
 *
 * We use the **ID token** (not the access token) because the login scopes
 * target Microsoft Graph (`User.Read`), so the *access* token's audience is
 * `https://graph.microsoft.com` — which the backend rightfully rejects.
 * The ID token's audience is always the application's own `clientId`, which
 * the backend accepts.
 */
async function getAccessToken(): Promise<string | null> {
  const instance = getMsalInstance();
  const account = instance.getActiveAccount();
  if (!account) return null;

  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.idToken;
  } catch {
    // Token expired / interaction required — trigger a redirect
    await instance.acquireTokenRedirect(loginRequest);
    return null;
  }
}

export const getHeader = async () => {
  const token = await getAccessToken();
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
  const token = await getAccessToken();
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
