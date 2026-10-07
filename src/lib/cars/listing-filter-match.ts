import type { MappedCarModel } from "@/lib/catalog/car-models";
import { carMatchesMappedModels } from "@/lib/cars/category-mapping";
import { parseCarDetails } from "@/lib/cars/car-details";
import { listingDailyWithDeliveryEur } from "@/lib/cars/reserve-pricing";

/** Cars at most 6 years old: year >= currentYear - 6 (e.g. 2026 → 2020+). */
export function newCarsMinYear(now = new Date()): number {
  return now.getFullYear() - 6;
}

/** Shape needed for search listing filters (client + server). */
export type FilterableListing = {
  make: string;
  model: string;
  year: number;
  title: string;
  seats: number;
  transmission: string;
  fuelType: string;
  dailyRateEur: number;
  discountPercent: number;
  description: string;
  categorySlug: string | null;
  categoryLabel: string | null;
  depositEur: number | null;
  deliveryFeeEur?: number;
  pickupDeliveryFeeEur?: number;
  dropoffDeliveryFeeEur?: number;
  /** From car-details.cardRequired */
  cardRequired?: boolean;
  /** Partner company deposit retention methods (Cash, Visa credit, …) */
  depositMethods?: string[];
  /** Partner rent payment methods (Cash, Visa, …) */
  rentPaymentMethods?: string[];
  /** Paid deposit-waiver / franchise-style option */
  noDepositPaidService?: boolean;
  /** Extra service ids enabled on this listing */
  extraServiceIds?: string[];
  /** Minimum renter age required by the listing */
  minDriverAge?: number;
  /** Minimum years the renter must have held a license */
  minLicenseYears?: number;
};

export type ListingFilterCategory = {
  slug: string;
  name: string;
  imageUrl?: string;
  mappedModels?: MappedCarModel[];
};

export type DepositFilterOption = "none" | "nonePaid" | "cash" | "creditCard";
export type RentPaymentFilterOption = "cash" | "card";
export type DriveFilterOption = "2wd" | "4x4";

export type ListingFilterState = {
  query?: string;
  brand?: string;
  categories?: Set<string> | string[];
  transmission?: Set<"AUTOMATIC" | "MANUAL"> | Array<"AUTOMATIC" | "MANUAL">;
  fuel?: Set<string> | string[];
  /** @deprecated use depositOptions */
  noDeposit?: boolean;
  depositOptions?: Set<DepositFilterOption> | DepositFilterOption[];
  rentPaymentOptions?: Set<RentPaymentFilterOption> | RentPaymentFilterOption[];
  /** Exact seat counts (multi-select). Legacy single "N+" still accepted via seats. */
  seatOptions?: Set<string> | string[];
  /** @deprecated use seatOptions for exact multi-select */
  seats?: string;
  driveOptions?: Set<DriveFilterOption> | DriveFilterOption[];
  yearFrom?: string;
  priceMin?: string;
  priceMax?: string;
  /** Renter's age — listing must allow this age (minDriverAge <= value) */
  driverAge?: string;
  /** Renter's license years — listing must allow this (minLicenseYears <= value) */
  licenseYears?: string;
  /** Extra service ids the listing must offer (AND) */
  extraOptions?: Set<string> | string[];
  /** Only listings whose pickup + return delivery costs nothing for this trip */
  freeDelivery?: boolean;
  /** Quick chips that also map to listing fields */
  new2020?: boolean;
  familySuv?: boolean;
  awd?: boolean;
  premium?: boolean;
};

function asSet<T extends string>(value: Set<T> | T[] | undefined): Set<T> {
  if (!value) return new Set();
  return value instanceof Set ? value : new Set(value);
}

export function normalizeTransmission(raw: string | null | undefined): "AUTOMATIC" | "MANUAL" {
  const u = String(raw || "").toUpperCase();
  if (
    u.includes("MANUAL") ||
    u.includes("MECHANIC") ||
    u.includes("მექანიკ") ||
    u.includes("МЕХАН")
  ) {
    return "MANUAL";
  }
  return "AUTOMATIC";
}

