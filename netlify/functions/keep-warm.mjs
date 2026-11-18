/**
 * Wakes the Next.js server and the database every few minutes.
 *
 * After a quiet stretch Netlify puts the site function to sleep and Neon
 * suspends. The next visit then waits through a cold start — about 10 seconds
 * of a blank page — before the homepage, partner login, or admin content
 * appears. These paths are not served from the edge cache, so each run hits
 * the origin. The homepage itself stays instant from the edge (next.config.ts).
 */

const PATHS = ["/api/health", "/partner-portal/login", "/admin505/login"];

export default async () => {
  const base = (process.env.URL || "https://rentairportcars.com").replace(/\/$/, "");
  const results = [];

  for (const path of PATHS) {
    const started = Date.now();
    try {
      const res = await fetch(`${base}${path}`, {
        redirect: "manual",
        cache: "no-store",
        headers: {
          "user-agent": "rac-keep-warm",
          accept: "text/html,application/json",
          "cache-control": "no-cache",
        },
        signal: AbortSignal.timeout(25_000),
      });
      await res.arrayBuffer();
      results.push({ path, status: res.status, ms: Date.now() - started });
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed";
      results.push({ path, error: message, ms: Date.now() - started });
    }
  }

  console.log("[keep-warm]", JSON.stringify(results));
  return new Response("ok");
};

export const config = {
  schedule: "*/4 * * * *",
};
