import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prismaWhereForMappedModels } from "@/lib/server/category-mapping";
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
    pickupAddress?: string;
    dropoffAddress?: string;
  }>;
}) {
  try {
    const { applyExpiredInsuranceRemoderation } = await import(
      "@/lib/server/car-insurance-expiry"
    );
    await applyExpiredInsuranceRemoderation();
  } catch (error) {
    console.warn("[cars page] insurance expiry", error);
  }

  const { startDate, endDate, pickup, dropoff, category, pickupAddress, dropoffAddress } =
    await searchParams;
  const { locale } = await readPreferences();
  const dictionary = getDictionary(locale);

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
    const { listHomepageCategories } = await import("@/lib/server/homepage-categories-store");
    const allCategories = await listHomepageCategories();
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
      if (homepageCategory) {
        categoryName = homepageCategory.name;
        const mapped = homepageCategory.mappedModels;
        const modelFilter = prismaWhereForMappedModels(mapped);
        if (modelFilter) Object.assign(where, modelFilter);
        else where.id = "__none__";
      } else {
        where.categorySlug = category.trim();
      }
    }
  } catch {
    if (category?.trim()) where.categorySlug = category.trim();
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
    const fileCars = await loadPublicFileSearchCars({ pickup: pickupIata });
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
  let prefsByPartner = new Map<string, import("@/lib/server/partner-delivery-prefs-store").PartnerDeliveryPref[]>();
  try {
    prefsByPartner = await readPartnerDeliveryPrefsMap(partnerIds);
  } catch {
    prefsByPartner = new Map();
  }

  // Also try local-partner alias for file partners
  const aliasIds = partnerIds.filter((id) => id.startsWith("file-partner-"));
  if (aliasIds.length) {
    try {
      const localPrefs = await readPartnerDeliveryPrefsMap(["local-partner"]);
      const local = localPrefs.get("local-partner") || [];
      for (const id of aliasIds) {
        if (!(prefsByPartner.get(id) || []).length) prefsByPartner.set(id, local);
      }
    } catch {
      /* optional */
    }
  }

  const extrasPrefsByPartner = new Map<string, PartnerExtraPref[]>();
  try {
    const ids = new Set(partnerIds);
    for (const pid of partnerIds) {
      if (pid.startsWith("file-partner-")) {
        const stripped = pid.replace(/^file-partner-/, "");
        if (stripped) ids.add(stripped);
      }
      ids.add("local-partner");
    }
    const prefsMap = await readPartnerExtraPrefsMap([...ids]);
    for (const [pid, prefs] of prefsMap) {
      extrasPrefsByPartner.set(pid, prefs);
    }
  } catch {
    /* optional */
  }

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

  if (startDate) {
    const rangeStart = new Date(startDate);
    const rangeEnd = endDate ? new Date(endDate) : new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);
    if (!Number.isNaN(rangeStart.getTime()) && !Number.isNaN(rangeEnd.getTime())) {
      try {
        const { carIdsUnavailableInRange } = await import("@/lib/server/car-availability");
        const unavailable = await carIdsUnavailableInRange(rangeStart, rangeEnd);
        if (unavailable.size) cars = cars.filter((car) => !unavailable.has(car.id));
      } catch {
        /* availability optional */
      }
    }
  }

  let periodByCar = new Map<string, number>();
  try {
    // When search has no dates (category/airport links), still apply discounts active today.
    const discountFrom = startDate || new Date().toISOString();
    const discountTo = endDate || startDate || discountFrom;
    periodByCar = await periodDiscountPercentByCarId(
      discountFrom,
      discountTo,
      cars.map((c) => c.id),
    );
  } catch {
    periodByCar = new Map();
  }

  const rentalDays = startDate && endDate ? rentalDayCount(startDate, endDate) : 1;

  const partnerDepositMethods = new Map<string, string[]>();
  const partnerRentPaymentMethods = new Map<string, string[]>();
  try {
    const { listCompanySettingsFiles, resolveCompanySettings } = await import(
      "@/lib/server/partner-company-settings-store"
    );
    const fileSettings = await listCompanySettingsFiles();
    for (const row of fileSettings) {
      partnerDepositMethods.set(row.partnerId, row.settings.depositMethods || []);
      partnerRentPaymentMethods.set(row.partnerId, row.settings.rentPaymentMethods || []);
    }
    for (const car of cars) {
      const pid = car.partner?.id || car.partnerId || "";
      if (!pid || partnerDepositMethods.has(pid)) continue;
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
    }
  } catch {
    /* partner settings optional */
  }

  const results: SearchResultCar[] = cars.map((car) => {
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
    const catalog = await listExtraServices({ activeOnly: true });
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

  let searchOptions: Awaited<ReturnType<typeof getSearchDeliveryAirports>> = [];
  try {
    searchOptions = await getSearchDeliveryAirports();
  } catch {
    searchOptions = [];
  }

  let siteDiscountPercent = 0;
  try {
    const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
    const settings = await getPlatformSettings();
    siteDiscountPercent = clampSiteDiscountPercent(settings.siteDiscountPercent, settings.depositPercent);
  } catch {
    siteDiscountPercent = 0;
  }

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
      emptyMessage={emptyMessage}
      siteDiscountPercent={siteDiscountPercent}
    />
  );
}
