"use client";

import React from "react";
import { useMsal } from "@azure/msal-react";

/**
 * Displays the authenticated user's name and a logout button.
 * Designed to be placed in the app header/navbar.
 */
export function UserProfile() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  if (!account) return null;

  const initials = (account.name || account.username || "?")
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <div
        className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-semibold"
        title={account.name || account.username}
      >
        {initials}
      </div>
      <span className="text-[11px] text-gray-700 text-center w-full truncate">
        {account.name || account.username}
      </span>
      <button
        onClick={handleLogout}
        className="text-[11px] text-gray-500 hover:text-gray-700 underline"
      >
        Logout
      </button>
    </div>
  );
}
