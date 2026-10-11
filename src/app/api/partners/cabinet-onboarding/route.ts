import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  acknowledgePartnerExtrasVisit,
  extrasGateActive,
  readPartnerCabinetOnboarding,
  recordPartnerCabinetLogin,
} from "@/lib/server/partner-cabinet-onboarding";

async function resolvePartnerId(userId: string, email?: string | null): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner?.id) return partner.id;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const local = loadLocalPartner();
  if (userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)) {
    return local?.id || LOCAL_PARTNER_ID;
  }
  return userId || LOCAL_PARTNER_ID;
}

export async function GET() {
  const session = await requirePartnerApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = await resolvePartnerId(session.user.id, session.user.email);
  const row = await readPartnerCabinetOnboarding(partnerId);
  return NextResponse.json({
    gate: extrasGateActive(row),
    loginCount: row?.loginCount ?? 0,
  });
}

export async function POST(req: Request) {
  const session = await requirePartnerApi();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const partnerId = await resolvePartnerId(session.user.id, session.user.email);
  const action = body?.action === "ack" ? "ack" : body?.action === "login" ? "login" : "";
  if (!action) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  const row =
    action === "login"
      ? await recordPartnerCabinetLogin(partnerId)
      : await acknowledgePartnerExtrasVisit(partnerId);
  return NextResponse.json({
    gate: extrasGateActive(row),
    loginCount: row?.loginCount ?? 0,
  });
}
