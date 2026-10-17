import "server-only";

import {
  findSearchPlace,
  locationCodesEqual,
  normalizeLocationCode,
  searchPlacesForCountry,
} from "@/lib/catalog/search-places";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";

export type DeliveryAddOption = {
  /** Existing DeliveryLocation id, or the place code when the catalog row does not exist yet. */
  id: string;
  code: string;
  label: string;
  kind: "airport" | "city";
  cityName: string;
  countryIso2: string;
};

/**
 * Every airport and city a partner can add for each operating country: the
 * static place catalog plus admin delivery rows in that country.
 */
export async function deliveryAddOptionsByCountry(
  countryIso2s: string[],
): Promise<Record<string, DeliveryAddOption[]>> {
  const all = await listDeliveryLocations({ activeOnly: false }).catch(() => [] as DeliveryLocationView[]);
  const out: Record<string, DeliveryAddOption[]> = {};
  for (const raw of countryIso2s) {
    const iso = raw.toUpperCase();
    const rows = all.filter((loc) => (loc.countryIso2 || "").toUpperCase() === iso);
    const list: DeliveryAddOption[] = [];
    const seen = new Set<string>();
    for (const place of searchPlacesForCountry(iso)) {
      const code = normalizeLocationCode(place.code);
      const row = rows.find(
        (loc) => locationCodesEqual(loc.iata, code) || locationCodesEqual(loc.airportId || "", code),
      );
      const id = row?.id || code;
      if (seen.has(id)) continue;
      seen.add(id);
      list.push({
        id,
        code,
        label: place.label,
        kind: place.kind === "city" ? "city" : "airport",
        cityName: place.cityName,
        countryIso2: iso,
      });
    }
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      if (row.isActive === false) continue;
      seen.add(row.id);
      const code = normalizeLocationCode(row.iata || row.airportId || "");
      list.push({
        id: row.id,
        code,
        label: row.label,
        kind: row.kind === "city" || findSearchPlace(code)?.kind === "city" ? "city" : "airport",
        cityName: row.cityName || "",
        countryIso2: iso,
      });
    }
    out[iso] = list.sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );
  }
  return out;
}
