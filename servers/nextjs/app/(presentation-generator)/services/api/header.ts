import { getLoginRequest } from "@/lib/auth/msalConfig";
import { getMsalInstance } from "@/lib/auth/MsalProvider";

/**
 * Acquire a Bearer **access token** from the MSAL cache.
 * Falls back to an interactive redirect if the silent acquisition fails.
 *
 * The requested scope is `api://{clientId}/.default` so the access token's
 * `aud` matches the application's own client ID — exactly what the FastAPI
 * backend validates.
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
