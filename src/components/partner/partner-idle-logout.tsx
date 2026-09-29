"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  AUTH_BASE_PATHS,
  AUTH_COOKIE_PREFIX,
  AUTH_SIGNOUT_PAGES,
  useSecureAuthCookies,
} from "@/lib/auth/portals";

/** Partner cabinet auto sign-out after this much idle time. */
export const PARTNER_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

function expireCookie(name: string, secure: boolean) {
  const secureFlag = secure ? "; Secure" : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
}

function clearPartnerCookiesClient() {
  const secure = useSecureAuthCookies();
  const prefix = AUTH_COOKIE_PREFIX.partner;
  for (const name of [
    secure ? `__Secure-${prefix}.session-token` : `${prefix}.session-token`,
    secure ? `__Secure-${prefix}.csrf-token` : `${prefix}.csrf-token`,
    secure ? `__Secure-${prefix}.callback-url` : `${prefix}.callback-url`,
  ]) {
    expireCookie(name, secure);
  }
}

/**
 * Signs the partner out after 5 minutes without interaction.
 * Only mounts on authenticated cabinet pages (not login/register).
 */
export function PartnerIdleLogout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOutRef = useRef(false);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const logout = () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearTimer();
      const loginUrl = AUTH_SIGNOUT_PAGES.partner;
      const basePath = AUTH_BASE_PATHS.partner;
      void (async () => {
        try {
          await signOut({ redirect: false, callbackUrl: loginUrl });
        } catch {
          /* ignore */
        }
        try {
          const csrfRes = await fetch(`${basePath}/csrf`);
          const csrfJson = (await csrfRes.json().catch(() => null)) as { csrfToken?: string } | null;
          if (csrfJson?.csrfToken) {
            await fetch(`${basePath}/signout`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                csrfToken: csrfJson.csrfToken,
                callbackUrl: loginUrl,
                json: "true",
              }),
            });
          }
        } catch {
          /* ignore */
        }
        clearPartnerCookiesClient();
        try {
          await fetch("/api/partners/logout", { method: "POST", credentials: "same-origin" });
        } catch {
          /* ignore */
        }
        window.location.assign(loginUrl);
      })();
    };

    const arm = () => {
      clearTimer();
      timerRef.current = setTimeout(logout, PARTNER_IDLE_TIMEOUT_MS);
    };

    arm();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, arm, { passive: true });
    }

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, arm);
      }
    };
  }, []);

  return null;
}
