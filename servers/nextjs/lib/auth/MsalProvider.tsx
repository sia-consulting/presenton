"use client";

import React, { useEffect, useState } from "react";
import {
  PublicClientApplication,
  EventType,
  EventMessage,
  AuthenticationResult,
} from "@azure/msal-browser";
import { MsalProvider as MsalReactProvider } from "@azure/msal-react";
import { msalConfig } from "./msalConfig";

/**
 * Singleton MSAL instance — created once and shared across the app.
 */
const msalInstance = new PublicClientApplication(msalConfig);

export { msalInstance };

/**
 * Wrapper around `@azure/msal-react` `MsalProvider` that initialises the
 * MSAL instance and sets the active account from redirect responses.
 */
export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
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
          msalInstance.setActiveAccount(payload.account);
        }
      });

      setIsInitialized(true);
    };

    init();
  }, []);

  if (!isInitialized) {
    return null; // AuthGuard will show its own loading state
  }

  return (
    <MsalReactProvider instance={msalInstance}>{children}</MsalReactProvider>
  );
}
