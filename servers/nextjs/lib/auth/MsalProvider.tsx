"use client";

import React, { useEffect, useState } from "react";
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider as MsalReactProvider } from "@azure/msal-react";
import { createMsalConfig, AuthConfig, setStoredClientId } from "./msalConfig";

/**
 * Module-level MSAL instance.  Created lazily after the auth config is
 * fetched from `/api/auth-config` so the Docker image doesn't need
 * build-time `NEXT_PUBLIC_*` args.
 */
let msalInstance: PublicClientApplication | null = null;

/** Safe accessor for other modules (e.g. header.ts). */
export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    throw new Error(
      "MSAL has not been initialised yet. " +
        "getMsalInstance() must only be called after MsalProvider has mounted.",
    );
  }
  return msalInstance;
}

/**
 * Wrapper around `@azure/msal-react` `MsalProvider` that fetches the auth
 * configuration from the server at runtime, then initialises the MSAL
 * instance and sets the active account from redirect responses.
 */
export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1. Fetch auth config from the server (runtime, not build-time)
      const res = await fetch("/api/auth-config");
      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `Failed to load auth config (HTTP ${res.status}): ${body}`,
        );
      }
      const cfg: AuthConfig = await res.json();

      // 2. Store clientId so getLoginRequest() can build scopes at runtime
      setStoredClientId(cfg.clientId);

      // 3. Create the MSAL instance with the dynamic config
      const config = createMsalConfig(cfg);
      msalInstance = new PublicClientApplication(config);

      await msalInstance.initialize();

      // Handle redirect response (after Entra login page redirects back)
      const response = await msalInstance.handleRedirectPromise();
      if (response) {
        msalInstance.setActiveAccount(response.account);
      }

      // If there is no active account, pick the first one (e.g. from cache)
      if (
        !msalInstance.getActiveAccount() &&
        msalInstance.getAllAccounts().length > 0
      ) {
        msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
      }

      // Keep the active account in sync on future logins
      msalInstance.addEventCallback((event: EventMessage) => {
        if (
          event.eventType === EventType.LOGIN_SUCCESS &&
          event.payload
        ) {
          const payload = event.payload as AuthenticationResult;
          msalInstance!.setActiveAccount(payload.account);
        }
      });

      setIsInitialized(true);
    };

    init().catch((err) => {
      console.error("MSAL initialisation failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontFamily: "sans-serif",
          color: "#c00",
        }}
      >
        <p>Authentication configuration error: {error}</p>
      </div>
    );
  }

  if (!isInitialized || !msalInstance) {
    return null; // AuthGuard will show its own loading state
  }

  return (
    <MsalReactProvider instance={msalInstance}>{children}</MsalReactProvider>
  );
}
