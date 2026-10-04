import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readPreferences } from "@/lib/server/preferences";
import { toNumber } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isCityLocationCode, parseCityLocationCode } from "@/lib/catalog/search-places";
import { loadPublicFileSearchCars } from "@/lib/server/public-file-cars";
import { parseCarDetails } from "@/lib/cars/car-details";
import { listingDailyWithDeliveryEur, rentalDayCount } from "@/lib/cars/reserve-pricing";
import { clampSiteDiscountPercent } from "@/lib/pricing/booking-discount";
import {
  mergeListingDiscountPercent,
  periodDiscountPercentByCarId,
} from "@/lib/server/partner-period-discounts-store";
import { readPartnerDeliveryPrefsMap } from "@/lib/server/partner-delivery-prefs-store";
import {
  readPartnerExtraPrefsMap,
  partnerExtraPrefAppliesToCar,
  type PartnerExtraPref,
} from "@/lib/server/partner-extras-prefs-store";
import {
  computeTripDeliveryFees,
  mergeDeliveryPrefsIntoRows,
} from "@/lib/delivery/trip-fees";
import { meetsBookingLeadTime } from "@/lib/delivery/booking-lead";
import {
  CarsSearchResults,
  type SearchResultCar,
} from "@/components/cars/cars-search-results";
import { resolveEffectiveCategorySlug } from "@/lib/cars/listing-filter-match";
import { listExtraServices } from "@/lib/server/extras-store";
import { localizeExtraName } from "@/lib/extras/pricing";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { getSearchDeliveryAirports } from "@/lib/server/delivery-locations";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("cars", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/cars",
    locale,
    keywords: page.keywords,
  });
}

const INSURANCE_SWEEP_MS = 5 * 60_000;
let lastInsuranceSweepAt = 0;

/** At most one background sweep per instance every few minutes (the cron job also runs it). */
function scheduleInsuranceRemoderation() {
  const now = Date.now();
  if (now - lastInsuranceSweepAt < INSURANCE_SWEEP_MS) return;
  lastInsuranceSweepAt = now;
  void import("@/lib/server/car-insurance-expiry")
    .then((m) => m.applyExpiredInsuranceRemoderation())
    .catch((error) => console.warn("[cars page] insurance expiry", error));
}

async function loadExpiredInsuranceIds(): Promise<Set<string>> {
  try {
    const { listExpiredInsuranceCarIds } = await import("@/lib/server/car-insurance-store");
    return new Set(await listExpiredInsuranceCarIds());
  } catch {
    return new Set();
  }
}

async function loadSiteDiscountPercent(): Promise<number> {
  try {
    const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
    const settings = await getPlatformSettings();
    return clampSiteDiscountPercent(settings.siteDiscountPercent, settings.depositPercent);
  } catch {
    return 0;
  }
}

async function loadCompanySettingsFiles() {
  try {
    const { listCompanySettingsFiles } = await import("@/lib/server/partner-company-settings-store");
    return await listCompanySettingsFiles();
  } catch {
    return [];
  }
}

async function loadUnavailableCarIds(startDate?: string, endDate?: string): Promise<Set<string>> {
  if (!startDate) return new Set();
  const rangeStart = new Date(startDate);
  const rangeEnd = endDate ? new Date(endDate) : new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) return new Set();
  try {
    const { carIdsUnavailableInRange } = await import("@/lib/server/car-availability");
    return await carIdsUnavailableInRange(rangeStart, rangeEnd);
  } catch {
    return new Set();
  }
}

