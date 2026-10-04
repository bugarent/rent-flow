export type JsonResult<T> = { ok: boolean; status: number; data: T | null; error: string };

/** fetch + JSON with a timeout; never throws, non-JSON error pages become a readable message. */
export async function requestJson<T = Record<string, unknown>>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<JsonResult<T>> {
  const { timeoutMs = 30_000, ...rest } = init;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...rest,
      signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let data: T | null = null;
    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      data = null;
    }
    const body = (data ?? {}) as { error?: unknown; message?: unknown };
    const error = res.ok
      ? ""
      : String(body.message || body.error || `Request failed (HTTP ${res.status})`);
    return { ok: res.ok, status: res.status, data, error };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      status: 0,
      data: null,
      error: timedOut ? "Server did not respond in time — try again." : "Network error — try again.",
    };
  }
}
