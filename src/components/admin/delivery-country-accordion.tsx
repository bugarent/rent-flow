"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";
import type { DeliveryCountryGroup } from "@/components/admin/delivery-country-groups";
import { DeliveryCountRatio } from "@/components/admin/delivery-count-ratio";

/** Collapsible country row: header with counts, the country's places when open. */
export function DeliveryCountryAccordion({
  group,
  title,
  open,
  onToggle,
  labels,
  children,
}: {
  group: DeliveryCountryGroup;
  /** Country name in the admin's language. */
  title: string;
  open: boolean;
  onToggle: () => void;
  labels: { airports: string; cities: string; active: string };
  children: ReactNode;
}) {
  const panelId = `delivery-country-${group.iso2}`;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 sm:px-4",
          open && "border-b border-slate-200 bg-slate-50",
        )}
      >
        <CountryFlag iso2={group.iso2} title={title} className="h-5 w-7 shrink-0 rounded-sm shadow-sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-extrabold text-[#0b1f4b]">{title}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-sm">
            <DeliveryCountRatio
              label={labels.airports}
              total={group.airports}
              active={group.activeAirports}
              activeTitle={labels.active}
            />
            <DeliveryCountRatio
              label={labels.cities}
              total={group.cities}
              active={group.activeCities}
              activeTitle={labels.active}
            />
          </span>
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="p-2 sm:p-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
