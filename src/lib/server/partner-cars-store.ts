import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeLogin } from "@/lib/crypto";
import { normalizeRegistrationNumber } from "@/lib/cars/registration-number";
import { bodyTypeFromCarDescription, countriesFromCarDescription } from "@/lib/cars/listing-meta";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "partner-cars.json");

export type FileCarStatus =
  | "PENDING"
  | "DRAFT"
  | "APPROVED"
  | "REJECTED"
  | "PENDING_REMODERATION"
  | "HIDDEN";

export type FileCarDeliveryPrice = {
  deliveryLocationId: string;
  priceEur: number;
  freeAfterDays: number | null;
  travelTimeMinutes: number;
};

export type FileCarExtra = {
  extraServiceId: string;
  priceEur: number;
  /** Shown as red “not allowed” notice on customer checkout (not purchasable). */
  forbidden?: boolean;
};

export type FileCarListing = {
  id: string;
  partnerId: string;
  partnerUserId: string;
  partnerEmail?: string;
  partnerName?: string;
  title: string;
  make: string;
  model: string;
  year: number;
  description: string;
  dailyRateEur: number;
  seats: number;
  doors: number;
  transmission: string;
  fuelType: string;
  status: FileCarStatus;
  hiddenReason?: string | null;
  registrationNumber: string | null;
  categorySlug: string | null;
  photos: string[];
  passportFrontUrl?: string | null;
  passportBackUrl?: string | null;
  extras?: FileCarExtra[];
  deliveryPrices?: FileCarDeliveryPrice[];
  createdAt: string;
  updatedAt: string;
};

type StoreFile = {
  cars: FileCarListing[];
};

