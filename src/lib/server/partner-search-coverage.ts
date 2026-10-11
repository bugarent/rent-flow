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
  updateDeliveryLocation,
} from "@/lib/server/delivery-locations";
import {
  clearAdminDisabledPlaces,
  readAdminDisabledPlaces,
} from "@/lib/server/delivery-admin-disabled-store";
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
  await clearAdminDisabledPlaces(await placeKeysFor(codes));
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

/** Partners whose pickup places belong in the admin delivery list and its counts. */
const LISTED_PARTNER_STATUS_LIST = [
  "PENDING",
  "INVITED",
  "PENDING_FINAL",
  "NEEDS_CORRECTION",
  "APPROVED",
  "PENDING_REMODERATION",
] as const;
const LISTED_PARTNER_STATUSES = new Set<string>(LISTED_PARTNER_STATUS_LIST);

type PartnerPlaceGroup = {
  partnerId: string;
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
      where: { status: { in: [...LISTED_PARTNER_STATUS_LIST] } },
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
      groups.push({ partnerId: partner.id, codes });
    }
  } catch {
    /* file applications below */
  }

  try {
    const { listFilePartnerApplications } = await import("@/lib/server/partner-applications-store");
    const files = await listFilePartnerApplications();
    for (const partner of files) {
      if (seen.has(partner.id)) continue;
      if (!LISTED_PARTNER_STATUSES.has(partner.status)) continue;
      const settings = await readCompanySettingsFile(partner.id);
      const codes = codesFromSettingsOrSnapshot(settings, partner.applicationMessages);
      if (!codes.length) continue;
      groups.push({ partnerId: partner.id, codes });
    }
  } catch {
    /* ignore */
  }

  return groups;
}

/**
 * Put a partner application's pickup places into the admin delivery catalog
 * and turn them on so the list and the airport/city counts include them.
 */
export async function registerApplicationDeliveryLocations(codes: string[]): Promise<string[]> {
  return listPartnerPlaces(codes);
}

/** Place codes (IATA / city code) for saved location ids or codes. */
async function placeKeysFor(rawCodes: string[]): Promise<string[]> {
  const rows = await listDeliveryLocations({ activeOnly: false });
  return rawCodes.map((raw) => {
    const row = rows.find((r) => r.id === raw);
    return row ? row.iata || row.airportId : raw;
  });
}

/**
 * Make sure each place is in the admin delivery list and switched on, except
 * places an administrator switched off by hand.
 */
async function listPartnerPlaces(rawCodes: string[]): Promise<string[]> {
  const unique = [...new Set(rawCodes.map((code) => String(code || "").trim()).filter(Boolean))];
  if (!unique.length) return [];
  const disabled = await readAdminDisabledPlaces();
  const rows = await listDeliveryLocations({ activeOnly: false });
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    for (const value of [row.id, row.iata, row.airportId]) {
      const k = normalizeLocationCode(value || "").toUpperCase();
      if (k && !byKey.has(k)) byKey.set(k, row);
    }
  }

  const ids: string[] = [];
  for (const raw of unique) {
    const place = findSearchPlace(raw);
    const keys = [raw, place?.code || ""]
      .map((value) => normalizeLocationCode(value).toUpperCase())
      .filter(Boolean);
    const existing = keys.map((k) => byKey.get(k)).find(Boolean);
    const placeKey = normalizeLocationCode(existing?.iata || existing?.airportId || keys[0] || "").toUpperCase();
    if (disabled.has(placeKey) || keys.some((k) => disabled.has(k))) {
      if (existing) ids.push(existing.id);
      continue;
    }
    if (existing) {
      if (!existing.isActive) await updateDeliveryLocation(existing.id, { isActive: true });
      ids.push(existing.id);
      continue;
    }
    const created = await ensureDeliveryLocationByCode(raw, { isActive: true });
    if (!created) continue;
    ids.push(created.id);
    for (const value of [created.id, created.iata, created.airportId]) {
      const k = normalizeLocationCode(value || "").toUpperCase();
      if (k) byKey.set(k, created);
    }
  }
  clearSearchAirportsCache();
  return [...new Set(ids)];
}

/**
 * Keep the delivery catalog aligned with partner applications and approved partners:
 * every listed place appears in the admin list, switched on unless an
 * administrator turned it off by hand.
 */
export async function syncListedPartnerDeliveryLocations(): Promise<void> {
  const groups = await listedPartnerPlaceGroups();
  if (!groups.length) return;
  await listPartnerPlaces(groups.flatMap((group) => group.codes));
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
