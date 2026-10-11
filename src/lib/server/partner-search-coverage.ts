import "server-only";

import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  defaultCompanySettings,
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { prisma } from "@/lib/prisma";
import { parsePartnerApplicationMessages } from "@/lib/partner-application-messages";
import { parseProfileModeration } from "@/lib/partners/profile-moderation";
import {
  activatePartnerApprovedDeliveryLocations,
  clearSearchAirportsCache,
  ensureDeliveryLocationByCode,
  listDeliveryLocations,
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
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  messengers: string[];
  secondaryMessengers?: string[];
  countryIso2s: string[];
  locationCodes: string[];
  officeCountry?: string;
  centralOffice?: string;
  address?: string;
  clientLanguages?: string[];
  logoUrl?: string;
  website?: string;
}): PartnerCompanySettings {
  const primaryMessengers = input.messengers.filter(
    (item): item is PartnerCompanySettings["primaryMessengers"][number] =>
      item === "WHATSAPP" || item === "VIBER" || item === "TELEGRAM",
  );
  const secondaryMessengers = (input.secondaryMessengers || []).filter(
    (item): item is PartnerCompanySettings["secondaryMessengers"][number] =>
      item === "WHATSAPP" || item === "VIBER" || item === "TELEGRAM",
  );
  const base = defaultCompanySettings({
    companyName: input.companyName,
    email: input.email,
    phone: input.phone,
    secondaryPhone: input.secondaryPhone || null,
    messengers: primaryMessengers,
    primaryMessengers,
    secondaryMessengers,
    deliveryCountryIso2s: input.countryIso2s,
  });
  return {
    ...base,
    title: input.companyName,
    firstName: input.firstName || "",
    lastName: input.lastName || "",
    legalName: input.companyName,
    country: input.officeCountry || "",
    centralOffice: input.centralOffice || "",
    address: input.address || "",
    clientLanguages: input.clientLanguages?.length ? input.clientLanguages : base.clientLanguages,
    logoUrl: input.logoUrl || "",
    primaryPhone: input.phone,
    secondaryPhone: input.secondaryPhone || "",
    primaryMessengers,
    secondaryMessengers,
    email: input.email,
    website: input.website || "",
    deliveryCountryIso2s: input.countryIso2s,
    deliveryLocationIds: input.locationCodes,
  };
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

type PartnerPlaceGroup = {
  partnerId: string;
  /** New application — these places should appear in the admin delivery list. */
  pending: boolean;
  codes: string[];
};

function codesFromSettingsOrSnapshot(
  settings: PartnerCompanySettings | null | undefined,
  messages: unknown,
): string[] {
  const fromSettings = (settings?.deliveryLocationIds || []).map((code) => String(code || "").trim()).filter(Boolean);
  if (fromSettings.length) return fromSettings;
  const parsed = parsePartnerApplicationMessages(messages);
  for (let index = parsed.length - 1; index >= 0; index -= 1) {
    const codes = parsed[index]?.snapshot.locationCodes || [];
    if (codes.length) return codes;
  }
  return [];
}

/** Places partners marked for car delivery, including applications still awaiting review. */
async function listedPartnerPlaceGroups(): Promise<PartnerPlaceGroup[]> {
  const groups: PartnerPlaceGroup[] = [];
  const seen = new Set<string>();

  try {
    const partners = await prisma.partner.findMany({
      where: { status: { in: ["PENDING", "APPROVED", "PENDING_REMODERATION"] } },
      select: {
        id: true,
        status: true,
        companySettings: true,
        profileModeration: true,
        applicationMessages: true,
      },
    });
    for (const partner of partners) {
      let settings = parseCompanySettings(partner.companySettings);
      if (partner.status === "PENDING_REMODERATION") {
        const published = parseProfileModeration(partner.profileModeration).publishedSettings;
        if (published) settings = published;
      }
      const codes = codesFromSettingsOrSnapshot(settings, partner.applicationMessages);
      if (!codes.length) continue;
      seen.add(partner.id);
      groups.push({
        partnerId: partner.id,
        pending: partner.status === "PENDING",
        codes,
      });
    }
  } catch {
    /* file applications below */
  }

  try {
    const { listFilePartnerApplications } = await import("@/lib/server/partner-applications-store");
    const files = await listFilePartnerApplications();
    for (const partner of files) {
      if (seen.has(partner.id)) continue;
      if (partner.status !== "PENDING" && partner.status !== "APPROVED") continue;
      const settings = await readCompanySettingsFile(partner.id);
      const codes = codesFromSettingsOrSnapshot(settings, partner.applicationMessages);
      if (!codes.length) continue;
      groups.push({
        partnerId: partner.id,
        pending: partner.status === "PENDING",
        codes,
      });
    }
  } catch {
    /* ignore */
  }

  return groups;
}

function rememberPlaceKey(keys: Set<string>, raw: string) {
  const norm = normalizeLocationCode(raw || "").toUpperCase();
  if (norm) keys.add(norm);
}

/**
 * Put a partner application's pickup places into the admin delivery catalog
 * and turn them on so the list and the airport/city counts include them.
 */
export async function registerApplicationDeliveryLocations(codes: string[]): Promise<string[]> {
  const unique = [...new Set(codes.map((code) => String(code || "").trim()).filter(Boolean))];
  if (!unique.length) return [];
  return activatePartnerApprovedDeliveryLocations(unique);
}

/**
 * Keep the delivery catalog aligned with partner applications.
 * Pending applications are shown in the admin list. Places an admin already
 * turned off for an approved partner stay off.
 */
export async function syncListedPartnerDeliveryLocations(): Promise<void> {
  const groups = await listedPartnerPlaceGroups();
  if (!groups.length) return;

  const pending = new Set<string>();
  const approved = new Set<string>();
  for (const group of groups) {
    const target = group.pending ? pending : approved;
    for (const code of group.codes) target.add(code);
  }

  if (pending.size) {
    await activatePartnerApprovedDeliveryLocations([...pending]);
  }

  if (approved.size) {
    const existing = await listDeliveryLocations({ activeOnly: false });
    const known = new Set<string>();
    for (const loc of existing) {
      rememberPlaceKey(known, loc.id);
      rememberPlaceKey(known, loc.iata);
      rememberPlaceKey(known, loc.airportId);
    }
    for (const raw of approved) {
      const code = normalizeLocationCode(raw).toUpperCase();
      const place = findSearchPlace(raw);
      const placeCode = place ? normalizeLocationCode(place.code).toUpperCase() : "";
      if ((code && known.has(code)) || (placeCode && known.has(placeCode))) continue;
      const created = await ensureDeliveryLocationByCode(raw, { isActive: true });
      if (!created) continue;
      rememberPlaceKey(known, created.id);
      rememberPlaceKey(known, created.iata);
      rememberPlaceKey(known, created.airportId);
    }
  }
}

/** How many partners deliver to each place code (id, IATA, and city code). */
export async function countPartnersDeliveringByPlace(): Promise<Record<string, number>> {
  const groups = await listedPartnerPlaceGroups();
  const locations = await listDeliveryLocations({ activeOnly: false });
  const owners = new Map<string, Set<string>>();

  const add = (partnerId: string, raw: string) => {
    const norm = normalizeLocationCode(raw || "").toUpperCase();
    if (!norm) return;
    const set = owners.get(norm) ?? new Set<string>();
    set.add(partnerId);
    owners.set(norm, set);
  };

  for (const group of groups) {
    const keys = new Set<string>();
    for (const raw of group.codes) {
      const norm = normalizeLocationCode(raw).toUpperCase();
      if (norm) keys.add(norm);
      const place = findSearchPlace(raw);
      if (place) keys.add(normalizeLocationCode(place.code).toUpperCase());
      const loc = locations.find((row) =>
        [row.id, row.iata, row.airportId].some(
          (value) => normalizeLocationCode(value || "").toUpperCase() === norm,
        ),
      );
      if (!loc) continue;
      for (const value of [loc.id, loc.iata, loc.airportId]) {
        const key = normalizeLocationCode(value || "").toUpperCase();
        if (key) keys.add(key);
      }
    }
    for (const key of keys) add(group.partnerId, key);
  }

  const counts: Record<string, number> = {};
  for (const [key, partners] of owners) counts[key] = partners.size;
  return counts;
}
