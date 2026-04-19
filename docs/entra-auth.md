# Entra ID Authentication (Optional)

Presenton supports **opt-in** Microsoft Entra ID (Azure AD) authentication using the **Authorization Code + PKCE** flow. This is a browser-based flow that requires **no client secret** — making it secure and easy to set up for single-page applications.

When enabled, only users in your Entra directory can access Presenton. When the environment variables are not set, the app remains open and unauthenticated (the default open-source experience).

## How It Works

1. User visits Presenton → the `AuthGuard` component detects no session → calls `loginRedirect()`
2. The browser redirects to `login.microsoftonline.com/{tenantId}/...` with a PKCE `code_challenge`
3. User signs in with their Entra account
4. Entra redirects back to Presenton with an authorization code
5. `@azure/msal-browser` exchanges the code for tokens **in the browser** using the PKCE `code_verifier` — no client secret involved
6. The ID token proves the user is in your directory; the access token is sent to the backend for validation

### Why No Client Secret Is Needed

The SPA uses the **Authorization Code + PKCE** flow, which is designed for public clients (browsers) that cannot securely store secrets. PKCE replaces the client secret with a per-request cryptographic challenge/verifier pair. Microsoft explicitly recommends this flow for SPAs.

---

## Setup

### 1. Create an Entra App Registration

1. Go to the [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Enter a name (e.g. `Presenton`)
3. Under **Supported account types**, choose **Accounts in this organizational directory only**
4. Click **Register**

### 2. Configure the SPA Platform

1. In your App Registration, go to **Authentication** → **Platform configurations** → **Add a platform** → **Single-page application**
2. Add redirect URIs:
   - `http://localhost:3000/` (for local development)
   - `https://<your-presenton-domain>/` (for production)
3. **Do NOT** generate a client secret — it is not needed

### 3. Grant API Permissions

1. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**
2. Add `User.Read`
3. Click **Grant admin consent** (if required by your organization)

### 4. Note Your IDs

From the App Registration **Overview** page, copy:
- **Application (client) ID** → `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_ID`
- **Directory (tenant) ID** → `NEXT_PUBLIC_AZURE_AD_TENANT_ID` / `AZURE_AD_TENANT_ID`

### 5. Set Environment Variables

Add these to your `.env` file or Docker Compose environment:

```bash
# Frontend (Next.js) — these are public and safe to expose in the browser
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=<your-client-id>
NEXT_PUBLIC_AZURE_AD_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_AZURE_AD_REDIRECT_URI=http://localhost:3000/  # or your production URL

# Backend (FastAPI) — enables JWT token validation
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-client-id>
```

### 6. Restart Presenton

```bash
docker compose up -d production
```

---

## Environment Variables Reference

| Variable | Component | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` | Next.js | Yes (to enable auth) | App Registration client ID |
| `NEXT_PUBLIC_AZURE_AD_TENANT_ID` | Next.js | Yes (to enable auth) | Entra tenant ID |
| `NEXT_PUBLIC_AZURE_AD_REDIRECT_URI` | Next.js | No (defaults to `/`) | Redirect URI after login |
| `AZURE_AD_TENANT_ID` | FastAPI | Yes (to enable backend validation) | Entra tenant ID |
| `AZURE_AD_CLIENT_ID` | FastAPI | Yes (to enable backend validation) | App Registration client ID |

> **Note:** Authentication is fully opt-in. If none of these variables are set, Presenton works as before with no authentication.

---

## Architecture

### Frontend

- **`lib/auth/msalConfig.ts`** — MSAL configuration (authority, redirect URI, cache)
- **`lib/auth/MsalProvider.tsx`** — Initialises the MSAL instance and handles redirect responses
- **`lib/auth/AuthGuard.tsx`** — Redirects unauthenticated users to the Entra login page
- **`lib/auth/EntraAuthProvider.tsx`** — Conditional wrapper; no-op when env vars are absent
- **`services/api/header.ts`** — Acquires tokens silently and attaches `Authorization: Bearer` header

### Backend

- **`middleware/auth.py`** — `EntraJWTAuthMiddleware` validates JWT bearer tokens by:
  1. Fetching Microsoft's JWKS (cached for 1 hour)
  2. Verifying the RS256 signature
  3. Checking `aud`, `iss`, `exp`, `nbf` claims
  - No-op when `AZURE_AD_TENANT_ID` is unset

---

## Troubleshooting

### "Missing or invalid Authorization header"
- Ensure the frontend env vars are set (`NEXT_PUBLIC_AZURE_AD_CLIENT_ID`, `NEXT_PUBLIC_AZURE_AD_TENANT_ID`)
- Check that the redirect URI in the App Registration matches your app URL exactly

### "Invalid audience" or "Invalid issuer"
- Verify that `AZURE_AD_CLIENT_ID` on the backend matches `NEXT_PUBLIC_AZURE_AD_CLIENT_ID` on the frontend
- Verify that `AZURE_AD_TENANT_ID` matches your Entra directory tenant ID

### Login redirect loop
- Ensure the redirect URI in the Entra App Registration is configured as a **Single-page application** platform (not Web)
- Check browser console for MSAL errors
