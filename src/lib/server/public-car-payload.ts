import "server-only";

import { filterExtrasByCarOffers } from "@/lib/cars/car-details";

type PartnerRef = { partnerId?: string; partner?: { id?: string } };

export type PublicCarRange = { rangeFrom: string; rangeTo: string };

function partnerIdOf(payload: PartnerRef, hint?: string) {
  return String(hint || payload.partnerId || payload.partner?.id || "").trim();
}

async function periodDiscount(carId: string, base: unknown, range: PublicCarRange) {
  if (!range.rangeFrom) return undefined;
  try {
    const { mergeListingDiscountPercent, periodDiscountPercentByCarId } = await import(
      "@/lib/server/partner-period-discounts-store"
    );
    const map = await periodDiscountPercentByCarId(
      range.rangeFrom,
      range.rangeTo || range.rangeFrom,
      [carId],
    );
    return mergeListingDiscountPercent(Number(base) || 0, map.get(carId) ?? 0);
  } catch {
    return undefined;
  }
}

async function deliveryRows(partnerId: string, rows: unknown) {
  if (!partnerId || !Array.isArray(rows)) return undefined;
  try {
    const { readPartnerDeliveryPrefs } = await import("@/lib/server/partner-delivery-prefs-store");
    const { mergeDeliveryPrefsIntoRows } = await import("@/lib/delivery/trip-fees");
    let prefs = await readPartnerDeliveryPrefs(partnerId);
    if (!prefs.length && partnerId.startsWith("file-partner-")) {
      prefs = await readPartnerDeliveryPrefs(partnerId.slice("file-partner-".length));
    }
    if (!prefs.length) return undefined;
    return mergeDeliveryPrefsIntoRows(rows as Array<Record<string, unknown>>, prefs);
  } catch {
    return undefined;
  }
}

async function hydratedExtras(partnerId: string, carId: string, extras: unknown) {
  try {
    const {
      hydrateListingExtras,
      mergeFreeInsuranceExtras,
      applyPartnerExtraOfferModes,
      mergePartnerOfferedExtras,
    } = await import("@/lib/server/extras-store");
    const hydrated = await hydrateListingExtras(extras);
    const withPrefs = await applyPartnerExtraOfferModes(hydrated, partnerId, carId);
    const withOffered = await mergePartnerOfferedExtras(withPrefs, partnerId, carId);
    return await mergeFreeInsuranceExtras(withOffered);
  } catch {
    return undefined;
  }
}

async function companyPayments(partnerId: string) {
  try {
    if (!partnerId) return { rentPaymentMethods: [] as string[], contractUrl: "" };
    const [{ readCompanySettingsFile }, { LOCAL_PARTNER_ID }, { getPlatformSettings }, { resolveActiveContractUrl }] =
      await Promise.all([
        import("@/lib/server/partner-company-settings-store"),
        import("@/lib/auth/local-partner-store"),
        import("@/lib/server/platform-settings-store"),
        import("@/lib/partners/company-settings"),
      ]);
    const ids = [partnerId];
    if (partnerId.startsWith("file-partner-")) {
      const stripped = partnerId.replace(/^file-partner-/, "");
      if (stripped && !ids.includes(stripped)) ids.push(stripped);
    }
    if (!ids.includes(LOCAL_PARTNER_ID)) ids.push(LOCAL_PARTNER_ID);
    const [platform, ...settingsList] = await Promise.all([
      getPlatformSettings(),
      ...ids.map((id) => readCompanySettingsFile(id).catch(() => null)),
    ]);
    const siteContractUrl = platform.siteContractUrl || "";
    const settings = settingsList.find(Boolean);
    if (!settings) return { rentPaymentMethods: [] as string[], contractUrl: siteContractUrl };
    return {
      rentPaymentMethods: Array.isArray(settings.rentPaymentMethods)
        ? settings.rentPaymentMethods.map(String)
        : [],
      contractUrl: resolveActiveContractUrl(settings, siteContractUrl),
    };
  } catch {
    return { rentPaymentMethods: [] as string[], contractUrl: "" };
  }
}

