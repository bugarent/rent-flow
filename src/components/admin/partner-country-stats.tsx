"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CountryFlag } from "@/components/ui/country-flag";
import type { PartnerCountryStat } from "@/lib/admin/partner-country-stats";
import { cn } from "@/lib/utils";

/** Country chips above the partners table; a chip filters the table to that country (tap again to clear). */
export function PartnerCountryStats({
  stats,
  hint,
}: {
  stats: PartnerCountryStat[];
  /** Tooltip explaining the two numbers. */
  hint: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("country") || "").toUpperCase();
  if (!stats.length) return null;

  const toggle = (iso2: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (active === iso2) params.delete("country");
    else params.set("country", iso2);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <ul className="mb-5 flex flex-wrap gap-2" aria-label={hint}>
      {stats.map((stat) => {
        const selected = active === stat.iso2;
        return (
          <li key={stat.iso2}>
            <button
              type="button"
              title={hint}
              aria-pressed={selected}
              onClick={() => toggle(stat.iso2)}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow-sm transition",
                selected
                  ? "border-[#0b1f4b] bg-[#0b1f4b] text-white"
                  : "border-slate-200 bg-white text-slate-800 hover:border-[#0b1f4b]/40",
              )}
            >
              <CountryFlag iso2={stat.iso2} title={stat.name} />
              <span className="font-semibold">{stat.name}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-extrabold tabular-nums",
                  selected ? "bg-white text-[#0b1f4b]" : "bg-[#0b1f4b] text-white",
                )}
              >
                {stat.partners}/{stat.listings}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
