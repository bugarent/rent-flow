import "server-only";

import { prisma } from "@/lib/prisma";
import { parseCarDetails, type CarDetailsBlob } from "@/lib/cars/car-details";
import { isValidRegistrationNumber, normalizeRegistrationNumber } from "@/lib/cars/registration-number";
import { createFileCar, updateFileCar } from "@/lib/server/partner-cars-store";
import type { PartnerApiOwner } from "@/lib/server/partner-api-keys-store";
import type { PartnerOwnedCar } from "@/lib/server/partner-owned-cars";
import type { ApiAvailabilityBlock } from "@/lib/server/partner-api-availability-store";

export class ApiInputError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const MAX_BLOCKS = 500;
const MAX_RANGE_MS = 400 * 86_400_000;

export function serializeVehicle(car: PartnerOwnedCar) {
  const tiers = Array.isArray(car.details?.pricingTiers) ? car.details!.pricingTiers : [];
  return {
    id: car.id,
    external_id: car.externalId || null,
    make: car.make,
    model: car.model,
    year: car.year,
    registration_number: car.registrationNumber || null,
    status: car.status,
    daily_rate_eur: car.dailyRateEur,
    deposit_eur: Number(car.details?.deposit) || 0,
    rate_tiers: tiers.map((t) => ({
      from_days: Number(t.fromDays) || 1,
      to_days: Number(t.toDays) >= 9999 ? null : Number(t.toDays) || null,
      price_eur: Number(t.priceEur) || 0,
    })),
  };
}

/** `YYYY-MM-DD` means a whole day; full ISO timestamps are used as given. */
function parseApiDate(raw: unknown, endOfDay: boolean) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAvailabilityBlocks(body: unknown): ApiAvailabilityBlock[] {
  const raw = (body as { blocked?: unknown } | null)?.blocked;
  if (!Array.isArray(raw)) {
    throw new ApiInputError("invalid_body", "Send { \"blocked\": [{ \"start_date\", \"end_date\" }] }. An empty list frees all dates.");
  }
  if (raw.length > MAX_BLOCKS) throw new ApiInputError("too_many_blocks", `At most ${MAX_BLOCKS} ranges per request.`);
  return raw.map((item, index) => {
    const row = (item || {}) as { start_date?: unknown; end_date?: unknown; reference?: unknown };
    const start = parseApiDate(row.start_date, false);
    const end = parseApiDate(row.end_date, true);
    if (!start || !end || end <= start) {
      throw new ApiInputError("invalid_range", `blocked[${index}]: start_date must be before end_date.`);
    }
    if (end.getTime() - start.getTime() > MAX_RANGE_MS) {
      throw new ApiInputError("invalid_range", `blocked[${index}]: a single range can be at most 400 days.`);
    }
    const reference = String(row.reference ?? "").trim().slice(0, 120);
    return { start: start.toISOString(), end: end.toISOString(), ...(reference ? { reference } : {}) };
  });
}

function withDetails(description: string, patch: Partial<CarDetailsBlob>) {
  const details = { ...(parseCarDetails(description) || {}), ...patch };
  const blob = `<!--car-details:${JSON.stringify(details)}-->`;
  if (/<!--car-details:[\s\S]*?-->/.test(description)) {
    return description.replace(/<!--car-details:[\s\S]*?-->/, blob);
  }
  return `${description}${description ? "\n" : ""}${blob}`;
}

function positiveMoney(raw: unknown, field: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000) {
    throw new ApiInputError("invalid_price", `${field} must be a positive number in EUR.`);
  }
  return Math.round(n * 100) / 100;
}

type RatesInput = {
  daily_rate_eur?: unknown;
  deposit_eur?: unknown;
  rate_tiers?: unknown;
};

export function parseRates(body: unknown) {
  const input = (body || {}) as RatesInput;
  const tiersRaw = input.rate_tiers;
  const hasTiers = Array.isArray(tiersRaw) && tiersRaw.length > 0;
  if (input.daily_rate_eur == null && !hasTiers && input.deposit_eur == null) {
    throw new ApiInputError("invalid_body", "Send daily_rate_eur, rate_tiers or deposit_eur.");
  }
  let tiers: Array<{ fromDays: number; toDays: number; priceEur: string }> | null = null;
  if (hasTiers) {
    const rows = (tiersRaw as unknown[]).slice(0, 12).map((item, index) => {
      const row = (item || {}) as { from_days?: unknown; to_days?: unknown; price_eur?: unknown };
      const fromDays = Math.trunc(Number(row.from_days));
      const toDays = row.to_days == null ? 9999 : Math.trunc(Number(row.to_days));
      if (!Number.isFinite(fromDays) || fromDays < 1 || !Number.isFinite(toDays) || toDays < fromDays) {
        throw new ApiInputError("invalid_tier", `rate_tiers[${index}]: from_days must be ≥ 1 and ≤ to_days.`);
      }
      return { fromDays, toDays, priceEur: String(positiveMoney(row.price_eur, `rate_tiers[${index}].price_eur`)) };
    });
    tiers = rows.sort((a, b) => a.fromDays - b.fromDays);
  }
  const daily =
    input.daily_rate_eur != null
      ? positiveMoney(input.daily_rate_eur, "daily_rate_eur")
      : tiers
        ? Number(tiers[0].priceEur)
        : null;
  const deposit =
    input.deposit_eur != null
      ? (() => {
          const n = Number(input.deposit_eur);
          if (!Number.isFinite(n) || n < 0 || n > 100_000) {
            throw new ApiInputError("invalid_price", "deposit_eur must be 0 or a positive number.");
          }
          return Math.round(n * 100) / 100;
        })()
      : null;
  return { daily, tiers, deposit };
}