async function clientLanguages(partnerId: string): Promise<string[]> {
  try {
    const { loadPartnerClientLanguages } = await import("@/lib/server/partner-client-languages");
    return await loadPartnerClientLanguages(partnerId);
  } catch {
    return [];
  }
}

/**
 * Adds date-range discount, delivery prefs, hydrated extras and company payment info.
 * Every lookup is independent, so they run in parallel.
 */
export async function enrichPublicCarPayload<T extends object>(
  payload: T,
  input: PublicCarRange & { carId: string; partnerIdHint?: string },
): Promise<T & { rentPaymentMethods: string[]; contractUrl: string; partnerClientLanguages: string[] }> {
  const fields = payload as PartnerRef & {
    id?: string;
    discountPercent?: unknown;
    deliveryPrices?: unknown;
    extras?: unknown;
    description?: unknown;
    partner?: { id?: string } | null;
  };
  const partnerId = partnerIdOf(
    { partnerId: fields.partnerId, partner: fields.partner ?? undefined },
    input.partnerIdHint,
  );
  const carId = String(fields.id || input.carId).trim();
  const [discountPercent, deliveryPrices, hydrated, payments, partnerClientLanguages] =
    await Promise.all([
      periodDiscount(input.carId, fields.discountPercent, input),
      deliveryRows(partnerId, fields.deliveryPrices),
      hydratedExtras(partnerId, carId, fields.extras),
      companyPayments(partnerId),
      clientLanguages(partnerId),
    ]);
  const extras = Array.isArray(hydrated)
    ? filterExtrasByCarOffers(hydrated, String(fields.description || ""))
    : hydrated;
  return {
    ...payload,
    ...(discountPercent !== undefined ? { discountPercent } : {}),
    ...(deliveryPrices !== undefined ? { deliveryPrices } : {}),
    ...(extras !== undefined ? { extras } : {}),
    ...payments,
    partnerClientLanguages,
  };
}

export const PUBLIC_CAR_INCLUDE = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  extras: {
    include: { extraService: true },
    orderBy: { extraService: { sortOrder: "asc" as const } },
  },
  deliveryPrices: {
    include: {
      deliveryLocation: {
        include: { airport: { include: { city: { include: { country: true } } } } },
      },
    },
  },
  partner: {
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      status: true,
      userId: true,
      reviews: { where: { status: "APPROVED" as const }, select: { averageRating: true } },
    },
  },
};

/** File-store car shaped like the Prisma include above (delivery rows carry airport iata). */
export async function shapeFileCarForApi(
  fileCar: NonNullable<Awaited<ReturnType<typeof import("@/lib/server/partner-cars-store").getFileCar>>>,
  insuranceUrl: string | null,
  insuranceExpiresAt: string | null,
) {
  const { fileCarToApiShape } = await import("@/lib/server/partner-cars-store");
  const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
  const { normalizeLocationCode } = await import("@/lib/catalog/search-places");
  const locations = await listDeliveryLocations({ activeOnly: false });
  const byId = new Map(locations.map((l) => [l.id, l]));
  const shaped = fileCarToApiShape(fileCar, insuranceUrl, insuranceExpiresAt);
  const deliveryPrices = (fileCar.deliveryPrices || []).map((row) => {
    const loc = byId.get(row.deliveryLocationId);
    const iata = (loc?.iata || normalizeLocationCode(row.deliveryLocationId) || "").toUpperCase();
    return {
      deliveryLocationId: row.deliveryLocationId,
      priceEur: row.priceEur,
      freeAfterDays: row.freeAfterDays ?? null,
      travelTimeMinutes: row.travelTimeMinutes ?? 0,
      deliveryLocation: {
        id: loc?.id || row.deliveryLocationId,
        isActive: loc ? loc.isActive !== false : Boolean(iata),
        airport: iata
          ? {
              iata,
              city: { country: { iso2: (loc?.countryIso2 || "").toUpperCase() } },
            }
          : null,
      },
    };
  });
  return {
    ...shaped,
    partnerId: fileCar.partnerId,
    extras: fileCar.extras || [],
    deliveryPrices,
  };
}

