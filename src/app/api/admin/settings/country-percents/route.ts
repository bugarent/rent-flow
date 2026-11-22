import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import { clampSiteDiscountPercent } from "@/lib/pricing/booking-discount";
import { countryPlatformPercents } from "@/lib/pricing/country-platform-percents";
import { getPlatformSettings, savePlatformSettings } from "@/lib/server/platform-settings-store";

const bodySchema = z.object({
  kind: z.enum(["deposit", "discount"]),
  values: z.record(z.string(), z.number().int()),
});

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = bodySchema.parse(await req.json());
    const current = await getPlatformSettings();
    const incoming: Record<string, number> = {};
    for (const [key, value] of Object.entries(body.values)) {
      const iso = key.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(iso) || !Number.isInteger(value)) continue;
      incoming[iso] = value;
    }

    if (body.kind === "deposit") {
      const depositPercentByCountry = { ...current.depositPercentByCountry };
      const siteDiscountPercentByCountry = { ...current.siteDiscountPercentByCountry };
      for (const [iso, value] of Object.entries(incoming)) {
        if (value < DEPOSIT_MIN_PERCENT || value > DEPOSIT_MAX_PERCENT) {
          return NextResponse.json(
            { error: `Enter an integer from ${DEPOSIT_MIN_PERCENT} to ${DEPOSIT_MAX_PERCENT}` },
            { status: 400 },
          );
        }
        depositPercentByCountry[iso] = value;
        if (siteDiscountPercentByCountry[iso] != null) {
          siteDiscountPercentByCountry[iso] = clampSiteDiscountPercent(
            siteDiscountPercentByCountry[iso],
            value,
          );
        }
      }
      const settings = await savePlatformSettings({
        depositPercentByCountry,
        siteDiscountPercentByCountry,
      });
      return NextResponse.json({
        ok: true,
        depositPercentByCountry: settings.depositPercentByCountry,
        siteDiscountPercentByCountry: settings.siteDiscountPercentByCountry,
      });
    }

    const siteDiscountPercentByCountry = { ...current.siteDiscountPercentByCountry };
    for (const [iso, value] of Object.entries(incoming)) {
      const cap = countryPlatformPercents(current, iso).depositPercent;
      if (value < 0 || value > cap) {
        return NextResponse.json(
          { error: `Site discount for ${iso} must be from 0 to ${cap}` },
          { status: 400 },
        );
      }
      siteDiscountPercentByCountry[iso] = value;
    }
    const settings = await savePlatformSettings({ siteDiscountPercentByCountry });
    return NextResponse.json({
      ok: true,
      depositPercentByCountry: settings.depositPercentByCountry,
      siteDiscountPercentByCountry: settings.siteDiscountPercentByCountry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid percents" }, { status: 400 });
    }
    console.error("[admin/settings/country-percents]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save country percents" },
      { status: 500 },
    );
  }
}
