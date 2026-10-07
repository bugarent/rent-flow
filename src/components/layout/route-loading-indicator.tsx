"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, type useRouter } from "next/navigation";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";
import { estimateRouteMs, recordRouteMs } from "@/lib/navigation/route-timing-store";

const MIN_VISIBLE_MS = 450;
const MAX_VISIBLE_MS = 15000;
const MIN_COUNTDOWN_MS = 1000;
const PATCHED = Symbol.for("rentairportcars.route-loading");

type PatchableRouter = ReturnType<typeof useRouter> & { [PATCHED]?: boolean };

/** True when `href` would load a different page than the one on screen. */
function leadsToOtherPage(href: string): boolean {
  try {
    const target = new URL(href, window.location.href);
    if (target.origin !== window.location.origin) return false;
    if (!/^https?:$/.test(target.protocol)) return false;
    return (
      target.pathname !== window.location.pathname || target.search !== window.location.search
    );
  } catch {
    return false;
  }
}

const START_EVENT = "route-loading:start";

/**
 * `useRouter()` copies `push`/`replace` from the shared app router instance when each component
 * first renders, so the wrap must happen at module load, before any page component renders.
 */
function announceRouterNavigations() {
  const router = (window as { next?: { router?: PatchableRouter } }).next?.router;
  if (!router || router[PATCHED]) return;
  const onStart = (href: unknown) => {
    if (leadsToOtherPage(String(href))) {
      window.dispatchEvent(new CustomEvent(START_EVENT, { detail: String(href) }));
    }
  };
  const push = router.push.bind(router);
  const replace = router.replace.bind(router);
  try {
    router.push = (href, options) => {
      onStart(href);
      return push(href, options);
    };
    router.replace = (href, options) => {
      onStart(href);
      return replace(href, options);
    };
    router[PATCHED] = true;
  } catch {
    /* read-only router: link clicks still show the spinner */
  }
}

if (typeof window !== "undefined") announceRouterNavigations();

type PendingNavigation = { startedAt: number; estimateMs: number | null };

function secondsLeft(pending: PendingNavigation): number | null {
  if (pending.estimateMs === null || pending.estimateMs < MIN_COUNTDOWN_MS) return null;
  const left = pending.estimateMs - (performance.now() - pending.startedAt);
  return Math.max(0, Math.ceil(left / 1000));
}

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  const visibleSince = useRef<number | null>(null);
  const startRef = useRef<(href: string) => void>(() => {});
  const stopRef = useRef<(arrived: boolean) => void>(() => {});

  useEffect(() => {
    const clearTimers = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (tickTimer.current) window.clearInterval(tickTimer.current);
      hideTimer.current = null;
      tickTimer.current = null;
    };
    const hideNow = () => {
      visibleSince.current = null;
      setVisible(false);
      setSeconds(null);
    };
    stopRef.current = (arrived) => {
      const pending = pendingRef.current;
      const since = visibleSince.current;
      pendingRef.current = null;
      if (arrived && pending) {
        recordRouteMs(window.location.href, performance.now() - pending.startedAt);
      }
      clearTimers();
      if (!pending && since == null) return;
      const wait = since == null ? 0 : Math.max(0, MIN_VISIBLE_MS - (performance.now() - since));
      if (wait === 0) hideNow();
      else hideTimer.current = window.setTimeout(hideNow, wait);
    };
    startRef.current = (href) => {
      clearTimers();
      const pending = { startedAt: performance.now(), estimateMs: estimateRouteMs(href) };
      pendingRef.current = pending;
      visibleSince.current = performance.now();
      setSeconds(secondsLeft(pending));
      setVisible(true);
      if (pending.estimateMs !== null && pending.estimateMs >= MIN_COUNTDOWN_MS) {
        tickTimer.current = window.setInterval(() => setSeconds(secondsLeft(pending)), 200);
      }
      hideTimer.current = window.setTimeout(() => stopRef.current(false), MAX_VISIBLE_MS);
    };
    return clearTimers;
  }, []);

  useEffect(() => {
    stopRef.current(true);
  }, [pathname, searchParams]);

  useEffect(() => {
    announceRouterNavigations();
    const onStart = (event: Event) => startRef.current(String((event as CustomEvent).detail ?? ""));
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      announceRouterNavigations();
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.closest("[data-no-route-spinner]")) return;
      if (anchor.hasAttribute("download")) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      if (!leadsToOtherPage(anchor.href)) return;
      startRef.current(anchor.href);
    };
    const onPageShow = () => stopRef.current(false);

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPageShow);
    };
  }, []);

  return visible ? <RouteLoadingSpinner seconds={seconds} /> : null;
}
