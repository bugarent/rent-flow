import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { requireAdminApi } from "@/lib/auth/sessions";
import { sessionCookieName, shouldUseSecureAuthCookies } from "@/lib/auth/portals";
import { PARTNER_BASE } from "@/lib/routes";
import { cabinetUserForPartner } from "@/lib/server/admin-open-partner-cabinet";

/** Admin view of a partner cabinet expires sooner than a partner's own login. */
const SESSION_SECONDS = 2 * 60 * 60;

function htmlMessage(text: string, status: number) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Partner cabinet</title><body style="font-family:sans-serif;padding:2rem">${text}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

/**
 * Opens this partner's cabinet in the admin's browser: signs the browser into the partner portal
 * as that partner. POST only, so another site cannot trigger it (the admin cookie is SameSite=Lax).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (!admin) return htmlMessage("Admin access required.", 403);

  const { id } = await params;
  let user;
  try {
    user = await cabinetUserForPartner(id);
  } catch (error) {
    console.error("[admin/open-cabinet]", id, error);
    return htmlMessage("Could not open the partner cabinet right now. Try again.", 503);
  }
  if (!user) {
    return htmlMessage("This partner has no cabinet login yet (approve the partner first).", 404);
  }

  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: "VENDOR",
      portal: "partner",
      openedByAdmin: admin.user?.email || admin.user?.id || "admin",
    },
    secret: process.env.NEXTAUTH_SECRET ?? "dev-rentairportcars-secret",
    maxAge: SESSION_SECONDS,
  });
  console.info("[admin/open-cabinet]", admin.user?.email, "opened partner", id, user.email);

  const res = NextResponse.redirect(new URL(PARTNER_BASE, req.url), 303);
  res.cookies.set(sessionCookieName("partner"), token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureAuthCookies(),
    maxAge: SESSION_SECONDS,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