function resolveDriverRequirement(
  details: ReturnType<typeof parseCarDetails>,
  key: "minDriverAge" | "minLicenseYears",
  fallback: number,
): number {
  const raw = details?.[key];
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    pickup?: string;
    dropoff?: string;
    category?: string;
    country?: string;
    pickupAddress?: string;
    dropoffAddress?: string;
  }>;
}) {
  // Expired-insurance cars are filtered out below; the status write itself does not block the page.
  scheduleInsuranceRemoderation();

  const [
    { startDate, endDate, pickup, dropoff, category, country, pickupAddress, dropoffAddress },
    { locale },
  ] = await Promise.all([searchParams, readPreferences()]);
  const dictionary = getDictionary(locale);
  const pickupCode = pickup?.trim();
  // Country-wide browse only applies until a concrete pickup is chosen.
  const countryIso2 = pickupCode ? "" : String(country || "").trim().toUpperCase().slice(0, 2);

  // Independent reads start together instead of one after another.
  const expiredIdsPromise = loadExpiredInsuranceIds();
  const fileCarsPromise = loadPublicFileSearchCars({ pickup: pickupCode }).catch(() => []);
  const extrasCatalogPromise = listExtraServices({ activeOnly: true }).catch(() => null);
  const searchOptionsPromise = getSearchDeliveryAirports().catch(() => []);
  const siteDiscountPromise = loadSiteDiscountPercent();
  const companyFilesPromise = loadCompanySettingsFiles();
  const unavailablePromise = loadUnavailableCarIds(startDate, endDate);
  const categoriesPromise = import("@/lib/server/homepage-categories-store").then((m) =>
    m.listHomepageCategories(),
  );

  const where: Prisma.CarWhereInput = {
    status: "APPROVED",
    partner: { status: { in: ["APPROVED", "PENDING_REMODERATION"] } },
  };

  const pickupIata = pickup?.trim();
  if (pickupIata) {
    if (isCityLocationCode(pickupIata)) {
      const iso2 = parseCityLocationCode(pickupIata)?.iso2;
      if (iso2) {
        where.deliveryPrices = {
          some: {
            deliveryLocation: {
              isActive: true,
              airport: { city: { country: { iso2 } } },
            },
          },
        };
      }
    } else {
      const code = pickupIata.toUpperCase();
      where.deliveryPrices = {
        some: {
          deliveryLocation: {
            isActive: true,
            airport: { iata: code },
          },
        },
      };
    }
  }

  let categoryName: string | null = null;
  const categoryLabels = new Map<string, string>();
  let filterCategories: Array<{
    slug: string;
    name: string;
    imageUrl: string;
    mappedModels: Array<{ make: string; model: string }>;
  }> = [];
  try {
    const allCategories = await categoriesPromise;
    for (const cat of allCategories) categoryLabels.set(cat.slug, cat.name);
    filterCategories = allCategories
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        imageUrl: c.imageUrl || "",
        mappedModels: c.mappedModels ?? [],
      }));

    if (category?.trim()) {
      const homepageCategory = allCategories.find((c) => c.slug === category.trim());
      if (homepageCategory) categoryName = homepageCategory.name;
    }
  } catch {
    /* categories optional — results are matched by effective slug below */
  }

  type DbCar = {
    id: string;
    partnerId?: string;
    make: string;
    model: string;
    year: number;
    title: string;
    seats: number;
    doors: number;
    transmission: string;
    fuelType: string;
    dailyRateEur: unknown;
    discountPercent: unknown;
    description: string;
    categorySlug: string | null;
    photos: Array<{ url: string }>;
    extras?: Array<{ extraServiceId: string; priceEur?: number | null }>;
    partner: {
      id?: string;
      companyName: string;
      logoUrl: string | null;
      companySettings?: unknown;
    };
    deliveryPrices?: Array<{
      deliveryLocationId?: string;
      priceEur: unknown;
      freeAfterDays?: number | null;
      travelTimeMinutes: number | null;
      deliveryLocation: {
        id?: string;
        isActive: boolean;
        airport: { iata: string; city: { country: { iso2: string } } } | null;
      } | null;
    }>;
  };

  let cars: DbCar[] = [];
  try {
    cars = (await prisma.car.findMany({
      where,
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 5 },
        extras: { select: { extraServiceId: true, priceEur: true } },
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
            companySettings: true,
          },
        },
      },
    })) as unknown as DbCar[];
  } catch {
    cars = [];
  }

  try {
    const fileCars = await fileCarsPromise;
    const seen = new Set(cars.map((car) => car.id));
    for (const fileCar of fileCars) {
      if (seen.has(fileCar.id)) continue;
      cars.push({
        id: fileCar.id,
        partnerId: fileCar.partnerId,
        make: fileCar.make,
        model: fileCar.model,
        year: fileCar.year,
        title: fileCar.title,
        seats: fileCar.seats,
        doors: fileCar.doors,
        transmission: fileCar.transmission,
        fuelType: fileCar.fuelType,
        dailyRateEur: fileCar.dailyRateEur,
        discountPercent: fileCar.discountPercent,
        description: fileCar.description,
        categorySlug: fileCar.categorySlug,
        photos: fileCar.photos,
        extras: (fileCar.extras || [])
          .map((row) => ({
            extraServiceId: String(row.extraServiceId || ""),
            priceEur: Number(row.priceEur) || 0,
          }))
          .filter((row) => row.extraServiceId),
        partner: {
          id: fileCar.partnerId,
          companyName: fileCar.partner?.companyName || "Partner",
          logoUrl: fileCar.partner?.logoUrl ?? null,
        },
        deliveryPrices: fileCar.deliveryPrices,
      });
    }
  } catch {
    /* file catalog optional */
  }

  const partnerIds = [
    ...new Set(
      cars
        .map((c) => c.partnerId || c.partner?.id || "")
        .filter(Boolean),
    ),
  ];
  const aliasIds = partnerIds.filter((id) => id.startsWith("file-partner-"));
  const extraPrefIds = new Set(partnerIds);
  for (const pid of partnerIds) {
    if (pid.startsWith("file-partner-")) {
      const stripped = pid.replace(/^file-partner-/, "");
      if (stripped) extraPrefIds.add(stripped);
    }
    extraPrefIds.add("local-partner");
  }
  const discountFrom = startDate || new Date().toISOString();
  const discountTo = endDate || startDate || discountFrom;
  const [deliveryPrefsMap, extraPrefsMap, periodMap, unavailable, expiredIds] = await Promise.all([
    readPartnerDeliveryPrefsMap(aliasIds.length ? [...partnerIds, "local-partner"] : partnerIds).catch(
      () => new Map<string, import("@/lib/server/partner-delivery-prefs-store").PartnerDeliveryPref[]>(),
    ),
    readPartnerExtraPrefsMap([...extraPrefIds]).catch(() => new Map<string, PartnerExtraPref[]>()),
    // When search has no dates (category/airport links), still apply discounts active today.
    periodDiscountPercentByCarId(discountFrom, discountTo, cars.map((c) => c.id)).catch(
      () => new Map<string, number>(),
    ),
    unavailablePromise,
    expiredIdsPromise,
  ]);

  const prefsByPartner = new Map(deliveryPrefsMap);
  if (aliasIds.length) {
    const local = deliveryPrefsMap.get("local-partner") || [];
    for (const id of aliasIds) {
      if (!(prefsByPartner.get(id) || []).length) prefsByPartner.set(id, local);
    }
  }
  const extrasPrefsByPartner = new Map<string, PartnerExtraPref[]>(extraPrefsMap);
  if (expiredIds.size) cars = cars.filter((car) => !expiredIds.has(car.id));

  cars = cars.map((car) => {
    const pid = car.partnerId || car.partner?.id || "";
    const prefs = prefsByPartner.get(pid) || [];
    return {
      ...car,
      deliveryPrices: mergeDeliveryPrefsIntoRows(car.deliveryPrices, prefs),
    };
  });

  if (startDate && pickupIata) {
    const pickupAt = new Date(startDate);
    if (!Number.isNaN(pickupAt.getTime())) {
      const minutesUntilPickup = Math.max(0, Math.floor((pickupAt.getTime() - new Date().getTime()) / 60000));
      const dropoffCode = (dropoff || pickupIata).trim();
      const placeMatches = (
        rows: NonNullable<(typeof cars)[number]["deliveryPrices"]>,
        placeCode: string,
      ) => {
        const code = placeCode.toUpperCase();
        const cityIso2 = isCityLocationCode(placeCode)
          ? parseCityLocationCode(placeCode)?.iso2?.toUpperCase()
          : null;
        return (rows ?? []).filter((row) => {
          const loc = row.deliveryLocation;
          if (!loc?.isActive || !loc.airport) return false;
          if (cityIso2) return loc.airport.city?.country?.iso2?.toUpperCase() === cityIso2;
          return loc.airport.iata?.toUpperCase() === code;
        });
      };
      cars = cars.filter((car) => {
        const rows = car.deliveryPrices ?? [];
        const pickupMatching = placeMatches(rows, pickupIata);
        if (!pickupMatching.length) return false;
        if (!pickupMatching.some((row) => meetsBookingLeadTime(row.travelTimeMinutes, minutesUntilPickup))) {
          return false;
        }
        // One-way return must also be offered when dropoff differs from pickup.
        if (dropoffCode && dropoffCode.toUpperCase() !== pickupIata.toUpperCase()) {
          if (!placeMatches(rows, dropoffCode).length) return false;
        }
        return true;
      });
    }
  }

  if (countryIso2) {
    cars = cars.filter((car) =>
      (car.deliveryPrices ?? []).some(
        (row) =>
          row.deliveryLocation?.isActive &&
          row.deliveryLocation.airport?.city?.country?.iso2?.toUpperCase() === countryIso2,
      ),
    );
  }

  if (unavailable.size) cars = cars.filter((car) => !unavailable.has(car.id));
  const periodByCar = periodMap;

  const rentalDays = startDate && endDate ? rentalDayCount(startDate, endDate) : 1;

  const partnerDepositMethods = new Map<string, string[]>();
  const partnerRentPaymentMethods = new Map<string, string[]>();
  try {
    const { resolveCompanySettings } = await import("@/lib/server/partner-company-settings-store");
    const fileSettings = await companyFilesPromise;
    for (const row of fileSettings) {
      partnerDepositMethods.set(row.partnerId, row.settings.depositMethods || []);
      partnerRentPaymentMethods.set(row.partnerId, row.settings.rentPaymentMethods || []);
    }
    const missing = new Map<string, (typeof cars)[number]>();
    for (const car of cars) {
      const pid = car.partner?.id || car.partnerId || "";
      if (pid && !partnerDepositMethods.has(pid) && !missing.has(pid)) missing.set(pid, car);
    }
    await Promise.all(
      [...missing].map(async ([pid, car]) => {
        try {
          const settings = await resolveCompanySettings({
            id: pid,
            companySettings: car.partner?.companySettings,
            companyName: car.partner?.companyName,
          });
          partnerDepositMethods.set(pid, settings.depositMethods || []);
          partnerRentPaymentMethods.set(pid, settings.rentPaymentMethods || []);
        } catch {
          partnerDepositMethods.set(pid, ["Cash"]);
          partnerRentPaymentMethods.set(pid, ["Cash"]);
        }
      }),
    );
  } catch {
    /* partner settings optional */
  }

  let results: SearchResultCar[] = cars.map((car) => {
    const details = parseCarDetails(car.description);
    const depositRaw = details?.deposit != null ? Number(details.deposit) : null;
    const slug = resolveEffectiveCategorySlug(
      {
        make: car.make,
        model: car.model,
        categorySlug: car.categorySlug,
        categoryLabel: car.categorySlug ? categoryLabels.get(car.categorySlug) || null : null,
        description: car.description || "",
      },
      filterCategories,
    );
    const baseDiscount = toNumber(car.discountPercent, 0);
    const periodDiscount = periodByCar.get(car.id) ?? 0;
    const fees = computeTripDeliveryFees({
      rows: car.deliveryPrices,
      pickup: pickupIata,
      dropoff: dropoff || pickupIata,
      rentalDays,
    });
    const partnerId = car.partner?.id || car.partnerId || "";
    const offeredFromPrefs: string[] = [];
    const prefCandidates = [
      partnerId,
      partnerId.startsWith("file-partner-") ? partnerId.replace(/^file-partner-/, "") : "",
      "local-partner",
    ].filter(Boolean);
    for (const pid of prefCandidates) {
      const prefs = extrasPrefsByPartner.get(pid) || [];
      if (!prefs.length) continue;
      for (const pref of prefs) {
        if (!pref.enabled || pref.forbidden) continue;
        if (!partnerExtraPrefAppliesToCar(pref, car.id)) continue;
        offeredFromPrefs.push(pref.extraServiceId);
      }
      break;
    }
    const extraServiceIds = [
      ...new Set([
        ...(car.extras || [])
          .map((row) => String(row.extraServiceId || "").trim())
          .filter(Boolean),
        ...offeredFromPrefs,
      ]),
    ];
    return {
      id: car.id,
      make: car.make,
      model: car.model,
      year: car.year,
      title: car.title,
      seats: car.seats || 5,
      doors: car.doors || 4,
      transmission: String(car.transmission || "AUTOMATIC"),
      fuelType: String(car.fuelType || "PETROL"),
      dailyRateEur: toNumber(car.dailyRateEur, 0),
      discountPercent: mergeListingDiscountPercent(baseDiscount, periodDiscount),
      description: car.description || "",
      categorySlug: slug,
      categoryLabel: slug ? categoryLabels.get(slug) || null : null,
      photos: (car.photos || []).map((p) => p?.url).filter(Boolean) as string[],
      partnerName: car.partner?.companyName || "Partner",
      deliveryFeeEur: fees.totalFeeEur,
      pickupDeliveryFeeEur: fees.pickupFeeEur,
      dropoffDeliveryFeeEur: fees.dropoffFeeEur,
      depositEur: depositRaw != null && Number.isFinite(depositRaw) ? depositRaw : null,
      cardRequired: details?.cardRequired === true,
      depositMethods: partnerDepositMethods.get(partnerId) || ["Cash"],
      rentPaymentMethods: partnerRentPaymentMethods.get(partnerId) || ["Cash"],
      noDepositPaidService:
        details?.noDepositPaidService === true ||
        (details?.franchiseEnabled === true && Number(details?.franchise) > 0),
      extraServiceIds,
      minDriverAge: resolveDriverRequirement(details, "minDriverAge", 18),
      minLicenseYears: resolveDriverRequirement(details, "minLicenseYears", 0),
    };
  });

  // Same slug as the card badge: partner-assigned category first, then admin model mapping.
  const categorySlug = category?.trim() || "";
  if (categorySlug) results = results.filter((car) => car.categorySlug === categorySlug);

  results.sort((a, b) => {
    const da = listingDailyWithDeliveryEur({
      dailyRateEur: a.dailyRateEur,
      days: rentalDays,
      pickupDeliveryFeeEur: a.pickupDeliveryFeeEur,
      dropoffDeliveryFeeEur: a.dropoffDeliveryFeeEur,
      deliveryFeeEur: a.deliveryFeeEur,
      details: parseCarDetails(a.description),
      discountPercent: a.discountPercent,
    }).displayDailyEur;
    const db = listingDailyWithDeliveryEur({
      dailyRateEur: b.dailyRateEur,
      days: rentalDays,
      pickupDeliveryFeeEur: b.pickupDeliveryFeeEur,
      dropoffDeliveryFeeEur: b.dropoffDeliveryFeeEur,
      deliveryFeeEur: b.deliveryFeeEur,
      details: parseCarDetails(b.description),
      discountPercent: b.discountPercent,
    }).displayDailyEur;
    return da - db;
  });

  let filterExtras: Array<{ id: string; slug: string; name: string }> = [];
  let crossBorderFilter: { id: string; name: string } | null = null;
  try {
    const catalog = (await extrasCatalogPromise) ?? [];
    for (const service of catalog) {
      if (!service.isActive || service.isTpl) continue;
      if (isCrossBorderExtra(service)) {
        crossBorderFilter = {
          id: service.id,
          name: localizeExtraName(service.name, service.slug),
        };
        continue;
      }
      filterExtras.push({
        id: service.id,
        slug: service.slug,
        name: localizeExtraName(service.name, service.slug),
      });
    }
    filterExtras.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    filterExtras = [];
    crossBorderFilter = null;
  }

  const [searchOptions, siteDiscountPercent] = await Promise.all([
    searchOptionsPromise,
    siteDiscountPromise,
  ]);

  const emptyMessage = pickupIata
    ? dictionary.common.noCarsDelivery.replace("{airport}", pickupIata)
    : categoryName
      ? dictionary.common.noCarsCategory
      : dictionary.common.noCars;

  return (
    <CarsSearchResults
      cars={results}
      categories={filterCategories}
      extrasCatalog={filterExtras}
      crossBorderFilter={crossBorderFilter}
      searchOptions={searchOptions}
      startDate={startDate || ""}
      endDate={endDate || ""}
      pickup={pickup || ""}
      dropoff={dropoff || pickup || ""}
      pickupAddress={pickupAddress || ""}
      dropoffAddress={dropoffAddress || ""}
      category={category || ""}
      country={countryIso2}
      emptyMessage={emptyMessage}
      siteDiscountPercent={siteDiscountPercent}
    />
  );
}
