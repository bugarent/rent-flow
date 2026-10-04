import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_PREFIX,
  type AuthPortal,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/portals";

function clearPortalCookies(res: NextResponse, portal: AuthPortal) {
  const secure = shouldUseSecureAuthCookies();
  const prefix = AUTH_COOKIE_PREFIX[portal];
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 0,
    expires: new Date(0),
  };
  const names = [
    secure ? `__Secure-${prefix}.session-token` : `${prefix}.session-token`,
    secure ? `__Secure-${prefix}.csrf-token` : `${prefix}.csrf-token`,
    secure ? `__Secure-${prefix}.callback-url` : `${prefix}.callback-url`,
  ];
  for (const name of names) {
    res.cookies.set(name, "", base);
  }
}

/** Force-clear partner auth cookies (httpOnly) so logout cannot bounce back to the cabinet. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearPortalCookies(res, "partner");
  return res;
}