export function normalizeFuel(
  raw: string | null | undefined,
): "PETROL" | "DIESEL" | "HYBRID" | "ELECTRIC" | "OTHER" {
  const u = String(raw || "").toUpperCase();
  if (u.includes("HYBRID") || u.includes("ჰიბრიდ") || u.includes("ГИБРИД")) return "HYBRID";
  if (u.includes("ELECTRIC") || u === "EV" || u.includes("ელექტრო") || u.includes("ЭЛЕКТР"))
    return "ELECTRIC";
  if (u.includes("DIESEL") || u.includes("დიზელ") || u.includes("ДИЗЕЛ")) return "DIESEL";
  if (
    u.includes("PETROL") ||
    u.includes("GASOLINE") ||
    u.includes("BENZIN") ||
    u.includes("ბენზინ") ||
    u.includes("БЕНЗИН") ||
    u.includes("LPG")
  ) {
    return "PETROL";
  }
  return "OTHER";
}

export function listingDepositEur(car: FilterableListing): number | null {
  if (car.depositEur != null && Number.isFinite(car.depositEur)) return car.depositEur;
  const details = parseCarDetails(car.description);
  if (details?.deposit == null || details.deposit === "") return null;
  const n = Number(details.deposit);
  return Number.isFinite(n) ? n : null;
}

export function listingHasCashDeposit(car: FilterableListing): boolean {
  const methods = car.depositMethods ?? [];
  if (!methods.length) return true;
  return methods.some((m) => /cash|ნაღდ/i.test(m));
}

export function listingHasCreditCardDeposit(car: FilterableListing): boolean {
  const details = parseCarDetails(car.description);
  if (car.cardRequired || details?.cardRequired === true) return true;
  const methods = car.depositMethods ?? [];
  return methods.some((m) => /credit|visa|master|amex|american express|mir|unionpay|საკრედიტ/i.test(m));
}

export function listingHasNoDepositPaidService(car: FilterableListing): boolean {
  const details = parseCarDetails(car.description);
  if (car.noDepositPaidService || details?.noDepositPaidService === true) return true;
  // Franchise / deductible as paid alternative when deposit is zero.
  const deposit = listingDepositEur(car);
  if (deposit == null || deposit > 0) return false;
  return details?.franchiseEnabled === true && Number(details?.franchise) > 0;
}

export function listingMatchesDepositOptions(
  car: FilterableListing,
  selected: Set<DepositFilterOption> | DepositFilterOption[] | undefined,
  legacyNoDeposit?: boolean,
): boolean {
  const opts = asSet(selected);
  if (legacyNoDeposit) opts.add("none");
  if (!opts.size) return true;

  const deposit = listingDepositEur(car);
  const zero = deposit != null && deposit <= 0;

  if (opts.has("none") && zero) return true;
  if (opts.has("nonePaid") && zero && listingHasNoDepositPaidService(car)) return true;
  if (opts.has("cash") && listingHasCashDeposit(car)) return true;
  if (opts.has("creditCard") && listingHasCreditCardDeposit(car)) return true;
  return false;
}

export function listingHasCashRentPayment(car: FilterableListing): boolean {
  const methods = car.rentPaymentMethods ?? [];
  if (!methods.length) return true;
  return methods.some((m) => /cash|ნაღდ/i.test(m));
}

export function listingHasCardRentPayment(car: FilterableListing): boolean {
  const methods = car.rentPaymentMethods ?? [];
  if (!methods.length) return true;
  return methods.some((m) =>
    /card|visa|master|amex|american express|mir|unionpay|ბარათ/i.test(m),
  );
}

export function listingMatchesRentPaymentOptions(
  car: FilterableListing,
  selected: Set<RentPaymentFilterOption> | RentPaymentFilterOption[] | undefined,
): boolean {
  const opts = asSet(selected);
  if (!opts.size) return true;
  if (opts.has("cash") && listingHasCashRentPayment(car)) return true;
  if (opts.has("card") && listingHasCardRentPayment(car)) return true;
  return false;
}

/**
 * Resolve the category a listing belongs to, in order:
 * 1) stored categorySlug
 * 2) categorySlug / bodyType inside car-details (partner form)
 * 3) admin mapped make+model
 */
