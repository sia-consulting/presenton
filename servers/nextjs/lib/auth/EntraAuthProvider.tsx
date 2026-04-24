"use client";

import React from "react";
import { MsalProvider } from "@/lib/auth/MsalProvider";
import { AuthGuard } from "@/lib/auth/AuthGuard";

/**
 * Wraps children with MSAL auth.
 * Entra ID authentication is mandatory for this fork.
 */
export function EntraAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider>
      <AuthGuard>{children}</AuthGuard>
    </MsalProvider>
  );
}
