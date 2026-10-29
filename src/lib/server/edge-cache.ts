import "server-only";

import { after } from "next/server";

/** Tag on public HTML that Netlify keeps at the edge for a minute (see next.config.ts). */
export const PUBLIC_PAGES_CACHE_TAG = "public-pages";

const PURGE_THROTTLE_MS = 10_000;
let lastPurgeAt = 0;

async function purgeNow(tags: string[]) {
  const token = process.env.NETLIFY_PURGE_API_TOKEN;
  const siteId = process.env.SITE_ID;
  if (!token || !siteId) return;
  try {
    const res = await fetch("https://api.netlify.com/api/v1/purge", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: siteId, cache_tags: tags }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn("[edge-cache] purge failed", res.status);
  } catch (error) {
    console.warn("[edge-cache] purge failed", error);
  }
}

/**
 * Drop edge-cached public pages so a save shows on the next visit instead of after the
 * one-minute edge cache. Runs after the response when called inside a request.
 */
export function purgePublicEdgeCache(tags: string[] = [PUBLIC_PAGES_CACHE_TAG]) {
  // Some readers write back missing translations while a page renders; never purge per view.
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_THROTTLE_MS) return;
  lastPurgeAt = now;
  try {
    after(() => purgeNow(tags));
  } catch {
    void purgeNow(tags);
  }
}
