"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Globe2, X } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import type { PartnerCountryStat } from "@/lib/admin/partner-country-stats";
import { cn } from "@/lib/utils";

/**
 * Country chips above the partners table, in a collapsed dropdown (most cars first).
 * A chip filters the table to that country; tap it again to clear.
 */
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
  const { locale } = useAdminLocale();
  const [open, setOpen] = useState(false);
  const active = (searchParams.get("country") || "").toUpperCase();
  if (!stats.length) return null;

  const activeStat = stats.find((s) => s.iso2 === active);
  const panelId = "partner-country-stats";

  const setCountry = (iso2: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!iso2 || active === iso2) params.delete("country");
    else params.set("country", iso2);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-[#0b1f4b] shadow-sm hover:border-[#0b1f4b]/40"
        >
          <Globe2 className="h-4 w-4 text-[#1d6fe8]" aria-hidden />
          {uiText(locale, "Countries", "ქვეყნები", "Страны")}
          <span className="rounded-md bg-[#0b1f4b] px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-white">
            {stats.length}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {activeStat ? (
          <button
            type="button"
            onClick={() => setCountry("")}
            title={uiText(locale, "Clear country filter", "ქვეყნის ფილტრის მოხსნა", "Сбросить фильтр страны")}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#0b1f4b] bg-[#0b1f4b] px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
          >
            <CountryFlag iso2={activeStat.iso2} title={activeStat.name} />
            {activeStat.name}
            <span className="rounded-md bg-white px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-[#0b1f4b]">
              {activeStat.partners}/{activeStat.listings}
            </span>
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul id={panelId} className="mt-2 flex flex-wrap gap-2" aria-label={hint}>
          {stats.map((stat) => {
            const selected = active === stat.iso2;
            return (
              <li key={stat.iso2}>
                <button
                  type="button"
                  title={hint}
                  aria-pressed={selected}
                  onClick={() => setCountry(stat.iso2)}
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
      ) : null}
    </div>
  );
}
