import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import {
  locationCodesEqual,
  normalizeLocationCode,
  searchPlacesForCountry,
} from "@/lib/catalog/search-places";
import { WORLD_COUNTRIES } from "@/lib/catalog/world-countries";

export type CountryLocationOption = {
  id: string;
  label: string;
  countryIso2: string;
  iata: string;
  /** Selectable in the request picker. */
  isActive: boolean;
  /** Admin has switched this place on, so it can be used on car listings. */
  approved: boolean;
};

/** Delivery catalog rows including inactive ones; null when the request fails. */
export async function fetchPartnerDeliveryRows(): Promise<DeliveryLocationView[] | null> {
  try {
    const res = await fetch("/api/delivery-locations?all=1", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data) ? data : Array.isArray(data.locations) ? data.locations : [];
    return list as DeliveryLocationView[];
  } catch {
    return null;
  }
}

/** Same country list as the partnership application: every country with catalog places. */
export function requestableCountryOptions(): Array<{ iso2: string; name: string }> {
  return WORLD_COUNTRIES.filter((country) => searchPlacesForCountry(country.iso2).length > 0)
    .map((country) => ({ iso2: country.iso2.toUpperCase(), name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function rowForCode(rows: DeliveryLocationView[], code: string) {
  return rows.find(
    (row) => locationCodesEqual(row.iata || "", code) || locationCodesEqual(row.airportId || "", code),
  );
}

/**
 * Airports and cities a partner may request for one country (the application catalog),
 * plus any of the partner's own saved places that only exist in the delivery catalog.
 * Other partners' activated places are not mixed in.
 */
export function countryLocationOptions(
  iso2: string,
  deliveryRows: DeliveryLocationView[],
  selectedIds: string[],
): CountryLocationOption[] {
  const want = iso2.toUpperCase();
  const options: CountryLocationOption[] = searchPlacesForCountry(want).map((place) => {
    const code = normalizeLocationCode(place.code);
    return {
      id: code,
      label: place.label,
      countryIso2: want,
      iata: code,
      isActive: true,
      approved: Boolean(rowForCode(deliveryRows, code)?.isActive),
    };
  });

  for (const id of selectedIds) {
    const row = deliveryRows.find((r) => r.id === id);
    if (!row || (row.countryIso2 || "").toUpperCase() !== want) continue;
    const code = normalizeLocationCode(row.iata || row.airportId || "");
    if (options.some((opt) => locationCodesEqual(opt.iata, code))) continue;
    options.push({
      id: row.id,
      label: row.label,
      countryIso2: want,
      iata: code,
      isActive: true,
      approved: row.isActive,
    });
  }
  return options;
}