const PUBLIC_TTL_MS = 15_000;
const publicCache = new Map<string, { at: number; value: Promise<Record<string, unknown> | null> }>();

/** Drop every cached public car payload so a catalog reorder shows up on open listings. */
export function clearPublicCarPayloadCache() {
  publicCache.clear();
}

/** Drop cached public payloads for a car (all date ranges) after it is edited or deleted. */
export function clearPublicCarCache(carId: string) {
  const prefix = `${carId}|`;
  for (const key of publicCache.keys()) {
    if (key.startsWith(prefix)) publicCache.delete(key);
  }
}

/** Customers see the last approved version while a partner edit awaits re-moderation. */
async function withApprovedVersion<T extends object>(carId: string, payload: T): Promise<T> {
  const status = String((payload as { status?: unknown }).status || "");
  if (status !== "PENDING_REMODERATION") return payload;
  try {
    const { readPublishedCarSnapshot, overlayPublishedListing } = await import(
      "@/lib/server/car-published-store"
    );
    const snapshot = await readPublishedCarSnapshot(carId);
    return overlayPublishedListing(payload as unknown as Parameters<typeof overlayPublishedListing>[0], snapshot) as unknown as T;
  } catch {
    return payload;
  }
}

async function buildPublicCarPayload(
  id: string,
  range: PublicCarRange,
): Promise<Record<string, unknown> | null> {
  const { prisma } = await import("@/lib/prisma");
  const { isDbOfflineError } = await import("@/lib/server/db-errors");
  let car: Record<string, unknown> | null = null;
  try {
    car = (await prisma.car.findUnique({
      where: { id },
      include: PUBLIC_CAR_INCLUDE,
    })) as Record<string, unknown> | null;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const { isPubliclyVisibleListing } = await import("@/lib/cars/listing-visibility");
  if (car) {
    if (!isPubliclyVisibleListing(car as { status: string; hiddenReason?: string | null })) return null;
    const partner = car.partner as { id?: string } | null;
    return enrichPublicCarPayload(await withApprovedVersion(id, car), {
      carId: id,
      partnerIdHint: partner?.id,
      ...range,
    });
  }
  const { getFileCar, isPublicFileCar } = await import("@/lib/server/partner-cars-store");
  const fileCar = await getFileCar(id);
  if (!fileCar || !isPublicFileCar(fileCar)) return null;
  const { readCarInsuranceDoc } = await import("@/lib/server/car-insurance-store");
  const doc = await readCarInsuranceDoc(id);
  const shaped = await shapeFileCarForApi(
    fileCar,
    doc?.insuranceUrl || null,
    doc?.insuranceExpiresAt || null,
  );
  const enriched = await enrichPublicCarPayload(await withApprovedVersion(id, shaped), {
    carId: id,
    partnerIdHint: fileCar.partnerId,
    ...range,
  });
  const { passport: _passport, insuranceUrl: _insurance, ...publicPayload } = enriched as typeof enriched & {
    passport?: unknown;
    insuranceUrl?: unknown;
  };
  return publicPayload;
}

/**
 * Public (guest) car payload for checkout — same shape as GET /api/cars/[id] for guests.
 * Briefly cached per car + date range so the page render and the API share the work.
 */
export function loadPublicCarPayload(
  id: string,
  range: PublicCarRange,
): Promise<Record<string, unknown> | null> {
  const key = `${id}|${range.rangeFrom}|${range.rangeTo}`;
  const now = Date.now();
  const hit = publicCache.get(key);
  if (hit && now - hit.at < PUBLIC_TTL_MS) return hit.value;
  const value = buildPublicCarPayload(id, range).catch((error) => {
    publicCache.delete(key);
    throw error;
  });
  publicCache.set(key, { at: now, value });
  if (publicCache.size > 500) {
    for (const [k, entry] of publicCache) {
      if (now - entry.at >= PUBLIC_TTL_MS) publicCache.delete(k);
    }
  }
  return value;
}
