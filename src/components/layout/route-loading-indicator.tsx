"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams, type useRouter } from "next/navigation";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";

const SHOW_DELAY_MS = 120;
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

/**
 * `useRouter()` copies `push`/`replace` from the shared app router instance when each component
 * first renders, so the wrap must happen at module load, before any page component renders.
 */
function announceRouterNavigations() {
  const router = (window as { next?: { router?: PatchableRouter } }).next?.router;
  if (!router || router[PATCHED]) return;
  const onStart = (href: unknown) => {
    if (leadsToOtherPage(String(href))) window.dispatchEvent(new Event(START_EVENT));
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

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const startRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const clearTimers = () => {
      if (showTimer.current) window.clearTimeout(showTimer.current);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      showTimer.current = null;
      hideTimer.current = null;
    };
    stopRef.current = () => {
      clearTimers();
      setVisible(false);
    };
    startRef.current = () => {
      clearTimers();
      showTimer.current = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      hideTimer.current = window.setTimeout(() => stopRef.current(), MAX_VISIBLE_MS);
    };
    return clearTimers;
  }, []);

  useEffect(() => {
    stopRef.current();
  }, [pathname, searchParams]);

  useEffect(() => {
    announceRouterNavigations();
    const onStart = () => startRef.current();
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
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
      startRef.current();
    };
    const onPageShow = () => stopRef.current();

    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPageShow);
    };
  }, []);

  return visible ? <RouteLoadingSpinner /> : null;
}
