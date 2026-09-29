/** Latin letters and digits only — no spaces, hyphens, or other symbols. */
const PLATE_ALLOWED = /[^A-Za-z0-9]/g;

export function sanitizeRegistrationInput(raw: string): string {
  return String(raw ?? "")
    .replace(PLATE_ALLOWED, "")
    .toUpperCase()
    .slice(0, 20);
}

/** Canonical form for storage and uniqueness checks. */
export function normalizeRegistrationNumber(raw: string): string {
  return sanitizeRegistrationInput(raw).trim();
}

export function isValidRegistrationNumber(raw: string): boolean {
  const n = normalizeRegistrationNumber(raw);
  return n.length >= 4 && /[A-Z]/.test(n) && /[0-9]/.test(n);
}

/**
 * Display form: uppercase Latin + hyphen between letter↔digit runs.
 * Example: JJ5855JJ → JJ-5855-JJ
 */
export function formatRegistrationNumberDisplay(raw: string | null | undefined): string {
  const n = normalizeRegistrationNumber(String(raw ?? ""));
  if (!n) return "";
  let out = n[0];
  for (let i = 1; i < n.length; i += 1) {
    const prev = n[i - 1];
    const cur = n[i];
    const prevDigit = /\d/.test(prev);
    const curDigit = /\d/.test(cur);
    if (prevDigit !== curDigit) out += "-";
    out += cur;
  }
  return out;
}

/** Statuses that block re-using the same plate. */
export const PLATE_BLOCKING_STATUSES = ["APPROVED", "PENDING", "PENDING_REMODERATION"] as const;
