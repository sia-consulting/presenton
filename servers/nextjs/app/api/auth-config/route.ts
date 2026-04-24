import { NextResponse } from "next/server";

/**
 * GET /api/auth-config
 *
 * Serves Entra ID (Azure AD) authentication configuration to the browser at
 * runtime.  This avoids the need to bake NEXT_PUBLIC_* values into the client
 * bundle at Docker build time, making the image environment-agnostic.
 *
 * The response is cache-friendly — auth config rarely changes during a
 * deployment — so browsers and CDNs can cache it aggressively.
 */
export async function GET() {
  return NextResponse.json(
    {
      clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? "",
      tenantId: process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? "",
      redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI ?? "/",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
