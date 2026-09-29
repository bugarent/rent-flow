import { NextResponse, type NextRequest } from "next/server";
import { getPortalToken } from "@/lib/auth/portals";
import { apiRateLimitFor, takeRateLimit } from "@/lib/rate-limit";
import {
  ADMIN_BASE,
  ADMIN_LOGIN,
  BUSINESS_PARTNER_BASE,
  BUSINESS_PARTNER_LOGIN,
  PARTNER_BASE,
  PARTNER_LOGIN,
  isAdminPath,
  isBusinessPartnerPath,
  isPartnerPath,
  isPartnerPublicPath,
  isRetiredManagementPath,
} from "@/lib/routes";

/** Must match `BP_SESSION_COOKIE` in business-partner-session.ts (edge-safe string). */
const BP_SESSION_COOKIE = "bp_session";

function deny() {
  return new NextResponse(null, { status: 404 });
}

function noIndex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

function sameOriginMutation(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return true;
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/api/cron/") ||
    pathname.startsWith("/api/integrations/") ||
    pathname.startsWith("/api/channel/")
  ) {
    return true;
  }
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function withSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!sameOriginMutation(req)) {
      return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rule = apiRateLimitFor(pathname, req.method);
    const limit = takeRateLimit(`${ip}:${pathname.split("/").slice(0, 4).join("/")}`, rule.limit, rule.windowMs);
    if (!limit.ok) {
      const res = NextResponse.json({ error: "Too many requests" }, { status: 429 });
      res.headers.set("Retry-After", String(limit.retryAfterSec));
      return withSecurityHeaders(res);
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (isRetiredManagementPath(pathname)) {
    return deny();
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const token = await getPortalToken(req, "customer");
    if (!token || token.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (isAdminPath(pathname)) {
    const token = await getPortalToken(req, "admin");
    const isLogin = pathname === ADMIN_LOGIN;
    if (isLogin) {
      if (token?.role === "ADMIN") {
        return noIndex(NextResponse.redirect(new URL(ADMIN_BASE, req.url)));
      }
      return noIndex(NextResponse.next());
    }
    if (!token) {
      const url = new URL(ADMIN_LOGIN, req.url);
      url.searchParams.set("callbackUrl", pathname);
      return noIndex(NextResponse.redirect(url));
    }
    if (token.role !== "ADMIN") {
      return deny();
    }
    return noIndex(NextResponse.next());
  }

  if (isPartnerPath(pathname)) {
    const token = await getPortalToken(req, "partner");
    const isPublic = isPartnerPublicPath(pathname);
    if (isPublic) {
      if (pathname === PARTNER_LOGIN && token?.role === "VENDOR") {
        return noIndex(NextResponse.redirect(new URL(PARTNER_BASE, req.url)));
      }
      return noIndex(NextResponse.next());
    }
    if (!token) {
      const url = new URL(PARTNER_LOGIN, req.url);
      url.searchParams.set("callbackUrl", pathname);
      return noIndex(NextResponse.redirect(url));
    }
    if (token.role !== "VENDOR") {
      return deny();
    }
    return noIndex(NextResponse.next());
  }

  if (isBusinessPartnerPath(pathname)) {
    const isLogin =
      pathname === BUSINESS_PARTNER_LOGIN || pathname.startsWith(`${BUSINESS_PARTNER_LOGIN}/`);
    const hasSession = Boolean(req.cookies.get(BP_SESSION_COOKIE)?.value?.trim());
    if (isLogin) {
      if (hasSession) {
        return noIndex(NextResponse.redirect(new URL(BUSINESS_PARTNER_BASE, req.url)));
      }
      return noIndex(NextResponse.next());
    }
    if (!hasSession) {
      return noIndex(NextResponse.redirect(new URL(BUSINESS_PARTNER_LOGIN, req.url)));
    }
    return noIndex(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/account",
    "/account/:path*",
    "/adminoperations",
    "/adminoperations/:path*",
    "/partner-portal",
    "/partner-portal/:path*",
    "/business-portal",
    "/business-portal/:path*",
    "/admin",
    "/admin/:path*",
    "/vendor",
    "/vendor/:path*",
    "/api/:path*",
  ],
};
