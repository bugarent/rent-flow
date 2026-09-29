/** Business (affiliate) partner referral codes — distinct from fleet Partner PRT-* codes. */

export const BP_REF_COOKIE = "rac_bp_ref";
/** Epoch-ms when the referral cookie was set (QR / ?bp= landing). */
export const BP_REF_AT_COOKIE = "rac_bp_ref_at";
export const BP_REF_QUERY = "bp";
/** Promo from partner link / QR is valid for 7 minutes only. */
export const BP_REF_COOKIE_MAX_AGE_SEC = 7 * 60;
/** Tab-scoped flag: only set when this tab opened a ?bp= / QR link. */
export const BP_REF_SESSION_KEY = "rac_bp_ref_session";

const CODE_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,31}$/;

export function normalizeReferralCode(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isValidReferralCode(code: string): boolean {
  if (!code) return false;
  return CODE_RE.test(code) && code.length >= 2 && code.length <= 32;
}

/** Auto-generate an 8-char code like BPQXX8AH (Latin letters + digits). */
export function generateReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return `BP${body}`;
}

export function buildReferralLandingPath(code: string): string {
  const normalized = normalizeReferralCode(code);
  return `/?${BP_REF_QUERY}=${encodeURIComponent(normalized)}`;
}

export function buildReferralAbsoluteUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildReferralLandingPath(code)}`;
}

/** Deep link with optional airport IATA (homepage opens with partner attribution). */
export function buildReferralDeepUrl(
  origin: string,
  code: string,
  opts?: { airportIata?: string },
): string {
  const base = origin.replace(/\/$/, "");
  const normalized = normalizeReferralCode(code);
  const params = new URLSearchParams();
  params.set(BP_REF_QUERY, normalized);
  const iata = String(opts?.airportIata || "")
    .trim()
    .toUpperCase();
  if (iata) params.set("airport", iata);
  return `${base}/?${params.toString()}`;
}

/** HTML snippet partners can paste on their site (iframe + tracked link). */
export function buildReferralEmbedHtml(origin: string, code: string): string {
  const url = buildReferralAbsoluteUrl(origin, code);
  const safe = url.replace(/"/g, "&quot;");
  return [
    `<!-- RentAirportCars partner widget · code ${normalizeReferralCode(code)} -->`,
    `<div style="max-width:960px;margin:0 auto">`,
    `  <a href="${safe}" target="_blank" rel="noopener noreferrer"`,
    `     style="display:inline-block;margin-bottom:12px;font:600 14px/1.4 system-ui,sans-serif;color:#1d6fe8">`,
    `    Book airport car rental`,
    `  </a>`,
    `  <iframe src="${safe}" title="RentAirportCars"`,
    `    style="width:100%;min-height:720px;border:1px solid #dbe3ef;border-radius:12px"`,
    `    loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`,
    `</div>`,
  ].join("\n");
}

/** Lightweight JS loader that injects the partner iframe. */
export function buildReferralEmbedScript(origin: string, code: string): string {
  const url = buildReferralAbsoluteUrl(origin, code);
  return [
    `(function(){`,
    `  var s=document.currentScript;`,
    `  var d=document.createElement('div');`,
    `  d.innerHTML=${JSON.stringify(
      `<iframe src="${url}" title="RentAirportCars" style="width:100%;min-height:720px;border:1px solid #dbe3ef;border-radius:12px" loading="lazy"></iframe>`,
    )};`,
    `  if(s&&s.parentNode)s.parentNode.insertBefore(d,s.nextSibling);`,
    `})();`,
  ].join("");
}

function readRawCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function writeClientCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0, maxAgeSec)}; SameSite=Lax${secure}`;
}

type ReferralSession = { code: string; at: number };

function readReferralSession(): ReferralSession | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BP_REF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReferralSession>;
    const code = normalizeReferralCode(String(parsed.code || ""));
    const at = Number(parsed.at);
    if (!code || !Number.isFinite(at) || at <= 0) {
      sessionStorage.removeItem(BP_REF_SESSION_KEY);
      return null;
    }
    if (Date.now() - at > BP_REF_COOKIE_MAX_AGE_SEC * 1000) {
      sessionStorage.removeItem(BP_REF_SESSION_KEY);
      return null;
    }
    return { code, at };
  } catch {
    try {
      sessionStorage.removeItem(BP_REF_SESSION_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeReferralSession(code: string, at: number) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(BP_REF_SESSION_KEY, JSON.stringify({ code, at }));
  } catch {
    /* ignore quota */
  }
}

function clearReferralSession() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(BP_REF_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Called only when the guest opens a partner link / QR (`?bp=`).
 * Sets cookie (server attribution) + tab session (checkout auto-fill).
 */
export function setBusinessPartnerReferralCookieClient(codeRaw: string): string {
  const code = normalizeReferralCode(codeRaw);
  if (!code) return "";
  const now = Date.now();
  writeClientCookie(BP_REF_COOKIE, code, BP_REF_COOKIE_MAX_AGE_SEC);
  writeClientCookie(BP_REF_AT_COOKIE, String(now), BP_REF_COOKIE_MAX_AGE_SEC);
  writeReferralSession(code, now);
  return code;
}

/** Clear partner-link / QR referral cookies and this tab's auto-fill session. */
export function clearBusinessPartnerReferralCookieClient() {
  writeClientCookie(BP_REF_COOKIE, "", 0);
  writeClientCookie(BP_REF_AT_COOKIE, "", 0);
  clearReferralSession();
}

/**
 * Drop leftover cookies when this tab never opened a ?bp= / QR link.
 * Prevents checkout auto-fill from a previous visit's cookie.
 */
export function discardOrphanBusinessPartnerReferralCookieClient() {
  if (readReferralSession()) return;
  writeClientCookie(BP_REF_COOKIE, "", 0);
  writeClientCookie(BP_REF_AT_COOKIE, "", 0);
}

/**
 * Remaining ms until the QR/link referral expires (0 if missing/expired).
 * Based on this tab's session (set only via ?bp=), not a bare cookie.
 */
export function getBusinessPartnerReferralRemainingMsClient(): number {
  const session = readReferralSession();
  if (!session) return 0;
  const remaining = session.at + BP_REF_COOKIE_MAX_AGE_SEC * 1000 - Date.now();
  if (remaining <= 0) {
    clearBusinessPartnerReferralCookieClient();
    return 0;
  }
  return remaining;
}

/**
 * Code for checkout auto-fill — ONLY if this tab entered via partner link / QR.
 * Never returns a code from a leftover cookie alone.
 */
export function readBusinessPartnerReferralCookieClient(): string {
  const session = readReferralSession();
  return session?.code || "";
}
