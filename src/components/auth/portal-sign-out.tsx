"use client";

import { useState, type MouseEvent } from "react";
import { signOut } from "next-auth/react";
import {
  AUTH_BASE_PATHS,
  AUTH_SIGNOUT_PAGES,
  type AuthPortal,
} from "@/lib/auth/portals";

const FORCE_LOGOUT_PATH: Partial<Record<AuthPortal, string>> = {
  partner: "/api/partners/logout",
};

export function PortalSignOut({
  className,
  portal,
  label = "Sign out",
}: {
  className?: string;
  portal: AuthPortal;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const onSignOut = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = AUTH_SIGNOUT_PAGES[portal];
    const basePath = AUTH_BASE_PATHS[portal];
    try {
      await signOut({ redirect: false, callbackUrl: next });
    } catch {
      /* continue */
    }
    try {
      const csrfRes = await fetch(`${basePath}/csrf`);
      const csrfJson = (await csrfRes.json().catch(() => null)) as { csrfToken?: string } | null;
      const csrfToken = csrfJson?.csrfToken;
      if (csrfToken) {
        await fetch(`${basePath}/signout`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            csrfToken,
            callbackUrl: next,
            json: "true",
          }),
        });
      }
    } catch {
      /* continue */
    }
    const forcePath = FORCE_LOGOUT_PATH[portal];
    if (forcePath) {
      try {
        await fetch(forcePath, { method: "POST", credentials: "same-origin" });
      } catch {
        /* continue */
      }
    }
    window.location.assign(next);
  };

  return (
    <button type="button" className={className} disabled={busy} onClick={(e) => void onSignOut(e)}>
      {busy ? "…" : label}
    </button>
  );
}
