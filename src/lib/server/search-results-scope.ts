import "server-only";

import { normalizeLocationCode } from "@/lib/catalog/search-places";
import {
  mergeDeliveryPrefsIntoRows,
  type DeliveryPlace,
  type DeliveryPriceRowLike,
} from "@/lib/delivery/trip-fees";
import { loadDeliveryPlaces } from "@/lib/server/delivery-places";
import {
  readPartnerDeliveryPrefsMap,
  type PartnerDeliveryPref,
} from "@/lib/server/partner-delivery-prefs-store";
import {
  listingOfferedPlaceIds,
  partnerIdsForPlace,
  scopeCarsToPersonalPlaces,
  type SearchCabinet,
} from "@/lib/server/search-cabinet-scope";

type SearchCar = {
  id?: string;
  partnerId?: string;
  partner?: { id?: string };
  description?: string | null;
  deliveryPrices?: DeliveryPriceRowLike[];
};

function partnerAliases(partnerId: string) {
  const bare = partnerId.trim().replace(/^file-partner-/, "");
  return [...new Set([partnerId.trim(), bare, bare ? `file-partner-${bare}` : ""].filter(Boolean))];
}

/** Partners whose personal info has the pickup place (and the return place when it differs). */
export function partnerIdsForTrip(cabinet: SearchCabinet, pickup: string, dropoff?: string): string[] {
  let ids = partnerIdsForPlace(cabinet, pickup);
  const returnCode = dropoff?.trim();
  if (returnCode && normalizeLocationCode(returnCode) !== normalizeLocationCode(pickup)) {
    const returns = new Set(partnerIdsForPlace(cabinet, returnCode));
    ids = ids.filter((id) => returns.has(id));
  }
  return ids;
}

/**
 * Search results for a place: every listing of a partner is offered at the
 * partner's Delivery-page ON places (within personal info), at the prices saved there.
 */
export async function scopeSearchCars<T extends SearchCar>(
  cars: T[],
  cabinet: SearchCabinet,
  opts: {
    pickup?: string;
    dropoff?: string;
    countryIso2?: string;
    prefsByPartner?: Map<string, PartnerDeliveryPref[]>;
    /** Preloaded delivery places (the search catalog passes its copy). */
    places?: ReadonlyMap<string, DeliveryPlace>;
  },
): Promise<{ cars: T[]; rejected: Array<{ id: string; reason: string }> }> {
  const prefsByPartner =
    opts.prefsByPartner ??
    (await readPartnerDeliveryPrefsMap([
      ...new Set(cars.flatMap((car) => partnerAliases(String(car.partnerId || car.partner?.id || "")))),
    ]).catch(() => new Map<string, PartnerDeliveryPref[]>()));
  const prefsFor = (partnerId: string) => {
    for (const id of partnerAliases(partnerId)) {
      const prefs = prefsByPartner.get(id);
      if (prefs?.length) return prefs;
    }
    return [];
  };

  const places = opts.places ?? (await loadDeliveryPlaces());
  const priced = cars.map((car) => ({
    ...car,
    deliveryPrices: mergeDeliveryPrefsIntoRows(
      car.deliveryPrices,
      prefsFor(String(car.partnerId || car.partner?.id || "")),
      places,
    ),
  }));
  const listingPlacesByCar = new Map(priced.map((car) => [String(car.id || ""), listingOfferedPlaceIds(car)]));

  return scopeCarsToPersonalPlaces(priced, cabinet, {
    pickup: opts.pickup,
    dropoff: opts.dropoff,
    countryIso2: opts.countryIso2,
    prefsByPartner,
    listingPlacesByCar,
  });
}
