"use client";

import React from "react";
import { isEntraAuthEnabled } from "@/lib/auth/msalConfig";
import { MsalProvider } from "@/lib/auth/MsalProvider";
import { AuthGuard } from "@/lib/auth/AuthGuard";

/**
 * Conditionally wraps children with MSAL auth when Entra ID env vars are set.
 * When env vars are absent the component is a transparent pass-through,
 * preserving the open-source / local-dev experience.
 */
export function EntraAuthProvider({ children }: { children: React.ReactNode }) {
  if (!isEntraAuthEnabled) {
    return <>{children}</>;
  }

  return (
    <MsalProvider>
      <AuthGuard>{children}</AuthGuard>
    </MsalProvider>
  );
}
