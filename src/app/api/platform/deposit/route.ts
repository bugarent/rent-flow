import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import { DEFAULT_DEPOSIT_PERCENT } from "@/lib/cars/reserve-pricing";

/** Public: site service / activation fee percent for checkout display. */
export async function GET() {
  try {
    const settings = await getPlatformSettings();
    const depositPercent =
      typeof settings.depositPercent === "number" && Number.isFinite(settings.depositPercent)
        ? Math.trunc(settings.depositPercent)
        : DEFAULT_DEPOSIT_PERCENT;
    return NextResponse.json({ depositPercent });
  } catch {
    return NextResponse.json({ depositPercent: DEFAULT_DEPOSIT_PERCENT });
  }
}