function emptyStore(): StoreFile {
  return { cars: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      cars: Array.isArray(parsed.cars)
        ? (parsed.cars as FileCarListing[]).map((car) => ({
            ...car,
            photos: Array.isArray(car.photos) ? car.photos.map(String).filter(Boolean) : [],
            extras: Array.isArray(car.extras) ? car.extras : [],
            deliveryPrices: Array.isArray(car.deliveryPrices) ? car.deliveryPrices : [],
          }))
        : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listFileCars(): Promise<FileCarListing[]> {
  const store = await readStore();
  return [...store.cars].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getFileCar(id: string): Promise<FileCarListing | null> {
  const store = await readStore();
  return store.cars.find((c) => c.id === id) ?? null;
}

export async function listFileCarsForPartner(opts: {
  userId?: string;
  email?: string | null;
  partnerId?: string;
}): Promise<FileCarListing[]> {
  const email = normalizeLogin(opts.email || "");
  const partnerIds = new Set<string>();
  const userIds = new Set<string>();
  const addIds = (raw?: string) => {
    if (!raw) return;
    partnerIds.add(raw);
    partnerIds.add(`file-partner-${raw}`);
    userIds.add(raw);
  };
  addIds(opts.partnerId);
  addIds(opts.userId);
  if ([...partnerIds].some((id) => id === "local-partner" || id === "file-partner-local-partner")) {
    addIds("local-partner");
  }
  const cars = await listFileCars();
  return cars.filter((c) => {
    if (partnerIds.has(c.partnerId)) return true;
    if (userIds.has(c.partnerUserId)) return true;
    if (email && normalizeLogin(c.partnerEmail || "") === email) return true;
    return false;
  });
}

export async function listFilePendingCars(): Promise<FileCarListing[]> {
  const cars = await listFileCars();
  return cars.filter((c) => c.status === "PENDING" || c.status === "PENDING_REMODERATION");
}

export async function findFileCarByRegistration(
  plate: string,
  opts?: { approvedOnly?: boolean; blockingOnly?: boolean; excludeId?: string },
): Promise<FileCarListing | null> {
  const normalized = normalizeRegistrationNumber(plate);
  if (!normalized) return null;
  const cars = await listFileCars();
  const { parseCarDetails } = await import("@/lib/cars/car-details");
  const { PLATE_BLOCKING_STATUSES } = await import("@/lib/cars/registration-number");
  return (
    cars.find((c) => {
      if (opts?.excludeId && c.id === opts.excludeId) return false;
      if (opts?.approvedOnly && c.status !== "APPROVED") return false;
      if (
        opts?.blockingOnly &&
        !(PLATE_BLOCKING_STATUSES as readonly string[]).includes(String(c.status))
      ) {
        return false;
      }
      const fromField = normalizeRegistrationNumber(c.registrationNumber || "");
      if (fromField === normalized) return true;
      const fromDetails = normalizeRegistrationNumber(
        String(parseCarDetails(c.description)?.plate || ""),
      );
      return fromDetails === normalized;
    }) ?? null
  );
}

export async function createFileCar(
  input: Omit<FileCarListing, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<FileCarListing> {
  const store = await readStore();
  const now = new Date().toISOString();
  const row: FileCarListing = {
    ...input,
    id: input.id || randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  store.cars.unshift(row);
  await writeStore(store);
  return row;
}

export async function updateFileCar(
  id: string,
  patch: Partial<Omit<FileCarListing, "id" | "createdAt">>,
): Promise<FileCarListing | null> {
  const store = await readStore();
  const index = store.cars.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const next: FileCarListing = {
    ...store.cars[index],
    ...patch,
    id,
    createdAt: store.cars[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  store.cars[index] = next;
  await writeStore(store);
  return next;
}

export async function deleteFileCar(id: string): Promise<boolean> {
  const store = await readStore();
  const next = store.cars.filter((c) => c.id !== id);
  if (next.length === store.cars.length) return false;
  store.cars = next;
  await writeStore(store);
  return true;
}

export type AdminPartnerCarRow = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  status: string;
  photoUrl: string | null;
  country: string;
  bodyType: string;
};

export function fileCarToPartnerDetailRow(
  car: FileCarListing,
  extraIso2s: string[] = [],
): AdminPartnerCarRow {
  return {
    id: car.id,
    title: car.title,
    make: car.make,
    model: car.model,
    year: car.year,
    status: car.status,
    photoUrl: car.photos?.[0] ?? null,
    country: countriesFromCarDescription(car.description, extraIso2s),
    bodyType: bodyTypeFromCarDescription(car.description),
  };
}

export async function mergeFileCarsIntoPartnerRows(
  rows: AdminPartnerCarRow[],
  opts: { partnerId?: string; userId?: string; email?: string | null },
): Promise<AdminPartnerCarRow[]> {
  const extra = await listFileCarsForPartner(opts);
  let isoById = new Map<string, string>();
  try {
    const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
    const locations = await listDeliveryLocations({ activeOnly: false });
    isoById = new Map(locations.map((loc) => [loc.id, loc.countryIso2]));
  } catch {
    isoById = new Map();
  }
  const seen = new Set(rows.map((row) => row.id));
  return [
    ...rows,
    ...extra
      .filter((car) => !seen.has(car.id))
      .map((car) =>
        fileCarToPartnerDetailRow(
          car,
          (car.deliveryPrices || []).map((row) => isoById.get(row.deliveryLocationId) || ""),
        ),
      ),
  ];
}

export function isPublicFileCarStatus(status: string) {
  return status === "APPROVED";
}

export function isFileCarOwner(
  car: FileCarListing,
  user?: { id?: string; email?: string | null } | null,
): boolean {
  if (!user?.id && !user?.email) return false;
  if (user.id && car.partnerUserId === user.id) return true;
  const email = normalizeLogin(user.email || "");
  return Boolean(email && normalizeLogin(car.partnerEmail || "") === email);
}

export function fileCarToApiShape(
  car: FileCarListing,
  insuranceUrl?: string | null,
  insuranceExpiresAt?: string | null,
) {
  return {
    id: car.id,
    title: car.title,
    make: car.make,
    model: car.model,
    year: car.year,
    description: car.description,
    dailyRateEur: car.dailyRateEur,
    seats: car.seats,
    doors: car.doors,
    transmission: car.transmission,
    fuelType: car.fuelType,
    status: car.status,
    hiddenReason: car.hiddenReason ?? null,
    registrationNumber: car.registrationNumber,
    categorySlug: car.categorySlug,
    partnerId: car.partnerId,
    photos: (car.photos || []).map((url, index) => ({
      id: `${car.id}-photo-${index}`,
      url,
      sortOrder: index,
    })),
    passport:
      car.passportFrontUrl && car.passportBackUrl
        ? {
            frontUrl: car.passportFrontUrl,
            backUrl: car.passportBackUrl,
            insuranceUrl: insuranceUrl ?? null,
            insuranceExpiresAt: insuranceExpiresAt ?? null,
          }
        : null,
    extras: (car.extras || []).map((row) => ({
      extraServiceId: row.extraServiceId,
      priceEur: row.forbidden ? 0 : row.priceEur,
      ...(row.forbidden ? { forbidden: true as const } : {}),
    })),
    deliveryPrices: car.deliveryPrices || [],
    partner: {
      companyName: car.partnerName || "Partner",
      logoUrl: null,
      status: "APPROVED" as const,
      userId: car.partnerUserId,
      reviews: [] as Array<{ averageRating: number }>,
    },
    createdAt: car.createdAt,
    updatedAt: car.updatedAt,
    insuranceUrl: insuranceUrl ?? null,
    insuranceExpiresAt: insuranceExpiresAt ?? null,
    fileStored: true,
  };
}
