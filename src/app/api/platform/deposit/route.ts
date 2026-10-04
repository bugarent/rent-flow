import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import { DEFAULT_DEPOSIT_PERCENT } from "@/lib/cars/reserve-pricing";
import { clampSiteDiscountPercent } from "@/lib/pricing/booking-discount";

/** Public: site service / activation fee percent and site discount for checkout display. */
export async function GET() {
  try {
    const settings = await getPlatformSettings();
    const depositPercent =
      typeof settings.depositPercent === "number" && Number.isFinite(settings.depositPercent)
        ? Math.trunc(settings.depositPercent)
        : DEFAULT_DEPOSIT_PERCENT;
    const siteDiscountPercent = clampSiteDiscountPercent(settings.siteDiscountPercent, depositPercent);
    return NextResponse.json({ depositPercent, siteDiscountPercent });
  } catch {
    return NextResponse.json({ depositPercent: DEFAULT_DEPOSIT_PERCENT, siteDiscountPercent: 0 });
  }
}
