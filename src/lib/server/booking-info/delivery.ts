import "server-only";

import {
  computeTripDeliveryFees,
  matchDeliveryRowsForPlace,
  mergeDeliveryPrefsIntoRows,
  type DeliveryPriceRowLike,
} from "@/lib/delivery/trip-fees";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { toNumber } from "@/lib/utils";
import type { BookingInfoDetailPayload, BookingInfoLocationOption } from "./types";

export function shortPlaceLabel(iata: string, cityOrName: string) {
  const code = String(iata || "").toUpperCase();
  const known: Record<string, string> = {
    BUS: "ბატ.",
    KUT: "ქუტ.",
    TBS: "თბ.",
  };
  if (known[code]) return known[code];
  const base = String(cityOrName || code || "").trim();
  if (!base) return code || "—";
  return base.length <= 4 ? base : `${base.slice(0, 3)}.`;
}

export function formatDeliveryPlaceLabel(input: {
  iata: string;
  name?: string;
  city?: string;
  fallback?: string;
}) {
  const iata = String(input.iata || "").trim().toUpperCase();
  let name = String(input.name || input.city || input.fallback || "").trim();
  if (!name) name = iata || "—";
  // Normalize "Name (BUS)" / "Name [BUS]" → "Name [BUS]"
  name = name
    .replace(/\s*[\[(]\s*[A-Z0-9]{3,8}\s*[\])]\s*$/i, "")
    .trim();
  if (iata && !name.toUpperCase().includes(iata)) {
    return `${name} [${iata}]`;
  }
  return name;
}

export async function buildMergedDeliveryRows(input: {
  deliveryPrices?: Array<{
    deliveryLocationId: string;
    priceEur: number | string;
    freeAfterDays?: number | null;
    travelTimeMinutes?: number | null;
  }> | null;
  partnerId?: string;
  partnerUserId?: string;
}): Promise<{ rows: DeliveryPriceRowLike[]; byIata: Map<string, { label: string }> }> {
  const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
  const { normalizeLocationCode } = await import("@/lib/catalog/search-places");
  const locs = await listDeliveryLocations({ activeOnly: false });
  const byId = new Map(locs.map((l) => [l.id, l]));
  const byIata = new Map(
    locs
      .map((l) => [String(l.iata || "").toUpperCase(), l] as const)
      .filter(([iata]) => Boolean(iata)),
  );

  const resolveLoc = (deliveryLocationId: string) => {
    const id = String(deliveryLocationId || "");
    return (
      byId.get(id) ||
      byIata.get(normalizeLocationCode(id).toUpperCase()) ||
      byIata.get(id.toUpperCase()) ||
      null
    );
  };

  const toFeeRow = (dp: {
    deliveryLocationId: string;
    priceEur: number | string;
    freeAfterDays?: number | null;
    travelTimeMinutes?: number | null;
  }): DeliveryPriceRowLike => {
    const loc = resolveLoc(dp.deliveryLocationId);
    const iata = (loc?.iata || normalizeLocationCode(dp.deliveryLocationId) || "").toUpperCase();
    return {
      deliveryLocationId: dp.deliveryLocationId,
      priceEur: Number(dp.priceEur) || 0,
      freeAfterDays: dp.freeAfterDays ?? null,
      travelTimeMinutes: dp.travelTimeMinutes ?? 0,
      deliveryLocation: {
        id: loc?.id || dp.deliveryLocationId,
        isActive: loc ? loc.isActive !== false : Boolean(iata),
        airport: iata
          ? {
              iata,
              city: { country: { iso2: String(loc?.countryIso2 || "").toUpperCase() } },
            }
          : null,
      },
    };
  };

  let rows = (input.deliveryPrices || []).map(toFeeRow);

  if (input.partnerId) {
    try {
      const { readPartnerDeliveryPrefs } = await import(
        "@/lib/server/partner-delivery-prefs-store"
      );
      const partnerKeys = [
        input.partnerId,
        input.partnerUserId,
        input.partnerId.startsWith("file-partner-")
          ? input.partnerId.slice("file-partner-".length)
          : "",
        "local-partner",
      ].filter((k, i, arr) => Boolean(k) && arr.indexOf(k) === i) as string[];

      let prefs: Awaited<ReturnType<typeof readPartnerDeliveryPrefs>> = [];
      for (const key of partnerKeys) {
        prefs = await readPartnerDeliveryPrefs(key);
        if (prefs.length) break;
      }

      if (rows.length && prefs.length) {
        rows = mergeDeliveryPrefsIntoRows(rows, prefs);
      } else if (!rows.length && prefs.length) {
        rows = prefs
          .filter((p) => p.enabled !== false)
          .map((p) =>
            toFeeRow({
              deliveryLocationId: p.deliveryLocationId,
              priceEur: p.priceEur,
              freeAfterDays: p.freeAfterDays,
              travelTimeMinutes: p.travelTimeMinutes,
            }),
          );
      }
    } catch {
      /* keep car rows */
    }
  }

  const labelByIata = new Map<string, { label: string }>();
  for (const [iata, loc] of byIata) {
    labelByIata.set(iata, { label: loc.label || iata });
  }
  return { rows, byIata: labelByIata };
}