export function resolveEffectiveCategorySlug(
  car: Pick<FilterableListing, "make" | "model" | "categorySlug" | "categoryLabel" | "description">,
  categories: ListingFilterCategory[],
): string | null {
  if (!categories.length) return car.categorySlug || null;

  const bySlug = (value: string | null | undefined) => {
    const v = String(value || "").trim();
    if (!v) return null;
    const lower = v.toLowerCase();
    return categories.find((c) => c.slug === v || c.slug.toLowerCase() === lower)?.slug ?? null;
  };

  const byName = (value: string | null | undefined) => {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return null;
    return categories.find((c) => c.name.trim().toLowerCase() === v)?.slug ?? null;
  };

  const fromStored = bySlug(car.categorySlug);
  if (fromStored) return fromStored;

  const details = parseCarDetails(car.description);
  const detailSlug = bySlug(
    typeof details?.categorySlug === "string" ? details.categorySlug : null,
  );
  if (detailSlug) return detailSlug;

  // Partner form stores category name in bodyType after the rename.
  const fromBodyType =
    bySlug(typeof details?.bodyType === "string" ? details.bodyType : null) ||
    byName(typeof details?.bodyType === "string" ? details.bodyType : null);
  if (fromBodyType) return fromBodyType;

  const fromLabel = byName(car.categoryLabel);
  if (fromLabel) return fromLabel;

  for (const category of categories) {
    const mapped = category.mappedModels ?? [];
    if (mapped.length && carMatchesMappedModels(car.make, car.model, mapped)) {
      return category.slug;
    }
  }

  // Legacy body styles (SUV/Van/...) only — not Sedan, which is too ambiguous.
  const bodyRaw = String(details?.bodyType || "").trim().toLowerCase();
  if (bodyRaw) {
    if (/^(suv|4x4|crossover)$/.test(bodyRaw)) {
      const suv = categories.find(
        (c) => /suv|4x4/.test(c.slug.toLowerCase()) || /suv|4x4/.test(c.name.toLowerCase()),
      );
      if (suv) return suv.slug;
    }
    if (/^(van|minivan|mpv)$/.test(bodyRaw)) {
      const van = categories.find(
        (c) =>
          /van|minivan|mpv/.test(c.slug.toLowerCase()) ||
          /van|minivan|ფურგონ/.test(c.name.toLowerCase()),
      );
      if (van) return van.slug;
    }
    if (/^(camper|motorhome|rv)$/.test(bodyRaw)) {
      const camper = categories.find(
        (c) => /camper|rv/.test(c.slug.toLowerCase()) || /camper/.test(c.name.toLowerCase()),
      );
      if (camper) return camper.slug;
    }
    if (/^(convertible|cabriolet|cabrio)$/.test(bodyRaw)) {
      const conv = categories.find(
        (c) =>
          /convert|cabrio/.test(c.slug.toLowerCase()) ||
          /convert|cabrio|კაბრიო/.test(c.name.toLowerCase()),
      );
      if (conv) return conv.slug;
    }
  }

  return car.categorySlug || null;
}

export function listingMatchesCategory(
  car: FilterableListing,
  category: ListingFilterCategory,
  allCategories: ListingFilterCategory[] = [category],
): boolean {
  const effective = resolveEffectiveCategorySlug(car, allCategories);
  if (effective && effective === category.slug) return true;
  if (car.categorySlug && car.categorySlug === category.slug) return true;
  const label = (car.categoryLabel || "").trim().toLowerCase();
  if (label && label === category.name.trim().toLowerCase()) return true;
  const mapped = category.mappedModels ?? [];
  if (mapped.length && carMatchesMappedModels(car.make, car.model, mapped)) return true;
  return false;
}

export function listingMatchesAnyCategory(
  car: FilterableListing,
  selectedSlugs: Set<string>,
  categories: ListingFilterCategory[],
): boolean {
  if (!selectedSlugs.size) return true;
  const effective = resolveEffectiveCategorySlug(car, categories);
  if (effective && selectedSlugs.has(effective)) return true;
  for (const cat of categories) {
    if (!selectedSlugs.has(cat.slug)) continue;
    if (listingMatchesCategory(car, cat, categories)) return true;
  }
  return false;
}

function isFamilySuv(car: FilterableListing) {
  const slug = (car.categorySlug || "").toLowerCase();
  const label = (car.categoryLabel || "").toLowerCase();
  const title = `${car.make} ${car.model} ${car.title}`.toLowerCase();
  return (
    slug.includes("suv") ||
    slug.includes("family") ||
    label.includes("suv") ||
    title.includes("suv") ||
    car.seats >= 7
  );
}

export function isAwd(car: FilterableListing) {
  return resolveListingDrive(car) === "4x4";
}

