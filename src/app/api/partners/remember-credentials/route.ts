import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeLogin, verifySecret } from "@/lib/crypto";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { rememberPartnerPortalPassword } from "@/lib/server/partner-credentials-store";
import { partnerCanAccessPortal } from "@/lib/auth/partner-access";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

/**
 * After a successful partner portal login, mirror the plaintext password
 * so admin partner details can show the cabinet login password.
 */
export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());
    const email = normalizeLogin(body.email);
    const password = body.password;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.role === "VENDOR" && verifySecret(password, user.passwordHash)) {
        const partner = await prisma.partner.findUnique({ where: { userId: user.id } });
        if (partner && partnerCanAccessPortal(partner.status)) {
          await rememberPartnerPortalPassword(partner.id, email, password);
          return NextResponse.json({ ok: true });
        }
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
    }

    const local = loadLocalPartner();
    if (
      local &&
      local.status === "ACTIVE" &&
      normalizeLogin(local.email) === email &&
      verifySecret(password, local.passwordHash)
    ) {
      await rememberPartnerPortalPassword(LOCAL_PARTNER_ID, email, password);
      if (local.id !== LOCAL_PARTNER_ID) {
        await rememberPartnerPortalPassword(local.id, email, password);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[partners/remember-credentials]", error);
    return NextResponse.json({ error: "Could not save credentials" }, { status: 500 });
  }
}
