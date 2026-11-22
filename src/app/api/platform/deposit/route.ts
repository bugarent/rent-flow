import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import { DEFAULT_DEPOSIT_PERCENT } from "@/lib/cars/reserve-pricing";
import { countryPlatformPercents } from "@/lib/pricing/country-platform-percents";
import { locationCountryIso2 } from "@/lib/extras/country-scope";

/** Public: site fee and site discount for the pickup country's checkout. */
export async function GET(req: Request) {
  try {
    const settings = await getPlatformSettings();
    const pickup = new URL(req.url).searchParams.get("pickup");
    const percents = countryPlatformPercents(settings, locationCountryIso2(pickup));
    const depositPercent = Number.isFinite(percents.depositPercent)
      ? percents.depositPercent
      : DEFAULT_DEPOSIT_PERCENT;
    return NextResponse.json({
      depositPercent,
      siteDiscountPercent: percents.siteDiscountPercent,
    });
  } catch {
    return NextResponse.json({ depositPercent: DEFAULT_DEPOSIT_PERCENT, siteDiscountPercent: 0 });
  }
}
