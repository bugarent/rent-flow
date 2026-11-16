"use client";

import { useSyncExternalStore } from "react";

/** Country picked in the homepage search — category links reuse it to scope `/cars`. */
let current = "";
const listeners = new Set<() => void>();

/** Category chosen on the homepage slider — applied when the user runs Search. */
let pendingCategorySlug = "";
let pendingCategoryName = "";
const categoryListeners = new Set<() => void>();

export function setHomeCountry(iso2: string) {
  const next = String(iso2 || "").trim().toUpperCase();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/** Logo click on the homepage: reset the cover search without waiting for a reload. */
export const HOME_RESET_EVENT = "rac-home-reset";
/** Category card: scroll to search and ask the user to finish country / place / dates. */
export const HOME_CATEGORY_FOCUS_EVENT = "rac-home-category-focus";

export function requestHomeReset() {
  setHomeCountry("");
  clearPendingHomeCategory();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(HOME_RESET_EVENT));
}

export function peekPendingHomeCategory(): { slug: string; name: string } {
  return { slug: pendingCategorySlug, name: pendingCategoryName };
}

export function clearPendingHomeCategory() {
  if (!pendingCategorySlug && !pendingCategoryName) return;
  pendingCategorySlug = "";
  pendingCategoryName = "";
  for (const listener of categoryListeners) listener();
}

/** Homepage category card: remember the category, scroll to search, pulse the form. */
export function requestHomeCategorySearch(slug: string, name = "") {
  pendingCategorySlug = String(slug || "").trim();
  pendingCategoryName = String(name || "").trim();
  for (const listener of categoryListeners) listener();
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HOME_CATEGORY_FOCUS_EVENT, {
      detail: { slug: pendingCategorySlug, name: pendingCategoryName },
    }),
  );
}

function subscribeCategory(listener: () => void) {
  categoryListeners.add(listener);
  return () => categoryListeners.delete(listener);
}

export function usePendingHomeCategorySlug(): string {
  return useSyncExternalStore(subscribeCategory, () => pendingCategorySlug, () => "");
}

export function usePendingHomeCategoryName(): string {
  return useSyncExternalStore(subscribeCategory, () => pendingCategoryName, () => "");
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