/** Normalize partner drive field + listing text into 2WD vs 4x4. */
export function resolveListingDrive(car: FilterableListing): DriveFilterOption {
  const details = parseCarDetails(car.description);
  const drive = String(details?.drive || "").trim().toLowerCase();
  if (drive === "2wd" || drive === "fwd" || drive === "rwd" || drive.includes("2wd")) {
    return "2wd";
  }
  if (
    drive === "4x4" ||
    drive === "awd" ||
    drive === "4wd" ||
    drive.includes("4x4") ||
    drive.includes("awd") ||
    drive.includes("4wd")
  ) {
    return "4x4";
  }
  const blob =
    `${car.categorySlug || ""} ${car.categoryLabel || ""} ${car.title} ${car.description}`.toLowerCase();
  if (/4x4|awd|4wd|all.?wheel/.test(blob)) return "4x4";
  return "2wd";
}

export function listingMatchesDriveOptions(
  car: FilterableListing,
  driveOptions: Set<DriveFilterOption> | DriveFilterOption[] | undefined,
  awdQuick?: boolean,
): boolean {
  const selected = asSet(driveOptions);
  if (awdQuick) selected.add("4x4");
  if (!selected.size) return true;
  return selected.has(resolveListingDrive(car));
}

export function resolveMinDriverAge(car: FilterableListing): number {
  if (car.minDriverAge != null && Number.isFinite(car.minDriverAge) && car.minDriverAge > 0) {
    return Math.floor(car.minDriverAge);
  }
  const details = parseCarDetails(car.description);
  const n = Number(details?.minDriverAge);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 18;
}

export function resolveMinLicenseYears(car: FilterableListing): number {
  if (car.minLicenseYears != null && Number.isFinite(car.minLicenseYears) && car.minLicenseYears >= 0) {
    return Math.floor(car.minLicenseYears);
  }
  const details = parseCarDetails(car.description);
  const n = Number(details?.minLicenseYears);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return 0;
}

export function listingMatchesDriverAge(car: FilterableListing, driverAge?: string): boolean {
  const raw = String(driverAge || "").trim();
  if (!raw) return true;
  const age = Number(raw);
  if (!Number.isFinite(age) || age <= 0) return true;
  return resolveMinDriverAge(car) <= age;
}

export function listingMatchesLicenseYears(car: FilterableListing, licenseYears?: string): boolean {
  const raw = String(licenseYears || "").trim();
  if (!raw) return true;
  const years = Number(raw);
  if (!Number.isFinite(years) || years < 0) return true;
  return resolveMinLicenseYears(car) <= years;
}

export function listingMatchesExtraOptions(
  car: FilterableListing,
  extraOptions: Set<string> | string[] | undefined,
): boolean {
  const selected = asSet(extraOptions);
  if (!selected.size) return true;
  const have = new Set((car.extraServiceIds || []).map(String));
  for (const id of selected) {
    if (!have.has(id)) return false;
  }
  return true;
}

export function listingMatchesSeatOptions(
  car: FilterableListing,
  seatOptions: Set<string> | string[] | undefined,
  legacySeatsMin?: string,
): boolean {
  const selected = asSet(seatOptions);
  if (selected.size) {
    return selected.has(String(car.seats || 0));
  }
  if (legacySeatsMin) {
    const n = Number(legacySeatsMin);
    if (n > 0 && car.seats < n) return false;
  }
  return true;
}

function isPremium(car: FilterableListing) {
  const blob = `${car.categorySlug || ""} ${car.categoryLabel || ""}`.toLowerCase();
  return /premium|luxury|ლუქს|პრემიუმ/.test(blob) || car.dailyRateEur >= 80;
}

