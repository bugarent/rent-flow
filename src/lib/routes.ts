export const ADMIN_BASE = "/adminoperations";
export const ADMIN_LOGIN = `${ADMIN_BASE}/login`;

export const PARTNER_BASE = "/partner-portal";
export const PARTNER_LOGIN = `${PARTNER_BASE}/login`;
export const PARTNER_REGISTER = `${PARTNER_BASE}/register`;
export const PARTNER_VERIFY = `${PARTNER_BASE}/verify`;

/** Affiliate / hotel business-partner personal cabinet. */
export const BUSINESS_PARTNER_BASE = "/business-portal";
export const BUSINESS_PARTNER_LOGIN = `${BUSINESS_PARTNER_BASE}/login`;

export function isPartnerPublicPath(pathname: string) {
  return pathname === PARTNER_LOGIN || pathname === PARTNER_REGISTER || pathname === PARTNER_VERIFY;
}

export const PUBLIC_PATHS = [
  "/",
  "/cars",
  "/locations",
  "/about",
  "/contact",
  "/help",
  "/terms",
  "/privacy",
  "/become-partner",
  "/partnership",
  "/business-partnership",
  "/business-portal",
  "/business-portal/login",
  "/register",
] as const;

export function isAdminPath(pathname: string) {
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

export function isPartnerPath(pathname: string) {
  return pathname === PARTNER_BASE || pathname.startsWith(`${PARTNER_BASE}/`);
}

export function isBusinessPartnerPath(pathname: string) {
  return pathname === BUSINESS_PARTNER_BASE || pathname.startsWith(`${BUSINESS_PARTNER_BASE}/`);
}

/** Legacy paths that must not remain reachable. */
export function isRetiredManagementPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/vendor" || pathname.startsWith("/vendor/");
}

/** Same-origin, portal-scoped redirect after sign-in. */
export function safePortalCallback(pathname: string | null | undefined, portal: "admin" | "partner" | "customer") {
  const fallback = portal === "admin" ? ADMIN_BASE : portal === "partner" ? PARTNER_BASE : "/";
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return fallback;
  if (isRetiredManagementPath(pathname)) return fallback;
  if (portal === "admin" && !isAdminPath(pathname)) return fallback;
  if (portal === "partner" && !isPartnerPath(pathname)) return fallback;
  if (portal === "customer" && (isAdminPath(pathname) || isPartnerPath(pathname))) return "/";
  return pathname;
}
