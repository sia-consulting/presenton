import { getLoginRequest } from "@/lib/auth/msalConfig";
import { getMsalInstance } from "@/lib/auth/MsalProvider";

/**
 * Acquire a Bearer **access token** from the MSAL cache.
 * Falls back to an interactive redirect if the silent acquisition fails.
 *
 * The backend does not validate the token audience, so the access token
 * (whose `aud` is Microsoft Graph when using OIDC-only scopes) is accepted.
 */
async function getAccessToken(): Promise<string | null> {
  const instance = getMsalInstance();
  const account = instance.getActiveAccount();
  if (!account) return null;

  const request = getLoginRequest();

  try {
    const response = await instance.acquireTokenSilent({
      ...request,
      account,
    });
    return response.accessToken;
  } catch {
    // Token expired / interaction required — trigger a redirect
    await instance.acquireTokenRedirect(request);
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
