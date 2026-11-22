import { NextResponse } from "next/server";
import { getAdminSession, requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { withTplPartnerChoice } from "@/lib/extras/tpl-partner-choice";
import { listExtraServices } from "@/lib/server/extras-store";
import { scopeExtrasToPartner } from "@/lib/server/extras/partner-country-scope";
import { listPartnerCustomExtrasAsPricing } from "@/lib/server/partner-custom-extras-store";
import { partnerMayToggleTpl } from "@/lib/server/tpl-partner-choice-store";

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
export async function GET(req: Request) {
  try {
    const session = await requirePartnerApi();
    const admin = await getAdminSession();
    const isAdmin = admin?.user?.role === "ADMIN";
    if (!session && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const requestedPartner = new URL(req.url).searchParams.get("partnerId")?.trim() || "";
    // Admin review passes the listing partner; prefer that over any dual-role partner session.
    const partnerId =
      isAdmin && requestedPartner
        ? requestedPartner
        : session
          ? await resolvePartnerId(session.user.id, session.user.email)
          : requestedPartner;
    const [global, customs, canToggleTpl] = await Promise.all([
      listExtraServices({ activeOnly: true }),
      listPartnerCustomExtrasAsPricing(partnerId, { activeOnly: true }),
      partnerId ? partnerMayToggleTpl(partnerId) : Promise.resolve(false),
    ]);
    const byId = new Map(global.map((s) => [s.id, s]));
    for (const custom of customs) {
      if (!byId.has(custom.id)) byId.set(custom.id, custom);
    }
    const sorted = Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const scoped = partnerId ? await scopeExtrasToPartner(sorted, partnerId) : sorted;
    return NextResponse.json(withTplPartnerChoice(scoped, canToggleTpl));
  } catch (error) {
    console.error("[extras GET]", error);
    return NextResponse.json({ error: "Could not load extras" }, { status: 500 });
  }
}
