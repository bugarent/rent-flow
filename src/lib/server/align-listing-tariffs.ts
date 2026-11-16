import "server-only";

import { descriptionForPublicPricing } from "@/lib/cars/car-details";
import { listingTariffIntervals, type TariffInterval } from "@/lib/partners/company-settings";

function partnerIdAliases(partnerId: string): string[] {
  const raw = partnerId.trim();
  const bare = raw.replace(/^file-partner-/, "");
  return [...new Set([raw, bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

/** Tariff day ranges for this partner, from the account the car form uses. */
export async function tariffIntervalsForPartner(
  partnerId: string | null | undefined,
  companySettings?: unknown,
): Promise<TariffInterval[]> {
  const direct = listingTariffIntervals(companySettings);
  if (direct.length) return direct;
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const aliases = partnerIdAliases(id);
  for (const alias of aliases) {
    if (alias.startsWith("file-partner-")) continue;
    try {
      const { prisma } = await import("@/lib/prisma");
      const row = await prisma.partner.findUnique({
        where: { id: alias },
        select: { companySettings: true },
      });
      const intervals = listingTariffIntervals(row?.companySettings);
      if (intervals.length) return intervals;
    } catch {
      /* file settings below */
    }
  }
  try {
    const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
    for (const alias of aliases) {
      const file = await readCompanySettingsFile(alias).catch(() => null);
      const intervals = listingTariffIntervals(file);
      if (intervals.length) return intervals;
    }
  } catch {
    /* keep the listing's stored ranges */
  }
  return [];
}

/** Listing description whose tier day ranges match the partner's current tariff columns. */
export async function alignPublicListingDescription(
  description: string | null | undefined,
  partnerId: string | null | undefined,
  companySettings?: unknown,
): Promise<string | null | undefined> {
  const intervals = await tariffIntervalsForPartner(partnerId, companySettings);
  return descriptionForPublicPricing(description, intervals);
}
