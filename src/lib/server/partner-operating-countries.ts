import "server-only";

import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { europeAsiaHoverRegion, worldCountryName } from "@/lib/catalog/world-countries";

export type PartnerOperatingCountry = {
  iso2: string;
  name: string;
  hoverRegion: "Europe" | "Asia";
};

/**
 * Countries that currently have at least one homepage-active delivery location.
 * Used for homepage-related admin views — partners may request any country.
 */
export async function listPartnerOperatingCountries(): Promise<PartnerOperatingCountry[]> {
  try {
    const active = await listDeliveryLocations({ activeOnly: true });
    const byIso = new Map<string, PartnerOperatingCountry>();
    for (const loc of active) {
      const iso2 = (loc.countryIso2 || "").toUpperCase();
      if (iso2.length !== 2 || byIso.has(iso2)) continue;
      byIso.set(iso2, {
        iso2,
        name: loc.country || worldCountryName(iso2),
        hoverRegion:
          europeAsiaHoverRegion({
            iso2,
            name: worldCountryName(iso2),
            region: "Europe",
          }) ?? "Europe",
      });
    }
    return [...byIso.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  } catch {
    return [];
  }
}

export async function listActiveOperatingCountryIso2s(): Promise<string[]> {
  const countries = await listPartnerOperatingCountries();
  return countries.map((c) => c.iso2);
}

/** Validate ISO2 codes only — partners may request any country; admin remodeation gates approval. */
export async function assertAllowedOperatingCountries(iso2s: string[]): Promise<string | null> {
  for (const raw of iso2s) {
    const iso2 = String(raw || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso2)) return `Invalid country code: ${raw}`;
  }
  return null;
}

/** Location ids are resolved on save; no homepage allow-list for partner requests. */
export async function assertAllowedOperatingLocations(
  _locationIds: string[],
  _opts?: { previouslySelected?: string[] },
): Promise<string | null> {
  return null;
}

export function countriesFromIso2s(iso2s: string[]): PartnerOperatingCountry[] {
  return iso2s
    .map((iso2) => {
      const code = iso2.toUpperCase();
      return {
        iso2: code,
        name: worldCountryName(code),
        hoverRegion:
          europeAsiaHoverRegion({
            iso2: code,
            name: worldCountryName(code),
            region: "Europe",
          }) ?? "Europe",
      };
    })
    .filter((c) => c.iso2.length === 2);
}
