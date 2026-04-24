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
  const clientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? "";
  const tenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? "";
  const redirectUri = process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI ?? "/";

  if (!clientId || !tenantId) {
    return NextResponse.json(
      {
        error:
          "Missing required environment variables: NEXT_PUBLIC_AZURE_AD_CLIENT_ID and/or NEXT_PUBLIC_AZURE_AD_TENANT_ID",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { clientId, tenantId, redirectUri },
    {
      headers: {
        "Cache-Control": "public, max-age=86400",
      },
    }
  );
}
