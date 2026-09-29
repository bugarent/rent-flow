const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a stored extra title is a technical id, not a service name. */
export function isOpaqueServiceLabel(value: string, id = ""): boolean {
  const raw = String(value || "").trim();
  if (!raw) return true;
  const rawId = String(id || "").trim();
  if (rawId && raw === rawId) return true;
  if (/^file-[a-z0-9-]+$/i.test(raw)) return true;
  if (UUID_RE.test(raw)) return true;
  if (/^[0-9a-f-]{20,}$/i.test(raw)) return true;
  return false;
}

/** First candidate that is a real service name. */
export function pickServiceLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const raw = String(candidate || "").trim();
    if (!raw || isOpaqueServiceLabel(raw)) continue;
    return raw;
  }
  return "";
}
