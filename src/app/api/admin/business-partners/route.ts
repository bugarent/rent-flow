import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { toAdminBusinessPartner } from "@/lib/catalog/business-partners";
import {
  backfillBusinessPartnerAttributionsFromBookings,
  getBusinessPartnerFinancialStats,
  getBusinessPartnerSettings,
  listAllBusinessPartnerEarnings,
  listBusinessPartners,
} from "@/lib/server/business-partners-store";
import { buildReferralAbsoluteUrl } from "@/lib/business-partner/codes";

function originFromRequest(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    await backfillBusinessPartnerAttributionsFromBookings();
  } catch (error) {
    console.warn("[admin business-partners] backfill failed", error);
  }

  const [partners, settings, stats, earnings] = await Promise.all([
    listBusinessPartners(),
    getBusinessPartnerSettings(),
    getBusinessPartnerFinancialStats(),
    listAllBusinessPartnerEarnings(),
  ]);
  const origin = originFromRequest(req);
  return NextResponse.json({
    partners: partners.map((p) => ({
      ...toAdminBusinessPartner(p),
      referralUrl: buildReferralAbsoluteUrl(origin, p.referralCode),
    })),
    settings,
    stats,
    earnings,
  });
}