export function withDeliveryFees(
  options: Array<{ iata: string; label: string }>,
  rows: DeliveryPriceRowLike[],
): BookingInfoLocationOption[] {
  return options.map((opt) => {
    const iata = String(opt.iata || "").toUpperCase();
    const matched = matchDeliveryRowsForPlace(rows, iata);
    if (!matched.length) {
      return { iata, label: opt.label, priceEur: 0, freeAfterDays: null };
    }
    let best = matched[0];
    let bestPrice = toNumber(best.priceEur, 0);
    for (const row of matched.slice(1)) {
      const p = toNumber(row.priceEur, 0);
      if (p < bestPrice) {
        best = row;
        bestPrice = p;
      }
    }
    return {
      iata,
      label: opt.label,
      priceEur: bestPrice,
      freeAfterDays:
        best.freeAfterDays == null ? null : Math.floor(toNumber(best.freeAfterDays, 0)),
    };
  });
}

export async function resolveDeliverySummary(input: {
  deliveryPrices?: Array<{
    deliveryLocationId: string;
    priceEur: number | string;
    freeAfterDays?: number | null;
    travelTimeMinutes?: number | null;
  }> | null;
  pickupIata: string;
  dropoffIata: string;
  pickupName?: string;
  dropoffName?: string;
  pickupCity?: string;
  dropoffCity?: string;
  rentalDays: number;
  partnerId?: string;
  partnerUserId?: string;
}): Promise<BookingInfoDetailPayload["delivery"]> {
  const pickupIata = String(input.pickupIata || "").toUpperCase();
  const dropoffIata = String(input.dropoffIata || "").toUpperCase() || pickupIata;
  const pickupLabel = formatDeliveryPlaceLabel({
    iata: pickupIata,
    name: input.pickupName,
    city: input.pickupCity,
  });
  const dropoffLabel = formatDeliveryPlaceLabel({
    iata: dropoffIata,
    name: input.dropoffName,
    city: input.dropoffCity,
  });
  const empty = {
    pickupLabel,
    dropoffLabel,
    pickupShort: shortPlaceLabel(pickupIata, input.pickupCity || pickupLabel),
    dropoffShort: shortPlaceLabel(dropoffIata, input.dropoffCity || dropoffLabel),
    pickupFeeEur: 0,
    dropoffFeeEur: 0,
    totalFeeEur: 0,
  };
  try {
    const { rows, byIata } = await buildMergedDeliveryRows({
      deliveryPrices: input.deliveryPrices,
      partnerId: input.partnerId,
      partnerUserId: input.partnerUserId,
    });
    const fees = computeTripDeliveryFees({
      rows,
      pickup: pickupIata,
      dropoff: dropoffIata,
      rentalDays: input.rentalDays,
    });

    const pickupLoc = byIata.get(pickupIata) || null;
    const dropoffLoc = byIata.get(dropoffIata) || null;
    return {
      pickupLabel: formatDeliveryPlaceLabel({
        iata: pickupIata,
        name: input.pickupName || pickupLoc?.label,
        city: input.pickupCity,
        fallback: pickupLoc?.label,
      }),
      dropoffLabel: formatDeliveryPlaceLabel({
        iata: dropoffIata,
        name: input.dropoffName || dropoffLoc?.label,
        city: input.dropoffCity,
        fallback: dropoffLoc?.label,
      }),
      pickupShort: shortPlaceLabel(pickupIata, input.pickupCity || pickupLoc?.label || ""),
      dropoffShort: shortPlaceLabel(dropoffIata, input.dropoffCity || dropoffLoc?.label || ""),
      pickupFeeEur: roundMoney(fees.pickupFeeEur),
      dropoffFeeEur: roundMoney(fees.dropoffFeeEur),
      totalFeeEur: roundMoney(fees.totalFeeEur),
    };
  } catch {
    return empty;
  }
}
