"use client";

import React, { useEffect } from "react";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./msalConfig";

/**
 * Gate component that redirects unauthenticated users to the Entra login page.
 * Renders `children` only when the user is authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress, instance } = useMsal();

  useEffect(() => {
    // Only trigger a redirect if no other interaction is in progress
    if (!isAuthenticated && inProgress === InteractionStatus.None) {
      instance.loginRedirect(loginRequest);
    }
  }, [isAuthenticated, inProgress, instance]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Loading / redirecting state
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <p>Signing in…</p>
    </div>
  );
}
