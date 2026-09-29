import { NextResponse } from "next/server";
import {
  BP_CUSTOMER_DISCOUNT_PERCENT,
  BP_SITE_AFTER_DISCOUNT_PERCENT,
} from "@/lib/business-partner/referral-pricing";
import { normalizeReferralCode } from "@/lib/business-partner/codes";
import {
  getActiveBusinessPartnerByCode,
  resolvePartnerPayoutPercentForNextBooking,
} from "@/lib/server/business-partners-store";

/** Public check: is this an ACTIVE business-partner referral / promo code? */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = normalizeReferralCode(searchParams.get("code") || "");
  if (!code) {
    return NextResponse.json({ valid: false, active: false });
  }
  const partner = await getActiveBusinessPartnerByCode(code);
  if (!partner) {
    return NextResponse.json({ valid: false, active: false, code });
  }
  const partnerOfSitePercent = await resolvePartnerPayoutPercentForNextBooking(partner.id);
  return NextResponse.json({
    valid: true,
    active: true,
    code: partner.referralCode,
    discountPercent: BP_CUSTOMER_DISCOUNT_PERCENT,
    siteAfterDiscountPercent: BP_SITE_AFTER_DISCOUNT_PERCENT,
    partnerOfSitePercent,
  });
}
