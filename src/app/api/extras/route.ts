import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listExtraServices } from "@/lib/server/extras-store";
import { listPartnerCustomExtrasAsPricing } from "@/lib/server/partner-custom-extras-store";

async function resolvePartnerId(userId: string, email?: string | null): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner?.id) return partner.id;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const local = loadLocalPartner();
  if (userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)) {
    return LOCAL_PARTNER_ID;
  }
  return userId || LOCAL_PARTNER_ID;
}

/** Active extras catalog for the signed-in partner (global + their custom services). */
export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const [global, customs] = await Promise.all([
      listExtraServices({ activeOnly: true }),
      listPartnerCustomExtrasAsPricing(partnerId, { activeOnly: true }),
    ]);
    const byId = new Map(global.map((s) => [s.id, s]));
    for (const custom of customs) {
      if (!byId.has(custom.id)) byId.set(custom.id, custom);
    }
    return NextResponse.json(
      Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    );
  } catch (error) {
    console.error("[extras GET]", error);
    return NextResponse.json({ error: "Could not load extras" }, { status: 500 });
  }
}
