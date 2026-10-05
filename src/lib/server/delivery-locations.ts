import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import {
  findSearchPlace,
  isCityLocationCode,
  locationCodesEqual,
  normalizeLocationCode,
} from "@/lib/catalog/search-places";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { parseIso2List } from "@/lib/partner";
import {
  localizeJsonName,
  normalizeMaxFreeAfterDays,
  type DeliveryLocationView,
} from "@/lib/delivery/pricing";
import { toNumber } from "@/lib/utils";
import type { SearchAirportOption } from "@/components/search/airport-search";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { createTtlCache } from "@/lib/server/ttl-cache";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "delivery-locations.json");
const searchAirportsCache = createTtlCache<SearchAirportOption[]>(15_000);

type StoredDeliveryLocation = DeliveryLocationView & {
  createdAt: string;
  updatedAt: string;
};

function airportLabel(iata: string, name: unknown, _cityName?: unknown) {
  const airportName = localizeJsonName(name, iata);
  return `${airportName} (${iata})`;
}

async function readFileStore(): Promise<StoredDeliveryLocation[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row, index) => {
      const item = row as Partial<StoredDeliveryLocation>;
      const rawCode = String(item.iata || item.airportId || "");
      const code = rawCode ? normalizeLocationCode(rawCode) : "";
      const place = code ? findSearchPlace(code) : undefined;
      const kind = item.kind ?? place?.kind ?? (isCityLocationCode(code) ? "city" : "airport");
      return {
        id: String(item.id || `delivery-${index}`),
        airportId: String(item.airportId || code),
        iata: code,
        label: String(item.label || place?.label || item.iata || "Location"),
        country: String(item.country || place?.cityName || ""),
        countryIso2: String(item.countryIso2 || place?.countryIso2 || "").toUpperCase(),
        maxDeliveryPriceEur: toNumber(item.maxDeliveryPriceEur, 0),
        maxFreeAfterDays: normalizeMaxFreeAfterDays(item.maxFreeAfterDays),
        isActive: item.isActive !== false,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 100 + index,
        kind,
        individualBookingEnabled: item.individualBookingEnabled === true,
        createdAt: String(item.createdAt || new Date().toISOString()),
        updatedAt: String(item.updatedAt || new Date().toISOString()),
      };
    });
  } catch {
    return [];
  }
}