/** Rate pushes do not send the car back to moderation; customers see the new price right away. */
export async function applyRates(car: PartnerOwnedCar, rates: ReturnType<typeof parseRates>) {
  const patch: Partial<CarDetailsBlob> = {};
  if (rates.tiers) patch.pricingTiers = rates.tiers;
  if (rates.deposit != null) patch.deposit = String(rates.deposit);
  const description = Object.keys(patch).length ? withDetails(car.description, patch) : car.description;
  const dailyRateEur = rates.daily ?? car.dailyRateEur;

  if (car.source === "db") {
    await prisma.car.update({ where: { id: car.id }, data: { dailyRateEur, description } });
  } else {
    await updateFileCar(car.id, { dailyRateEur, description });
  }

  const { readPublishedCarSnapshot, ensurePublishedCarSnapshot } = await import("@/lib/server/car-published-store");
  const snapshot = await readPublishedCarSnapshot(car.id);
  if (snapshot && car.status === "PENDING_REMODERATION") {
    await ensurePublishedCarSnapshot(
      car.id,
      {
        ...snapshot,
        dailyRateEur,
        description: Object.keys(patch).length ? withDetails(snapshot.description, patch) : snapshot.description,
      },
      { replace: true },
    );
  }

  const { clearPublicCarCache } = await import("@/lib/server/public-car-payload");
  clearPublicCarCache(car.id);
  const { clearAvailabilityCache } = await import("@/lib/server/cache/availability-cache");
  await clearAvailabilityCache();

  return {
    ...car,
    dailyRateEur,
    description,
    details: parseCarDetails(description),
  } satisfies PartnerOwnedCar;
}

type CreateInput = {
  external_id?: unknown;
  make?: unknown;
  model?: unknown;
  year?: unknown;
  registration_number?: unknown;
  seats?: unknown;
  doors?: unknown;
  transmission?: unknown;
  fuel_type?: unknown;
  daily_rate_eur?: unknown;
  deposit_eur?: unknown;
};

/** API-created vehicles start as DRAFT; the partner adds photos and documents in the portal. */
export async function createDraftVehicle(owner: PartnerApiOwner, body: unknown, existing: PartnerOwnedCar[]) {
  const input = (body || {}) as CreateInput;
  const make = String(input.make ?? "").trim().slice(0, 60);
  const model = String(input.model ?? "").trim().slice(0, 60);
  const year = Math.trunc(Number(input.year));
  const thisYear = new Date().getFullYear();
  if (!make || !model) throw new ApiInputError("invalid_body", "make and model are required.");
  if (!Number.isFinite(year) || year < 1990 || year > thisYear + 1) {
    throw new ApiInputError("invalid_year", `year must be between 1990 and ${thisYear + 1}.`);
  }
  const externalId = String(input.external_id ?? "").trim().slice(0, 120);
  if (externalId && existing.some((car) => car.externalId === externalId)) {
    throw new ApiInputError("duplicate_external_id", "A vehicle with this external_id already exists.", 409);
  }

  const plate = normalizeRegistrationNumber(String(input.registration_number ?? ""));
  if (plate) {
    if (!isValidRegistrationNumber(plate)) {
      throw new ApiInputError("invalid_registration", "registration_number must use Latin letters and digits only.");
    }
    const { assertRegistrationAvailable } = await import("@/lib/server/assert-registration-available");
    const check = await assertRegistrationAvailable(plate);
    if (!check.ok) throw new ApiInputError("plate_taken", "This registration number is already registered.", 409);
  }

  const daily = input.daily_rate_eur != null ? positiveMoney(input.daily_rate_eur, "daily_rate_eur") : 0;
  const deposit = Number(input.deposit_eur);
  const transmission = String(input.transmission || "").toUpperCase() === "MANUAL" ? "MANUAL" : "AUTOMATIC";
  const fuelRaw = String(input.fuel_type || "PETROL").toUpperCase();
  const fuelType = ["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "LPG"].includes(fuelRaw) ? fuelRaw : "PETROL";
  const seats = Math.trunc(Number(input.seats));
  const doors = Math.trunc(Number(input.doors));

  let categorySlug: string | null = null;
  try {
    const { resolveCategorySlugForCar } = await import("@/lib/server/category-mapping");
    categorySlug = (await resolveCategorySlugForCar(make, model)) || null;
  } catch {
    categorySlug = null;
  }

  const details: CarDetailsBlob = {
    ...(externalId ? { externalId } : {}),
    ...(plate ? { plate } : {}),
    ...(Number.isFinite(deposit) && deposit >= 0 ? { deposit: String(Math.round(deposit * 100) / 100) } : {}),
    ...(daily > 0 ? { pricingTiers: [{ fromDays: 1, toDays: 9999, priceEur: String(daily) }] } : {}),
    source: "partner-api",
  };

  const car = await createFileCar({
    partnerId: owner.partnerId,
    partnerUserId: owner.userId,
    partnerEmail: owner.email || undefined,
    title: `${make} ${model} ${year}`,
    make,
    model,
    year,
    description: `<!--car-details:${JSON.stringify(details)}-->`,
    dailyRateEur: daily,
    seats: seats >= 1 && seats <= 60 ? seats : 5,
    doors: doors >= 1 && doors <= 6 ? doors : 4,
    transmission,
    fuelType,
    status: "DRAFT",
    registrationNumber: plate || null,
    categorySlug,
    photos: [],
    extras: [],
    deliveryPrices: [],
  });

  return {
    id: car.id,
    source: "file",
    make: car.make,
    model: car.model,
    year: car.year,
    title: car.title,
    registrationNumber: car.registrationNumber || "",
    status: car.status,
    dailyRateEur: car.dailyRateEur,
    description: car.description,
    details,
    externalId,
  } satisfies PartnerOwnedCar;
}
