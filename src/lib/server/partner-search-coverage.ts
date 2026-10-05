import "server-only";

import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  defaultCompanySettings,
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { prisma } from "@/lib/prisma";
import {
  activatePartnerApprovedDeliveryLocations,
  clearSearchAirportsCache,
  retireUnusedPartnerPlaces,
} from "@/lib/server/delivery-locations";
import { writeCompanySettingsFile, readCompanySettingsFile } from "@/lib/server/partner-company-settings-store";

/** Keep only catalog airports and city places that belong to the chosen countries. */
export function normalizeRequestedLocationCodes(countryIso2s: string[], rawCodes: string[]): string[] {
  const countries = new Set(countryIso2s.map((iso2) => iso2.toUpperCase()));
  const out: string[] = [];
  for (const raw of rawCodes) {
    const place = findSearchPlace(String(raw || ""));
    if (!place || !countries.has(place.countryIso2)) continue;
    const code = normalizeLocationCode(place.code);
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

export function applicationCompanySettings(input: {
  companyName: string;
  email: string;
  phone: string;
  messengers: string[];
  countryIso2s: string[];
  locationCodes: string[];
}): PartnerCompanySettings {
  const base = defaultCompanySettings({
    companyName: input.companyName,
    email: input.email,
    phone: input.phone,
    messengers: input.messengers,
    primaryMessengers: input.messengers,
    deliveryCountryIso2s: input.countryIso2s,
  });
  return { ...base, deliveryLocationIds: input.locationCodes };
}

export async function saveApplicationPlaces(partnerId: string, settings: PartnerCompanySettings) {
  await writeCompanySettingsFile(partnerId, settings);
  try {
    await prisma.partner.update({
      where: { id: partnerId },
      data: { companySettings: settings },
    });
  } catch {
    /* file copy is enough when the row is not in Postgres yet */
  }
}

async function listedPlaceCodes(partnerId: string): Promise<string[]> {
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { companySettings: true },
    });
    if (partner?.companySettings) {
      return parseCompanySettings(partner.companySettings).deliveryLocationIds || [];
    }
  } catch {
    /* file settings below */
  }
  const file = await readCompanySettingsFile(partnerId);
  return file?.deliveryLocationIds || [];
}

/** After an administrator confirms the application, show the kept places in search. */
export async function publishPartnerSearchPlaces(partnerId: string) {
  const codes = await listedPlaceCodes(partnerId);
  if (!codes.length) return;
  const ids = await activatePartnerApprovedDeliveryLocations(codes);
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { companySettings: true },
    });
    const current = partner?.companySettings
      ? parseCompanySettings(partner.companySettings)
      : await readCompanySettingsFile(partnerId);
    if (current) {
      const next = { ...current, deliveryLocationIds: ids.length ? ids : codes };
      await saveApplicationPlaces(partnerId, next);
    }
  } catch {
    /* locations are already active */
  }
  const airportCodes = codes
    .map((code) => findSearchPlace(code))
    .filter((place) => place?.kind === "airport" && place.iata)
    .map((place) => place!.iata!);
  if (airportCodes.length) {
    try {
      const { setPartnerAirports } = await import("@/lib/server/partner-airports");
      await setPartnerAirports(partnerId, airportCodes);
    } catch {
      /* search uses delivery locations */
    }
  }
  clearSearchAirportsCache();
}

/**
 * When a partner is rejected, suspended, or removed, drop their places from
 * search unless another approved partner or a live car still uses them.
 */
export async function retirePartnerSearchPlaces(partnerId: string, presetCodes?: string[]) {
  const codes = presetCodes?.length ? presetCodes : await listedPlaceCodes(partnerId);
  await retireUnusedPartnerPlaces(partnerId, codes);
  clearSearchAirportsCache();
}
