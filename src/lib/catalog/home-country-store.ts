"use client";

import { useSyncExternalStore } from "react";

/** Country picked in the homepage search — category links reuse it to scope `/cars`. */
let current = "";
const listeners = new Set<() => void>();

export function setHomeCountry(iso2: string) {
  const next = String(iso2 || "").trim().toUpperCase();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHomeCountry(): string {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => "",
  );
}
