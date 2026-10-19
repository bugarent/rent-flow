"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";

type AppRouter = ReturnType<typeof useRouter>;

/**
 * `kind: "full"` makes router.prefetch load the page with its server data, like
 * <Link prefetch>. Plain router.prefetch stops at the route's loading.tsx.
 */
const FULL_PREFETCH = "full" as PrefetchKind;
const REPEAT_AFTER_MS = 30_000;
const recent = new Map<string, number>();

/** Prefetch a route and its data; repeats for the same URL within 30 s are skipped. */
export function prefetchFullRoute(router: AppRouter, href: string) {
  if (!href) return;
  const now = Date.now();
  if ((recent.get(href) ?? 0) > now - REPEAT_AFTER_MS) return;
  recent.set(href, now);
  try {
    router.prefetch(href, { kind: FULL_PREFETCH });
  } catch {
    recent.delete(href);
  }
}

/** Hover / focus / touch handlers that prefetch `href` (and run `alsoWarm`) before the click. */
export function useIntentPrefetch() {
  const router = useRouter();
  return useCallback(
    (href: string, alsoWarm?: () => void) => {
      const warm = () => {
        prefetchFullRoute(router, href);
        alsoWarm?.();
      };
      return { onPointerEnter: warm, onFocus: warm, onTouchStart: warm };
    },
    [router],
  );
}
