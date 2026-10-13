"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  AUTH_BASE_PATHS,
  AUTH_COOKIE_PREFIX,
  AUTH_SIGNOUT_PAGES,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/portals";

/** Partner cabinet auto sign-out after this much idle time. */
export const PARTNER_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

/** Shared by every open cabinet tab, so work in one tab keeps the others signed in. */
const LAST_ACTIVITY_KEY = "rac.partner.lastActivityAt";
const CHECK_EVERY_MS = 15_000;
const WRITE_EVERY_MS = 5_000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "input",
  "wheel",
] as const;

function readLastActivity(fallback: number): number {
  try {
    const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.max(stored, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function writeLastActivity(at: number) {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
  } catch {
    /* private mode: this tab's own time is still used */
  }
}

function expireCookie(name: string, secure: boolean) {
  const secureFlag = secure ? "; Secure" : "";
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secureFlag}`;
}

function clearPartnerCookiesClient() {
  const secure = shouldUseSecureAuthCookies();
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
 * Signs the partner out after 10 minutes without interaction in any cabinet tab.
 * Elapsed time is measured from the last activity, so a sleeping laptop or a
 * background tab (where timers are delayed) is signed out as soon as it wakes.
 * Only mounts on authenticated cabinet pages (not login/register).
 */
export function PartnerIdleLogout() {
  const signingOutRef = useRef(false);

  useEffect(() => {
    let localLastActivity = Date.now();
    let lastWrite = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const logout = () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      if (interval) clearInterval(interval);
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

    const markActive = () => {
      const now = Date.now();
      localLastActivity = now;
      if (now - lastWrite >= WRITE_EVERY_MS) {
        lastWrite = now;
        writeLastActivity(now);
      }
    };

    const checkIdle = () => {
      if (signingOutRef.current) return;
      const last = readLastActivity(localLastActivity);
      if (Date.now() - last >= PARTNER_IDLE_TIMEOUT_MS) logout();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") checkIdle();
    };

    markActive();
    interval = setInterval(checkIdle, CHECK_EVERY_MS);
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkIdle);

    return () => {
      if (interval) clearInterval(interval);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkIdle);
    };
  }, []);

  return null;
}
