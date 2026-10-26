"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, type useRouter } from "next/navigation";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";
import { recordRouteMs } from "@/lib/navigation/route-timing-store";

const MIN_VISIBLE_MS = 800;
const MAX_VISIBLE_MS = 15000;
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

function routeKeyFromHref(href: string): string {
  const url = new URL(href, window.location.href);
  return `${url.pathname}?${url.search.replace(/^\?/, "")}`;
}

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
  const back = router.back?.bind(router);
  const forward = router.forward?.bind(router);
  try {
    router.push = (href, options) => {
      onStart(href);
      return push(href, options);
    };
    router.replace = (href, options) => {
      onStart(href);
      return replace(href, options);
    };
    if (back) {
      router.back = () => {
        window.dispatchEvent(new CustomEvent(START_EVENT));
        return back();
      };
    }
    if (forward) {
      router.forward = () => {
        window.dispatchEvent(new CustomEvent(START_EVENT));
        return forward();
      };
    }
    router[PATCHED] = true;
  } catch {
    /* read-only router: link clicks still show the spinner */
  }
}

if (typeof window !== "undefined") announceRouterNavigations();

type PendingNavigation = { startedAt: number };

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  const routeKeyRef = useRef("");
  const visibleSince = useRef<number | null>(null);
  const startRef = useRef<(href?: string) => void>(() => {});
  const stopRef = useRef<(arrived: boolean) => void>(() => {});

  useEffect(() => {
    const clearTimers = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    };
    const hideNow = () => {
      visibleSince.current = null;
      setVisible(false);
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
      if (href) {
        try {
          routeKeyRef.current = routeKeyFromHref(href);
        } catch {
          /* keep the last committed route */
        }
      }
      clearTimers();
      pendingRef.current = { startedAt: performance.now() };
      visibleSince.current = performance.now();
      setVisible(true);
      hideTimer.current = window.setTimeout(() => stopRef.current(false), MAX_VISIBLE_MS);
    };
    return clearTimers;
  }, []);

  useEffect(() => {
    routeKeyRef.current = `${pathname}?${searchParams.toString()}`;
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
    const onPopState = () => {
      const next = routeKeyFromHref(window.location.href);
      if (next === routeKeyRef.current) return;
      startRef.current(window.location.href);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      startRef.current();
      window.setTimeout(() => stopRef.current(true), 0);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);

  return visible ? <RouteLoadingSpinner /> : null;
}
