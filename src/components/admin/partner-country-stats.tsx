import { CountryFlag } from "@/components/ui/country-flag";
import type { PartnerCountryStat } from "@/lib/admin/partner-country-stats";

/** Country chips above the partners table: flag, name, partners / uploaded listings. */
export function PartnerCountryStats({
  stats,
  hint,
}: {
  stats: PartnerCountryStat[];
  /** Tooltip explaining the two numbers. */
  hint: string;
}) {
  if (!stats.length) return null;
  return (
    <ul className="mb-5 flex flex-wrap gap-2" aria-label={hint}>
      {stats.map((stat) => (
        <li
          key={stat.iso2}
          title={hint}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm"
        >
          <CountryFlag iso2={stat.iso2} title={stat.name} />
          <span className="font-semibold text-slate-800">{stat.name}</span>
          <span className="rounded-md bg-[#0b1f4b] px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-white">
            {stat.partners}/{stat.listings}
          </span>
        </li>
      ))}
    </ul>
  );
}
