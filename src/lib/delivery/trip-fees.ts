import {
  effectiveOneWayDeliveryPrice,
  hasDeliveryPriceLimit,
  type PartnerDeliveryInput,
} from "@/lib/delivery/pricing";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import { toNumber } from "@/lib/utils";
import type { PartnerDeliveryPref } from "@/lib/server/partner-delivery-prefs-store";

export type DeliveryPriceRowLike = {
  priceEur?: unknown;
  freeAfterDays?: unknown;
  travelTimeMinutes?: unknown;
  deliveryLocationId?: string;
  deliveryLocation?: {
    id?: string;
    isActive?: boolean;
    maxDeliveryPriceEur?: unknown;
    airport?: { iata?: string; city?: { name?: unknown; country?: { iso2?: string } } } | null;
  } | null;
};

/** Partner price never exceeds the admin limit of the location (limit 0 = no limit). */
function withinAdminLimit<T extends DeliveryPriceRowLike>(row: T): T {
  const rawMax = row.deliveryLocation?.maxDeliveryPriceEur;
  if (!hasDeliveryPriceLimit(rawMax)) return row;
  const max = toNumber(rawMax, 0);
  if (toNumber(row.priceEur, 0) <= max) return row;
  return { ...row, priceEur: max };
}

/** Delivery catalog place (airport or city) by location id. */
export type DeliveryPlace = {
  id: string;
  code: string;
  countryIso2: string;
  isActive: boolean;
  maxDeliveryPriceEur: number;
};

function rowFromPlace(place: DeliveryPlace, pref: PartnerDeliveryPref): DeliveryPriceRowLike {
  return {
    deliveryLocationId: place.id,
    priceEur: pref.priceEur,
    freeAfterDays: pref.freeAfterDays,
    travelTimeMinutes: pref.travelTimeMinutes,
    deliveryLocation: {
      id: place.id,
      isActive: true,
      maxDeliveryPriceEur: place.maxDeliveryPriceEur,
      airport: { iata: place.code, city: { country: { iso2: place.countryIso2.toUpperCase() } } },
    },
  };
}

/**
 * A listing is offered exactly at the partner's Delivery-page ON places, at the
 * prices saved there. When the partner has no Delivery-page rows yet, the car's
 * own rows are kept (only capped to the admin limit).
 */
export function mergeDeliveryPrefsIntoRows<T extends DeliveryPriceRowLike>(
  rows: T[] | undefined,
  prefs: PartnerDeliveryPref[] | undefined,
  places?: ReadonlyMap<string, DeliveryPlace>,
): T[] {
  const carRows = rows ?? [];
  if (!prefs?.length) return carRows.map(withinAdminLimit);

  const rowById = new Map<string, T>();
  for (const row of carRows) {
    const id = String(row.deliveryLocationId || row.deliveryLocation?.id || "");
    if (id && !rowById.has(id)) rowById.set(id, row);
  }

  const out: T[] = [];
  const seen = new Set<string>();
  for (const pref of prefs) {
    const id = pref.deliveryLocationId;
    if (pref.enabled === false || !id || seen.has(id)) continue;
    const place = places?.get(id);
    if (place && !place.isActive) continue;
    const existing = rowById.get(id);
    const base = existing ?? (place ? (rowFromPlace(place, pref) as T) : undefined);
    if (!base) continue;
    seen.add(id);
    out.push(
      withinAdminLimit({
        ...base,
        priceEur: pref.priceEur,
        freeAfterDays: pref.freeAfterDays,
        travelTimeMinutes: pref.travelTimeMinutes,
      }),
    );
  }
  return out;
}

/** Fee rows for this exact place. Another city or airport in the same country does not count. */
export function matchDeliveryRowsForPlace(
  rows: DeliveryPriceRowLike[] | undefined,
  placeCode: string | undefined,
): DeliveryPriceRowLike[] {
  if (!placeCode || !rows?.length) return [];
  const code = normalizeLocationCode(placeCode).toUpperCase();
  return rows.filter((row) => {
    if (!row.deliveryLocation?.airport || row.deliveryLocation.isActive === false) return false;
    const iata = normalizeLocationCode(row.deliveryLocation.airport.iata || "").toUpperCase();
    const id = normalizeLocationCode(row.deliveryLocationId || row.deliveryLocation.id || "").toUpperCase();
    return iata === code || id === code;
  });
}

function legFeeFromRows(rows: DeliveryPriceRowLike[], rentalDays: number): number {
  if (!rows.length) return 0;
  const fees = rows.map((row) =>
    effectiveOneWayDeliveryPrice(
      toNumber(row.priceEur, 0),
      row.freeAfterDays == null ? null : toNumber(row.freeAfterDays, 0),
      rentalDays,
    ),
  );
  return Math.min(...fees);
}

/**
 * Pickup + return one-way fees.
 * Each leg uses the partner's one-way price for that location independently —
 * same pickup and return still charge both legs (e.g. Batumi 70 + Batumi 70 = 140).
 */
export function computeTripDeliveryFees(input: {
  rows: DeliveryPriceRowLike[] | undefined;
  pickup: string | undefined;
  dropoff: string | undefined;
  rentalDays: number;
}): { pickupFeeEur: number; dropoffFeeEur: number; totalFeeEur: number } {
  const days = Math.max(1, input.rentalDays || 1);
  const pickupRows = matchDeliveryRowsForPlace(input.rows, input.pickup);
  const dropoffCode = (input.dropoff || input.pickup || "").trim();

  const pickupFeeEur = legFeeFromRows(pickupRows, days);
  if (!dropoffCode) {
    return { pickupFeeEur, dropoffFeeEur: 0, totalFeeEur: pickupFeeEur };
  }
  const dropoffRows = matchDeliveryRowsForPlace(input.rows, dropoffCode);
  const dropoffFeeEur = legFeeFromRows(dropoffRows, days);
  return {
    pickupFeeEur,
    dropoffFeeEur,
    totalFeeEur: pickupFeeEur + dropoffFeeEur,
  };
}

export function prefsToDeliveryInputs(prefs: PartnerDeliveryPref[]): PartnerDeliveryInput[] {
  return prefs
    .filter((p) => p.enabled !== false)
    .map((p) => ({
      deliveryLocationId: p.deliveryLocationId,
      enabled: true,
      priceEur: p.priceEur,
      freeAfterDays: p.freeAfterDays,
      travelTimeMinutes: p.travelTimeMinutes,
    }));
}
