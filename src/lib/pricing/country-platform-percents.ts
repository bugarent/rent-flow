import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import { clampSiteDiscountPercent } from "@/lib/pricing/booking-discount";

/** ISO2 → integer percent. Missing country uses the platform-wide number. */
export type CountryPercentMap = Record<string, number>;

export function normalizeCountryPercentMap(
  raw: unknown,
  min: number,
  max: number,
): CountryPercentMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: CountryPercentMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const iso = key.trim().toUpperCase();
    const n = Math.trunc(Number(value));
    if (!/^[A-Z]{2}$/.test(iso) || !Number.isInteger(n) || n < min || n > max) continue;
    out[iso] = n;
  }
  return out;
}

export function countryPlatformPercents(
  settings: {
    depositPercent: number;
    siteDiscountPercent: number;
    depositPercentByCountry?: CountryPercentMap | null;
    siteDiscountPercentByCountry?: CountryPercentMap | null;
  },
  countryIso2: string | null | undefined,
): { depositPercent: number; siteDiscountPercent: number } {
  const iso = String(countryIso2 || "").trim().toUpperCase();
  const depositFallback = Math.min(
    DEPOSIT_MAX_PERCENT,
    Math.max(DEPOSIT_MIN_PERCENT, Math.trunc(Number(settings.depositPercent) || 0)),
  );
  const deposit =
    iso.length === 2 && Number.isInteger(settings.depositPercentByCountry?.[iso])
      ? settings.depositPercentByCountry![iso]
      : depositFallback;
  const discountFallback = clampSiteDiscountPercent(settings.siteDiscountPercent, deposit);
  const discount =
    iso.length === 2 && Number.isInteger(settings.siteDiscountPercentByCountry?.[iso])
      ? settings.siteDiscountPercentByCountry![iso]
      : discountFallback;
  return {
    depositPercent: deposit,
    siteDiscountPercent: clampSiteDiscountPercent(discount, deposit),
  };
}
