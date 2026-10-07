import "server-only";

import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { createTtlCache } from "@/lib/server/ttl-cache";
import type {
  BookingInfoDetailPayload,
  BookingInfoLocationOption,
} from "@/lib/server/booking-info/types";

/**
 * Terms the guest booked with (car, daily rate, delivery). Later listing, price,
 * or delivery edits must not change an existing booking.
 */
export type BookedTerms = {
  car: BookingInfoDetailPayload["car"];
  delivery: BookingInfoDetailPayload["delivery"];
  pickupIata: string;
  dropoffIata: string;
  /** Delivery price rows for the booked places, as they were at checkout. */
  locations: BookingInfoLocationOption[];
  frozenAt: string;
};

type Store = Record<string, BookedTerms>;

const cache = createTtlCache<Store>(5_000);

async function storePath() {
  return resolveDataFile("bookings", "booking-terms.json");
}

async function readStore(): Promise<Store> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(await storePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const out: Store = parsed && typeof parsed === "object" ? (parsed as Store) : {};
    cache.set(out);
    return out;
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  await ensureDataDir("bookings");
  await writeFile(await storePath(), JSON.stringify(store, null, 2), "utf8");
  cache.set(store);
}

export async function readBookedTerms(bookingId: string | null | undefined): Promise<BookedTerms | null> {
  const id = String(bookingId || "").trim();
  if (!id) return null;
  try {
    return (await readStore())[id] || null;
  } catch {
    return null;
  }
}

export async function readBookedTermsMap(bookingIds: string[]): Promise<Map<string, BookedTerms>> {
  const out = new Map<string, BookedTerms>();
  if (!bookingIds.length) return out;
  try {
    const store = await readStore();
    for (const id of bookingIds) {
      const terms = store[id];
      if (terms) out.set(id, terms);
    }
  } catch {
    /* lists fall back to live car data */
  }
  return out;
}

/** List rows show the car name and photo the guest booked. */
export async function withBookedCarLabels<
  T extends { id: string; carLabel: string; carImageUrl?: string | null },
>(rows: T[]): Promise<T[]> {
  const terms = await readBookedTermsMap(rows.map((row) => row.id));
  if (!terms.size) return rows;
  return rows.map((row) => {
    const car = terms.get(row.id)?.car;
    if (!car) return row;
    const label = `${car.make} ${car.model}`.trim();
    return {
      ...row,
      carLabel: label || row.carLabel,
      carImageUrl: car.imageUrl || row.carImageUrl || null,
    };
  });
}

function termsFromDetail(detail: BookingInfoDetailPayload): BookedTerms {
  const pickupIata = detail.pickupAirport.iata.toUpperCase();
  const dropoffIata = detail.dropoffAirport.iata.toUpperCase();
  return {
    car: { ...detail.car },
    delivery: { ...detail.delivery },
    pickupIata,
    dropoffIata,
    locations: detail.locationOptions
      .filter((o) => {
        const iata = o.iata.toUpperCase();
        return iata === pickupIata || iata === dropoffIata;
      })
      .map((o) => ({ ...o })),
    frozenAt: new Date().toISOString(),
  };
}

/** Saves the booked terms once; existing terms are never overwritten. */
export async function freezeBookedTerms(detail: BookingInfoDetailPayload): Promise<BookedTerms> {
  const store = await readStore();
  const existing = store[detail.id];
  if (existing) return existing;
  const terms = termsFromDetail(detail);
  await writeStore({ ...store, [detail.id]: terms });
  return terms;
}

/** Shows the booking exactly as booked; legs moved to another place use current prices. */
export function applyBookedTerms(
  detail: BookingInfoDetailPayload,
  terms: BookedTerms,
): BookingInfoDetailPayload {
  const pickupIata = detail.pickupAirport.iata.toUpperCase();
  const dropoffIata = detail.dropoffAirport.iata.toUpperCase();
  const samePickup = pickupIata === terms.pickupIata;
  const sameDropoff = dropoffIata === terms.dropoffIata;
  const booked = new Map(terms.locations.map((o) => [o.iata.toUpperCase(), o]));

  const locationOptions = detail.locationOptions.map((o) => {
    const row = booked.get(o.iata.toUpperCase());
    return row ? { ...o, priceEur: row.priceEur, freeAfterDays: row.freeAfterDays } : o;
  });
  for (const row of terms.locations) {
    if (!locationOptions.some((o) => o.iata.toUpperCase() === row.iata.toUpperCase())) {
      locationOptions.push({ ...row });
    }
  }

  const pickupFeeEur = samePickup ? terms.delivery.pickupFeeEur : detail.delivery.pickupFeeEur;
  const dropoffFeeEur = sameDropoff ? terms.delivery.dropoffFeeEur : detail.delivery.dropoffFeeEur;
  const delivery =
    samePickup && sameDropoff
      ? { ...terms.delivery }
      : {
          ...detail.delivery,
          ...(samePickup
            ? { pickupLabel: terms.delivery.pickupLabel, pickupShort: terms.delivery.pickupShort }
            : {}),
          ...(sameDropoff
            ? { dropoffLabel: terms.delivery.dropoffLabel, dropoffShort: terms.delivery.dropoffShort }
            : {}),
          pickupFeeEur,
          dropoffFeeEur,
          totalFeeEur: Math.round((pickupFeeEur + dropoffFeeEur) * 100) / 100,
        };

  return { ...detail, car: { ...terms.car }, delivery, locationOptions };
}
