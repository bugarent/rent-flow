import { worldCountryName } from "@/lib/catalog/world-countries";

export type PartnerCountryStat = {
  iso2: string;
  name: string;
  partners: number;
  listings: number;
};

type Row = { status: string; carCount: number; countryIso2s: string[] };

/** Partners (rejected excluded) and their uploaded listings per operating country. */
export function partnerCountryStats(rows: Row[]): PartnerCountryStat[] {
  const byIso = new Map<string, PartnerCountryStat>();
  for (const row of rows) {
    if (row.status === "REJECTED") continue;
    for (const raw of new Set(row.countryIso2s.map((c) => c.trim().toUpperCase()).filter(Boolean))) {
      const stat = byIso.get(raw) ?? {
        iso2: raw,
        name: worldCountryName(raw) || raw,
        partners: 0,
        listings: 0,
      };
      stat.partners += 1;
      stat.listings += Math.max(0, Number(row.carCount) || 0);
      byIso.set(raw, stat);
    }
  }
  return [...byIso.values()].sort(
    (a, b) => b.partners - a.partners || b.listings - a.listings || a.name.localeCompare(b.name),
  );
}
