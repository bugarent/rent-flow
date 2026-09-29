import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { ADMIN_LOGIN, PARTNER_LOGIN } from "@/lib/routes";

export type AuthPortal = "customer" | "admin" | "partner";

export const AUTH_BASE_PATHS: Record<AuthPortal, string> = {
  customer: "/api/auth",
  admin: "/api/auth/admin",
  partner: "/api/auth/partner",
};

export const AUTH_COOKIE_PREFIX: Record<AuthPortal, string> = {
  customer: "rac.customer",
  admin: "rac.admin",
  partner: "rac.partner",
};

export const AUTH_SIGNIN_PAGES: Record<AuthPortal, string> = {
  customer: "/",
  admin: ADMIN_LOGIN,
  partner: PARTNER_LOGIN,
};

export const AUTH_SIGNOUT_PAGES: Record<AuthPortal, string> = {
  customer: "/",
  admin: ADMIN_LOGIN,
  partner: PARTNER_LOGIN,
};

export function useSecureAuthCookies() {
  const url = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return url.startsWith("https://");
}

export function sessionCookieName(portal: AuthPortal) {
  const prefix = AUTH_COOKIE_PREFIX[portal];
  return useSecureAuthCookies() ? `__Secure-${prefix}.session-token` : `${prefix}.session-token`;
}

export async function getPortalToken(req: NextRequest, portal: AuthPortal): Promise<JWT | null> {
  return getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? "dev-rentairportcars-secret",
    cookieName: sessionCookieName(portal),
  });
}
