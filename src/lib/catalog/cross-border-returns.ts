import { findSearchPlace, normalizeLocationCode } from "@/lib/catalog/search-places";

/** Pickup place code → other-country place codes a partner has switched on as well. */
export type CrossBorderReturnMap = Record<string, string[]>;

export type CrossBorderPlace = {
  id: string;
  iata: string;
  airportId?: string | null;
  countryIso2?: string | null;
  isActive?: boolean;
};

function norm(raw: string | null | undefined) {
  return normalizeLocationCode(String(raw || "")).toUpperCase();
}

/** Same code the homepage search option uses for this location. */
function publicCode(loc: CrossBorderPlace): string {
  const catalog =
    findSearchPlace(loc.iata) ||
    findSearchPlace(loc.id) ||
    (loc.airportId ? findSearchPlace(loc.airportId) : undefined);
  return norm(catalog?.code || loc.iata || loc.id);
}

function countryOf(loc: CrossBorderPlace): string {
  return (loc.countryIso2 || findSearchPlace(publicCode(loc))?.countryIso2 || "").toUpperCase();
}

/**
 * When one partner has switched on delivery in more than one country, each of
 * those places can be a return for the partner's places in the other countries.
 * Same-country places are left out; the search form already lists those.
 */
export function buildCrossBorderReturnMap(
  partners: Array<{ cabinetCodes: string[]; enabledIds: string[] }>,
  places: CrossBorderPlace[],
): CrossBorderReturnMap {
  const byKey = new Map<string, CrossBorderPlace>();
  for (const loc of places) {
    if (loc.isActive === false) continue;
    for (const value of [loc.id, loc.iata, loc.airportId]) {
      const key = norm(value);
      if (key && !byKey.has(key)) byKey.set(key, loc);
    }
  }

  const resolve = (raw: string): CrossBorderPlace | undefined => {
    const key = norm(raw);
    if (!key) return undefined;
    const direct = byKey.get(key);
    if (direct) return direct;
    const catalog = findSearchPlace(key)?.code;
    return catalog ? byKey.get(norm(catalog)) : undefined;
  };

  const links = new Map<string, Set<string>>();
  const addLink = (fromKeys: string[], toCode: string) => {
    for (const key of fromKeys) {
      if (!key || key === toCode) continue;
      const set = links.get(key) ?? new Set<string>();
      set.add(toCode);
      links.set(key, set);
    }
  };

  for (const partner of partners) {
    const cabinet = new Set<string>();
    for (const code of partner.cabinetCodes) {
      const loc = resolve(code);
      if (!loc) continue;
      for (const value of [loc.id, loc.iata, loc.airportId, publicCode(loc)]) {
        const key = norm(value);
        if (key) cabinet.add(key);
      }
    }

    const enabled: CrossBorderPlace[] = [];
    const seen = new Set<string>();
    for (const id of partner.enabledIds) {
      const loc = resolve(id);
      if (!loc) continue;
      const code = publicCode(loc);
      if (!code || seen.has(code)) continue;
      const keys = [loc.id, loc.iata, loc.airportId, code].map((value) => norm(value)).filter(Boolean);
      if (!keys.some((key) => cabinet.has(key))) continue;
      seen.add(code);
      enabled.push(loc);
    }

    const countries = new Set(enabled.map(countryOf).filter(Boolean));
    if (countries.size < 2) continue;

    for (const loc of enabled) {
      const fromCountry = countryOf(loc);
      const fromCode = publicCode(loc);
      const fromKeys = [fromCode, loc.iata, loc.id, loc.airportId].map((value) => norm(value)).filter(Boolean);
      for (const other of enabled) {
        const otherCountry = countryOf(other);
        if (!otherCountry || otherCountry === fromCountry) continue;
        addLink(fromKeys, publicCode(other));
      }
    }
  }

  const out: CrossBorderReturnMap = {};
  for (const [key, set] of links) {
    const list = [...set].filter((code) => code !== key).sort();
    if (list.length) out[key] = list;
  }
  return out;
}

export function returnPlacesForPickup(map: CrossBorderReturnMap | undefined, pickup: string): string[] {
  if (!map || !pickup) return [];
  return map[norm(pickup)] || [];
}