async function writeFileStore(rows: StoredDeliveryLocation[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
  searchAirportsCache.clear();
  revalidatePublishedContent();
}

export function clearSearchAirportsCache() {
  searchAirportsCache.clear();
}

/** Countries that currently have approved partners (via partner airport locations). */
export async function getPartnerOperatingCountryIso2s(): Promise<string[]> {
  try {
    const rows = await prisma.partnerAirport.findMany({
      where: { partner: { status: "APPROVED" } },
      select: {
        airport: { select: { city: { select: { country: { select: { iso2: true } } } } } },
      },
    });
    const set = new Set(rows.map((r) => r.airport.city.country.iso2.toUpperCase()));
    try {
      const partners = await prisma.partner.findMany({
        where: { status: "APPROVED" },
        select: { operatingCountryIso2s: true },
      });
      for (const partner of partners) {
        for (const iso2 of parseIso2List(partner.operatingCountryIso2s)) set.add(iso2);
      }
    } catch {
      /* keep airport-derived countries */
    }
    if (set.size === 0) set.add("GE");
    return [...set].sort();
  } catch {
    return ["GE"];
  }
}

/** Airports available to configure as delivery points (partner countries + hubs). */
export async function listConfigurableAirports() {
  const countryIso2s = await getPartnerOperatingCountryIso2s();
  const configured = await listDeliveryLocations();
  const configuredAirportIds = new Set(configured.map((c) => c.airportId));
  const configuredIatas = new Set(configured.map((c) => c.iata));

  try {
    const airports = await prisma.airport.findMany({
      where: {
        isActive: true,
        OR: [
          { isHub: true },
          { city: { country: { iso2: { in: countryIso2s } } } },
        ],
      },
      include: {
        city: { include: { country: true } },
        deliveryLocation: true,
      },
      orderBy: [{ isHub: "desc" }, { sortOrder: "asc" }, { iata: "asc" }],
    });
    return airports.map((a) => ({
      id: a.id,
      iata: a.iata,
      label: airportLabel(a.iata, a.name, a.city.name),
      country: localizeJsonName(a.city.country.name, a.city.country.iso2),
      countryIso2: a.city.country.iso2,
      isHub: a.isHub,
      alreadyConfigured: Boolean(a.deliveryLocation) || configuredAirportIds.has(a.id) || configuredIatas.has(a.iata),
      deliveryLocationId: a.deliveryLocation?.id ?? null,
    }));
  } catch {
    return CATALOG_AIRPORTS.filter(
      (a) => a.isHub || countryIso2s.includes(a.countryIso2),
    ).map((a) => ({
      id: a.iata,
      iata: a.iata,
      label: `${a.name.en} (${a.iata})`,
      country: a.countryName.en,
      countryIso2: a.countryIso2,
      isHub: a.isHub,
      alreadyConfigured: configuredIatas.has(a.iata) || configuredAirportIds.has(a.iata),
      deliveryLocationId: configured.find((c) => c.iata === a.iata)?.id ?? null,
    }));
  }
}

function enrichLocationView(loc: DeliveryLocationView): DeliveryLocationView {
  const code = normalizeLocationCode(loc.iata || loc.airportId || "");
  const place = code ? findSearchPlace(code) : undefined;
  const catalog = code ? CATALOG_AIRPORTS.find((a) => a.iata === code) : undefined;
  const countryIso2 = String(
    loc.countryIso2 || place?.countryIso2 || catalog?.countryIso2 || "",
  ).toUpperCase();
  const kind = loc.kind ?? place?.kind ?? (isCityLocationCode(code) ? "city" : "airport");
  const cityName =
    String(loc.cityName || "").trim() ||
    place?.cityName ||
    catalog?.cityName.en ||
    (kind === "city" ? place?.name || loc.label : "") ||
    "";
  return {
    ...loc,
    iata: code || loc.iata,
    airportId: loc.airportId || code,
    label: place?.label || loc.label || code,
    country:
      loc.country ||
      (countryIso2 ? worldCountryName(countryIso2) : "") ||
      catalog?.countryName.en ||
      "",
    countryIso2,
    kind,
    cityName: cityName || undefined,
    individualBookingEnabled: loc.individualBookingEnabled === true,
    maxFreeAfterDays: normalizeMaxFreeAfterDays(loc.maxFreeAfterDays),
  };
}

/**
 * Global delivery locations for admin, every partner, and homepage search.
 * Prefers Postgres; falls back to `.data/delivery-locations.json` when DB is offline.
 */
export async function listDeliveryLocations(opts?: {
  activeOnly?: boolean;
}): Promise<DeliveryLocationView[]> {
  const { isDbCircuitOpen } = await import("@/lib/prisma");
  if (isDbCircuitOpen()) {
    try {
      const fileRows = await readFileStore();
      const mapped = fileRows.map(({ createdAt: _c, updatedAt: _u, ...view }) => enrichLocationView(view));
      return opts?.activeOnly ? mapped.filter((x) => x.isActive) : mapped;
    } catch {
      return [];
    }
  }

  try {
    const rows = await prisma.deliveryLocation.findMany({
      where: opts?.activeOnly ? { isActive: true } : undefined,
      include: {
        airport: { include: { city: { include: { country: true } } } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (rows.length === 0) {
      const fileRows = await readFileStore();
      const mapped = fileRows.map(({ createdAt: _c, updatedAt: _u, ...view }) => enrichLocationView(view));
      return opts?.activeOnly ? mapped.filter((x) => x.isActive) : mapped;
    }

    const fileRows = await readFileStore().catch(() => [] as Awaited<ReturnType<typeof readFileStore>>);
    const fileByIata = new Map(
      fileRows.map((row) => [normalizeLocationCode(row.iata).toUpperCase(), row] as const),
    );

    const mapped = rows.map((row) => {
      const iata = normalizeLocationCode(row.airport.iata);
      const fromFile = fileByIata.get(iata.toUpperCase());
      return enrichLocationView({
        id: row.id,
        airportId: row.airportId,
        iata,
        label: airportLabel(row.airport.iata, row.airport.name, row.airport.city.name),
        country: localizeJsonName(row.airport.city.country.name, row.airport.city.country.iso2),
        countryIso2: row.airport.city.country.iso2 || fromFile?.countryIso2 || "",
        maxDeliveryPriceEur: toNumber(row.maxDeliveryPriceEur),
        isActive: row.isActive,
        sortOrder: row.sortOrder,
        kind: fromFile?.kind,
        cityName: localizeJsonName(row.airport.city.name, "") || fromFile?.cityName,
        individualBookingEnabled: fromFile?.individualBookingEnabled === true,
        maxFreeAfterDays: normalizeMaxFreeAfterDays(fromFile?.maxFreeAfterDays),
      });
    });

    const seenIatas = new Set(mapped.map((m) => m.iata.toUpperCase()));
    const extras = fileRows.filter((row) => {
      const iata = normalizeLocationCode(row.iata).toUpperCase();
      if (!iata || seenIatas.has(iata)) return false;
      seenIatas.add(iata);
      return true;
    });
    const extraViews = extras.map(({ createdAt: _c, updatedAt: _u, ...view }) => enrichLocationView(view));
    const merged = [...mapped, ...extraViews];

    // Read-only hot path — do not rewrite .data on every homepage/search load.
    return opts?.activeOnly ? merged.filter((x) => x.isActive) : merged;
  } catch (error) {
    if (isDbOfflineError(error)) {
      const { markDbCircuitOpen } = await import("@/lib/prisma");
      markDbCircuitOpen("delivery-locations", error);
    } else {
      console.warn("[delivery-locations] list DB error, using file store:", error);
    }
    const fileRows = await readFileStore();
    const mapped = fileRows.map(({ createdAt: _c, updatedAt: _u, ...view }) => enrichLocationView(view));
    return opts?.activeOnly ? mapped.filter((x) => x.isActive) : mapped;
  }
}

export async function createDeliveryLocation(input: {
  airportId: string;
  maxDeliveryPriceEur: number;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<DeliveryLocationView> {
  const maxDeliveryPriceEur = Math.max(0, Number(input.maxDeliveryPriceEur));
  const isActive = input.isActive ?? true;
  const sortOrder = input.sortOrder ?? 100;

  /** A saved row for this place already exists: switch it on if asked, never off. */
  const reuseExisting = async (id: string, currentlyActive: boolean): Promise<DeliveryLocationView> => {
    if (isActive && !currentlyActive) {
      const updated = await updateDeliveryLocation(id, { isActive: true });
      if (updated) return updated;
    }
    const all = await listDeliveryLocations({ activeOnly: false });
    const found = all.find((l) => l.id === id);
    if (!found) throw new Error("This airport is already configured");
    return found;
  };

  const createInFile = async (): Promise<DeliveryLocationView> => {
    const place = findSearchPlace(input.airportId);
    const iata = place?.code ?? normalizeLocationCode(input.airportId);
    const fileRows = await readFileStore();
    const existingRow = fileRows.find(
      (r) => normalizeLocationCode(r.iata) === iata || r.airportId === input.airportId,
    );
    if (existingRow) return reuseExisting(existingRow.id, existingRow.isActive);

    const now = new Date().toISOString();
    const view: StoredDeliveryLocation = {
      id: randomUUID(),
      airportId: input.airportId,
      iata,
      label: place?.label ?? (CATALOG_AIRPORTS.find((a) => a.iata === iata)
        ? `${CATALOG_AIRPORTS.find((a) => a.iata === iata)!.name.en} (${iata})`
        : iata),
      country: place ? worldCountryName(place.countryIso2) : CATALOG_AIRPORTS.find((a) => a.iata === iata)?.countryName.en ?? "",
      countryIso2: place?.countryIso2 ?? CATALOG_AIRPORTS.find((a) => a.iata === iata)?.countryIso2 ?? "",
      maxDeliveryPriceEur,
      isActive,
      sortOrder,
      kind: place?.kind ?? (isCityLocationCode(iata) ? "city" : "airport"),
      individualBookingEnabled: false,
      createdAt: now,
      updatedAt: now,
    };
    await writeFileStore([...fileRows, view]);
    const { createdAt: _c, updatedAt: _u, ...publicView } = view;
    return publicView;
  };

  try {
    if (isCityLocationCode(input.airportId) || findSearchPlace(input.airportId)?.kind === "city") {
      return createInFile();
    }
    const airport = await prisma.airport.findFirst({
      where: {
        OR: [{ id: input.airportId }, { iata: input.airportId.toUpperCase() }],
        isActive: true,
      },
      include: { city: { include: { country: true } } },
    });
    if (!airport) {
      // Catalog IATA when Airport table is empty or this city is not seeded yet
      return createInFile();
    }

    const existing = await prisma.deliveryLocation.findUnique({
      where: { airportId: airport.id },
    });
    if (existing) return reuseExisting(existing.id, existing.isActive);

    const row = await prisma.deliveryLocation.create({
      data: {
        airportId: airport.id,
        maxDeliveryPriceEur,
        isActive,
        sortOrder,
      },
      include: { airport: { include: { city: { include: { country: true } } } } },
    });

    const view: DeliveryLocationView = {
      id: row.id,
      airportId: row.airportId,
      iata: row.airport.iata,
      label: airportLabel(row.airport.iata, row.airport.name, row.airport.city.name),
      country: localizeJsonName(row.airport.city.country.name, row.airport.city.country.iso2),
      countryIso2: row.airport.city.country.iso2,
      maxDeliveryPriceEur: toNumber(row.maxDeliveryPriceEur),
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };

    const fileRows = await readFileStore();
    const now = new Date().toISOString();
    await writeFileStore([
      ...fileRows.filter((r) => r.airportId !== view.airportId && r.iata !== view.iata),
      { ...view, createdAt: now, updatedAt: now },
    ]);
    return view;
  } catch (error) {
    if (error instanceof Error && error.message.includes("already configured")) {
      throw error;
    }
    console.warn("[delivery-locations] create via file store:", error);
    return createInFile();
  }
}

function nextMaxFreeAfterDays(
  input: { maxFreeAfterDays?: number | null },
  prev: { maxFreeAfterDays?: number | null } | undefined,
): number | null {
  if (input.maxFreeAfterDays !== undefined) return normalizeMaxFreeAfterDays(input.maxFreeAfterDays);
  return normalizeMaxFreeAfterDays(prev?.maxFreeAfterDays);
}

export async function updateDeliveryLocation(
  id: string,
  input: {
    maxDeliveryPriceEur?: number;
    isActive?: boolean;
    sortOrder?: number;
    individualBookingEnabled?: boolean;
    maxFreeAfterDays?: number | null;
  },
): Promise<DeliveryLocationView | null> {
  const clampPartners = async (maxFreeAfterDays: number | null) => {
    if (input.maxFreeAfterDays === undefined || maxFreeAfterDays == null) return;
    const { clampAllPartnerFreeAfterDays } = await import("@/lib/server/partner-delivery-prefs-store");
    await clampAllPartnerFreeAfterDays(id, maxFreeAfterDays);
  };

  const patchFile = async (): Promise<DeliveryLocationView | null> => {
    const fileRows = await readFileStore();
    const idx = fileRows.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const current = fileRows[idx];
    const maxFreeAfterDays = nextMaxFreeAfterDays(input, current);
    const next: StoredDeliveryLocation = {
      ...current,
      maxDeliveryPriceEur:
        input.maxDeliveryPriceEur != null
          ? Math.max(0, Number(input.maxDeliveryPriceEur))
          : current.maxDeliveryPriceEur,
      maxFreeAfterDays,
      isActive: input.isActive ?? current.isActive,
      sortOrder: input.sortOrder ?? current.sortOrder,
      individualBookingEnabled:
        input.individualBookingEnabled != null
          ? input.individualBookingEnabled
          : current.individualBookingEnabled === true,
      updatedAt: new Date().toISOString(),
    };
    fileRows[idx] = next;
    await writeFileStore(fileRows);
    await clampPartners(maxFreeAfterDays);
    const { createdAt: _c, updatedAt: _u, ...view } = next;
    return enrichLocationView(view);
  };

  try {
    const data: {
      maxDeliveryPriceEur?: number;
      isActive?: boolean;
      sortOrder?: number;
    } = {};
    if (input.maxDeliveryPriceEur != null) data.maxDeliveryPriceEur = Math.max(0, Number(input.maxDeliveryPriceEur));
    if (input.isActive != null) data.isActive = input.isActive;
    if (input.sortOrder != null) data.sortOrder = input.sortOrder;

    const row = await prisma.deliveryLocation.update({
      where: { id },
      data,
      include: { airport: { include: { city: { include: { country: true } } } } },
    });

    const fileRows = await readFileStore();
    const prev = fileRows.find((r) => r.id === id);
    const now = new Date().toISOString();
    const maxFreeAfterDays = nextMaxFreeAfterDays(input, prev);
    const view: DeliveryLocationView = enrichLocationView({
      id: row.id,
      airportId: row.airportId,
      iata: row.airport.iata,
      label: airportLabel(row.airport.iata, row.airport.name, row.airport.city.name),
      country: localizeJsonName(row.airport.city.country.name, row.airport.city.country.iso2),
      countryIso2: row.airport.city.country.iso2,
      maxDeliveryPriceEur: toNumber(row.maxDeliveryPriceEur),
      maxFreeAfterDays,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      kind: prev?.kind,
      individualBookingEnabled:
        input.individualBookingEnabled != null
          ? input.individualBookingEnabled
          : prev?.individualBookingEnabled === true,
    });

    await writeFileStore([
      ...fileRows.filter((r) => r.id !== id),
      { ...view, createdAt: prev?.createdAt || now, updatedAt: now },
    ]);
    await clampPartners(maxFreeAfterDays);
    return view;
  } catch (error) {
    console.warn("[delivery-locations] update via file store:", error);
    return patchFile();
  }
}

export async function deleteDeliveryLocation(id: string): Promise<boolean> {
  try {
    await prisma.deliveryLocation.delete({ where: { id } });
  } catch (error) {
    console.warn("[delivery-locations] delete DB path:", error);
  }
  const fileRows = await readFileStore();
  const next = fileRows.filter((r) => r.id !== id);
  await writeFileStore(next);
  return fileRows.length !== next.length || true;
}

const DEFAULT_PARTNER_DELIVERY_MAX_EUR = 100;

/**
 * Upsert a delivery location for an airport id (no partner-country gate).
 * Used so partners can mark Delivery on their registered airports.
 */
export async function ensureDeliveryLocationForAirport(
  airportId: string,
  maxDeliveryPriceEur = DEFAULT_PARTNER_DELIVERY_MAX_EUR,
): Promise<DeliveryLocationView | null> {
  try {
    const airport = await prisma.airport.findFirst({
      where: {
        OR: [{ id: airportId }, { iata: airportId.toUpperCase() }],
        isActive: true,
      },
      include: { city: { include: { country: true } }, deliveryLocation: true },
    });
    if (!airport) return null;

    if (airport.deliveryLocation) {
      return {
        id: airport.deliveryLocation.id,
        airportId: airport.id,
        iata: airport.iata,
        label: airportLabel(airport.iata, airport.name, airport.city.name),
        country: localizeJsonName(airport.city.country.name, airport.city.country.iso2),
        countryIso2: airport.city.country.iso2,
        maxDeliveryPriceEur: toNumber(airport.deliveryLocation.maxDeliveryPriceEur),
        isActive: airport.deliveryLocation.isActive,
        sortOrder: airport.deliveryLocation.sortOrder,
      };
    }

    const row = await prisma.deliveryLocation.create({
      data: {
        airportId: airport.id,
        maxDeliveryPriceEur: Math.max(0, maxDeliveryPriceEur),
        isActive: true,
        sortOrder: 100,
      },
      include: { airport: { include: { city: { include: { country: true } } } } },
    });

    return {
      id: row.id,
      airportId: row.airportId,
      iata: row.airport.iata,
      label: airportLabel(row.airport.iata, row.airport.name, row.airport.city.name),
      country: localizeJsonName(row.airport.city.country.name, row.airport.city.country.iso2),
      countryIso2: row.airport.city.country.iso2,
      maxDeliveryPriceEur: toNumber(row.maxDeliveryPriceEur),
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  } catch (error) {
    console.warn("[delivery-locations] ensureDeliveryLocationForAirport:", error);
    const all = await listDeliveryLocations({ activeOnly: false });
    return all.find((d) => d.airportId === airportId || d.iata === airportId.toUpperCase()) ?? null;
  }
}

export async function ensureDeliveryLocationByCode(
  codeRaw: string,
  opts?: { isActive?: boolean },
): Promise<DeliveryLocationView | null> {
  const raw = String(codeRaw || "").trim();
  if (!raw) return null;

  const all = await listDeliveryLocations({ activeOnly: false });
  const byId = all.find((l) => l.id === raw);
  if (byId) return byId;

  const code = normalizeLocationCode(raw);
  const byCode = all.find(
    (l) => locationCodesEqual(l.iata, code) || locationCodesEqual(l.airportId, code),
  );
  if (byCode) return byCode;

  const place = findSearchPlace(code);
  if (!place && !CATALOG_AIRPORTS.some((a) => a.iata === code)) {
    return null;
  }

  try {
    return await createDeliveryLocation({
      airportId: code,
      maxDeliveryPriceEur: DEFAULT_PARTNER_DELIVERY_MAX_EUR,
      // Partner requests stay off homepage search until admin activates the location.
      isActive: opts?.isActive ?? false,
    });
  } catch (error) {
    if (error instanceof Error && /already configured/i.test(error.message)) {
      const again = await listDeliveryLocations({ activeOnly: false });
      return (
        again.find(
          (l) => locationCodesEqual(l.iata, code) || locationCodesEqual(l.airportId, code) || l.id === raw,
        ) ?? null
      );
    }
    console.warn("[delivery-locations] ensureDeliveryLocationByCode:", error);
    return null;
  }
}

/** Resolve partner-selected location ids or place codes to stable DeliveryLocation ids. */
export async function resolvePartnerDeliveryLocationIds(rawIds: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const raw of rawIds) {
    const loc = await ensureDeliveryLocationByCode(raw, { isActive: false });
    if (loc?.id) out.push(loc.id);
  }
  return [...new Set(out)];
}

/** After admin confirms a partner's operating places, enable them for homepage search. */
export async function activatePartnerApprovedDeliveryLocations(rawIds: string[]): Promise<string[]> {
  const ids = await resolvePartnerDeliveryLocationIds(rawIds);
  for (const id of ids) {
    try {
      const all = await listDeliveryLocations({ activeOnly: false });
      const loc = all.find((l) => l.id === id);
      if (loc && !loc.isActive) {
        await updateDeliveryLocation(id, { isActive: true });
      }
    } catch (error) {
      console.warn("[delivery-locations] activatePartnerApprovedDeliveryLocations", id, error);
    }
  }
  searchAirportsCache.clear();
  return ids;
}

/** Place codes listed by approved partners, expanded to location ids and IATA codes. */
async function approvedPartnerPlaceCodes(exceptPartnerId?: string): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (raw: string) => {
    const code = normalizeLocationCode(raw || "");
    if (code) set.add(code.toUpperCase());
  };

  try {
    const partners = await prisma.partner.findMany({
      where: { status: { in: ["APPROVED", "PENDING_REMODERATION"] } },
      select: { id: true, companySettings: true },
    });
    const { parseCompanySettings } = await import("@/lib/partners/company-settings");
    for (const partner of partners) {
      if (exceptPartnerId && partner.id === exceptPartnerId) continue;
      for (const id of parseCompanySettings(partner.companySettings).deliveryLocationIds || []) add(id);
    }
  } catch {
    /* file partners below */
  }

  try {
    const { listFilePartnerApplications } = await import("@/lib/server/partner-applications-store");
    const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
    const files = await listFilePartnerApplications();
    for (const partner of files) {
      if (partner.status !== "APPROVED") continue;
      if (exceptPartnerId && partner.id === exceptPartnerId) continue;
      const settings = await readCompanySettingsFile(partner.id);
      for (const id of settings?.deliveryLocationIds || []) add(id);
    }
  } catch {
    /* ignore */
  }

  const all = await listDeliveryLocations({ activeOnly: false });
  const extra: string[] = [];
  for (const loc of all) {
    const keys = [loc.id, loc.iata, loc.airportId]
      .map((value) => normalizeLocationCode(value || "").toUpperCase())
      .filter(Boolean);
    if (!keys.some((key) => set.has(key))) continue;
    extra.push(...keys);
  }
  for (const key of extra) set.add(key);
  return set;
}

/**
 * Turn off pickup places that belonged only to this partner.
 * Places still used by another approved partner, or by a live car, stay in search.
 */
export async function retireUnusedPartnerPlaces(partnerId: string, listed: string[]) {
  const kept = await approvedPartnerPlaceCodes(partnerId);
  const all = await listDeliveryLocations({ activeOnly: false });
  const carCodes = await codesOfferingCarPickup(all);
  for (const raw of listed) {
    const code = normalizeLocationCode(raw || "").toUpperCase();
    if (!code || kept.has(code) || carCodes.has(code)) continue;
    const loc = all.find((row) =>
      [row.id, row.iata, row.airportId].some(
        (value) => normalizeLocationCode(value || "").toUpperCase() === code,
      ),
    );
    if (!loc?.isActive) continue;
    if (locationOffersPickup(loc, kept) || locationOffersPickup(loc, carCodes)) continue;
    try {
      await updateDeliveryLocation(loc.id, { isActive: false });
    } catch (error) {
      console.warn("[delivery-locations] retireUnusedPartnerPlaces", loc.id, error);
    }
  }
  searchAirportsCache.clear();
}

/**
 * Delivery locations for create-car = locations saved in partner personal info
 * (companySettings.deliveryLocationIds). Same set the partner sees in operating countries.
 */
export async function listPartnerScopedDeliveryLocations(
  partnerId: string,
): Promise<DeliveryLocationView[]> {
  const { resolveCompanySettings, readCompanySettingsFile } = await import(
    "@/lib/server/partner-company-settings-store"
  );
  const { prisma } = await import("@/lib/prisma");
  const { LOCAL_PARTNER_ID, loadLocalPartner } = await import("@/lib/auth/local-partner-store");

  let rawIds: string[] = [];
  try {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (partner) {
      const settings = await resolveCompanySettings(partner);
      rawIds = settings.deliveryLocationIds || [];
    }
  } catch {
    /* db offline — fall through to file */
  }
  if (!rawIds.length) {
    const file = await readCompanySettingsFile(partnerId);
    rawIds = file?.deliveryLocationIds || [];
  }
  // Local partner alias: settings are often stored under LOCAL_PARTNER_ID
  if (!rawIds.length && partnerId !== LOCAL_PARTNER_ID) {
    const local = loadLocalPartner();
    if (local && (partnerId === local.id || partnerId === local.email)) {
      const file = await readCompanySettingsFile(LOCAL_PARTNER_ID);
      rawIds = file?.deliveryLocationIds || [];
    }
  }
  if (!rawIds.length) {
    const file = await readCompanySettingsFile(LOCAL_PARTNER_ID);
    if (partnerId === LOCAL_PARTNER_ID || loadLocalPartner()?.id === partnerId) {
      rawIds = file?.deliveryLocationIds || [];
    }
  }

  if (!rawIds.length) return [];

  // Resolve against existing catalog only — never create locations on GET/list.
  const all = await listDeliveryLocations({ activeOnly: false });
  const byIata = new Map(all.map((d) => [normalizeLocationCode(d.iata).toUpperCase(), d]));
  const byId = new Map(all.map((d) => [d.id, d]));
  const result = new Map<string, DeliveryLocationView>();

  for (const raw of rawIds) {
    const id = String(raw || "").trim();
    if (!id) continue;
    const existing = byId.get(id) || byIata.get(normalizeLocationCode(id).toUpperCase());
    if (existing) result.set(existing.id, existing);
  }

  return [...result.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.iata.localeCompare(b.iata));
}

/** Location codes where an approved car can actually be picked up. */
async function codesOfferingCarPickup(locations: DeliveryLocationView[]): Promise<Set<string>> {
  const codes = new Set<string>();
  const add = (raw: string | null | undefined) => {
    const code = normalizeLocationCode(raw || "");
    if (code) codes.add(code.toUpperCase());
  };
  const byId = new Map(locations.map((loc) => [loc.id, loc]));

  try {
    const rows = await prisma.carDeliveryPrice.findMany({
      where: {
        car: {
          status: "APPROVED",
          partner: { status: { in: ["APPROVED", "PENDING_REMODERATION"] } },
        },
      },
      select: {
        deliveryLocationId: true,
        deliveryLocation: { select: { airport: { select: { iata: true } } } },
      },
    });
    for (const row of rows) {
      add(row.deliveryLocation?.airport?.iata);
      const loc = byId.get(row.deliveryLocationId);
      add(loc?.iata);
      add(loc?.airportId);
      add(row.deliveryLocationId);
    }
  } catch {
    /* file listings can still mark a place as bookable */
  }

  try {
    const { isPublicFileCarStatus, listFileCars } = await import("@/lib/server/partner-cars-store");
    const cars = await listFileCars();
    for (const car of cars) {
      if (!isPublicFileCarStatus(car.status)) continue;
      for (const price of car.deliveryPrices || []) {
        const loc = byId.get(price.deliveryLocationId);
        add(loc?.iata);
        add(loc?.airportId);
        add(price.deliveryLocationId);
      }
    }
  } catch {
    /* ignore */
  }

  return codes;
}

function locationOffersPickup(loc: DeliveryLocationView, pickupCodes: Set<string>) {
  return [loc.iata, loc.airportId, loc.id].some((raw) => {
    const code = normalizeLocationCode(raw || "");
    return Boolean(code && pickupCodes.has(code.toUpperCase()));
  });
}

/** Search widget options: admin-enabled places that have a car, else catalog hubs on a fresh install. */
export async function getSearchDeliveryAirports(): Promise<SearchAirportOption[]> {
  const hit = searchAirportsCache.get();
  if (hit) return hit;

  const all = await listDeliveryLocations();
  const locations = all.filter((loc) => loc.isActive);
  const pickupCodes = locations.length ? await codesOfferingCarPickup(all) : new Set<string>();
  const partnerCodes = locations.length ? await approvedPartnerPlaceCodes() : new Set<string>();

  const toOption = (loc: {
    iata: string;
    label: string;
    country: string;
    countryIso2: string;
    kind?: "airport" | "city";
    individualBookingEnabled?: boolean;
  }): SearchAirportOption => {
    const place = findSearchPlace(loc.iata);
    const iso2 =
      loc.countryIso2?.toUpperCase() ||
      place?.countryIso2 ||
      CATALOG_AIRPORTS.find((a) => a.iata === loc.iata)?.countryIso2.toUpperCase() ||
      "";
    const kind = loc.kind ?? place?.kind ?? (isCityLocationCode(loc.iata) ? "city" : "airport");
    return {
      iata: place?.code ?? loc.iata,
      label: place?.label || loc.label,
      country: loc.country || worldCountryName(iso2),
      countryIso2: iso2,
      isHub: true,
      kind,
      individualBookingEnabled: loc.individualBookingEnabled === true,
    };
  };

  let result: SearchAirportOption[];
  if (all.length > 0) {
    result = locations
      .filter((loc) => locationOffersPickup(loc, pickupCodes) || locationOffersPickup(loc, partnerCodes))
      .map(toOption);
  } else {
    const hubs = CATALOG_AIRPORTS.filter((a) => a.isHub);
    const ordered = [...hubs.filter((a) => a.iata === "KUT"), ...hubs.filter((a) => a.iata !== "KUT")];
    result = ordered.map((a) =>
      toOption({
        iata: a.iata,
        label: `${a.name.en} (${a.iata})`,
        country: a.countryName.en,
        countryIso2: a.countryIso2,
        kind: "airport",
      }),
    );
  }

  searchAirportsCache.set(result);
  return result;
}
