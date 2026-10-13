import "server-only";

import { normalizeLocationCode } from "@/lib/catalog/search-places";
import { listingPickupPlaceIds } from "@/lib/cars/listing-place-ids";
import { mergeDeliveryPrefsIntoRows, type DeliveryPriceRowLike } from "@/lib/delivery/trip-fees";
import { loadCityDeliveryPlaces } from "@/lib/server/city-delivery-places";
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
 * Search results for a place: only listings whose partner has the place in personal
 * info, checked it on the listing, and saved a delivery price for it. Delivery-page
 * prices are applied to the kept rows so the shown fee is the saved one.
 */
export async function scopeSearchCars<T extends SearchCar>(
  cars: T[],
  cabinet: SearchCabinet,
  opts: {
    pickup?: string;
    dropoff?: string;
    countryIso2?: string;
    prefsByPartner?: Map<string, PartnerDeliveryPref[]>;
  },
): Promise<{ cars: T[]; rejected: Array<{ id: string; reason: string }> }> {
  const listingPlacesByCar = new Map(cars.map((car) => [String(car.id || ""), listingOfferedPlaceIds(car)]));

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

  const cityPlaces = await loadCityDeliveryPlaces();
  const priced = cars.map((car) => ({
    ...car,
    deliveryPrices: mergeDeliveryPrefsIntoRows(
      car.deliveryPrices,
      prefsFor(String(car.partnerId || car.partner?.id || "")),
      cityPlaces,
      listingPickupPlaceIds(car.description),
    ),
  }));

  return scopeCarsToPersonalPlaces(priced, cabinet, {
    pickup: opts.pickup,
    dropoff: opts.dropoff,
    countryIso2: opts.countryIso2,
    prefsByPartner,
    listingPlacesByCar,
  });
}