/** Returns true when the listing matches every active filter dimension. */
export function listingMatchesFilters(
  car: FilterableListing,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): boolean {
  const q = String(filters.query || "").trim().toLowerCase();
  if (q) {
    const hay = `${car.make} ${car.model} ${car.title} ${car.year}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const wantBrand = String(filters.brand || "").trim().toLowerCase();
  if (wantBrand && String(car.make || "").trim().toLowerCase() !== wantBrand) return false;

  const selectedCategories = asSet(filters.categories);
  if (selectedCategories.size && !listingMatchesAnyCategory(car, selectedCategories, categories)) {
    return false;
  }

  const transmissions = asSet(filters.transmission);
  if (transmissions.size) {
    const t = normalizeTransmission(car.transmission);
    if (!transmissions.has(t)) return false;
  }

  const fuels = asSet(filters.fuel);
  if (fuels.size) {
    const f = normalizeFuel(car.fuelType);
    if (!fuels.has(f)) return false;
  }

  if (!listingMatchesDepositOptions(car, filters.depositOptions, filters.noDeposit)) {
    return false;
  }

  if (!listingMatchesRentPaymentOptions(car, filters.rentPaymentOptions)) {
    return false;
  }

  if (!listingMatchesSeatOptions(car, filters.seatOptions, filters.seats)) {
    return false;
  }

  if (!listingMatchesDriveOptions(car, filters.driveOptions, filters.awd)) {
    return false;
  }

  if (!listingMatchesDriverAge(car, filters.driverAge)) {
    return false;
  }

  if (!listingMatchesLicenseYears(car, filters.licenseYears)) {
    return false;
  }

  if (!listingMatchesExtraOptions(car, filters.extraOptions)) {
    return false;
  }

  if (filters.yearFrom) {
    const y = Number(filters.yearFrom);
    if (y > 0 && car.year < y) return false;
  }

  const priced = listingDailyWithDeliveryEur({
    dailyRateEur: car.dailyRateEur,
    days,
    pickupDeliveryFeeEur: car.pickupDeliveryFeeEur,
    dropoffDeliveryFeeEur: car.dropoffDeliveryFeeEur,
    deliveryFeeEur: car.deliveryFeeEur,
    details: parseCarDetails(car.description),
    discountPercent: car.discountPercent,
  });
  if (filters.freeDelivery && priced.deliveryFeeEur > 0) return false;
  const daily = priced.displayDailyEur;
  const min = filters.priceMin?.trim() ? Number(filters.priceMin) : null;
  const max = filters.priceMax?.trim() ? Number(filters.priceMax) : null;
  if (min != null && Number.isFinite(min) && daily < min) return false;
  if (max != null && Number.isFinite(max) && daily > max) return false;

  if (filters.new2020 && car.year < newCarsMinYear()) return false;
  if (filters.familySuv && !isFamilySuv(car)) return false;
  if (filters.premium && !isPremium(car)) return false;

  return true;
}

export function filterListings<T extends FilterableListing>(
  cars: T[],
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): T[] {
  return cars.filter((car) => listingMatchesFilters(car, filters, categories, days));
}

/** Count cars for one category while respecting other active filters. */
export function countListingsForCategory<T extends FilterableListing>(
  cars: T[],
  categorySlug: string,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  const next: ListingFilterState = {
    ...filters,
    categories: new Set([categorySlug]),
  };
  return filterListings(cars, next, categories, days).length;
}

export function countListingsForTransmission<T extends FilterableListing>(
  cars: T[],
  value: "AUTOMATIC" | "MANUAL",
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, transmission: new Set([value]) },
    categories,
    days,
  ).length;
}

export function countListingsForFuel<T extends FilterableListing>(
  cars: T[],
  value: string,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(cars, { ...filters, fuel: new Set([value]) }, categories, days).length;
}

export function countListingsForDeposit<T extends FilterableListing>(
  cars: T[],
  value: DepositFilterOption,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, noDeposit: false, depositOptions: new Set([value]) },
    categories,
    days,
  ).length;
}

export function countListingsForFreeDelivery<T extends FilterableListing>(
  cars: T[],
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(cars, { ...filters, freeDelivery: true }, categories, days).length;
}

export function countListingsForRentPayment<T extends FilterableListing>(
  cars: T[],
  value: RentPaymentFilterOption,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, rentPaymentOptions: new Set([value]) },
    categories,
    days,
  ).length;
}

export function countListingsForBrand<T extends FilterableListing>(
  cars: T[],
  brand: string,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(cars, { ...filters, brand }, categories, days).length;
}

export function countListingsForDrive<T extends FilterableListing>(
  cars: T[],
  value: DriveFilterOption,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, awd: false, driveOptions: new Set([value]) },
    categories,
    days,
  ).length;
}

export function countListingsForSeats<T extends FilterableListing>(
  cars: T[],
  seatCount: string,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, seats: undefined, seatOptions: new Set([seatCount]) },
    categories,
    days,
  ).length;
}

export function countListingsForExtra<T extends FilterableListing>(
  cars: T[],
  extraServiceId: string,
  filters: ListingFilterState,
  categories: ListingFilterCategory[],
  days: number,
): number {
  return filterListings(
    cars,
    { ...filters, extraOptions: new Set([extraServiceId]) },
    categories,
    days,
  ).length;
}

/** Unique partner listing makes for the brand filter dropdown. */
export function uniqueListingBrands(cars: Array<Pick<FilterableListing, "make">>): string[] {
  const set = new Set<string>();
  for (const car of cars) {
    const make = String(car.make || "").trim();
    if (make) set.add(make);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
