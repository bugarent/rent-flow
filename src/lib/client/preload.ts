"use client";

import { useEffect } from "react";

type Loader = () => Promise<unknown>;

const started = new Set<Loader>();

/** Start downloading a lazily loaded module once; a failed download may be retried later. */
export function preload(load: Loader) {
  if (started.has(load)) return;
  started.add(load);
  void load().catch(() => started.delete(load));
}

/** Pointer, touch and focus handlers that warm a modal's code before the click lands. */
export function preloadProps(load: Loader) {
  const warm = () => preload(load);
  return { onPointerEnter: warm, onTouchStart: warm, onFocus: warm };
}

/** Download modal code once the page is idle, after the first render has finished. */
export function usePreloadWhenIdle(...loads: Loader[]) {
  useEffect(() => {
    const run = () => loads.forEach(preload);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 3000);
    return () => window.clearTimeout(timer);
    // Loaders are module-level constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
