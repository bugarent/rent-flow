"use client";

import { MobileDataCard, MobileDataRow, ResponsiveDataList } from "@/components/ui/responsive-data-list";
import { PartnerDeliveryPriceCell } from "@/components/partner/partner-delivery-price-cell";
import { cn } from "@/lib/utils";
import type { DeliveryCopy } from "./delivery-copy";
import { DeliveryStatusSwitch } from "./delivery-status-switch";
import { cityKey, placeLabel, type DeliveryRowState } from "./delivery-types";

type Handlers = {
  togglingId: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onUpdate: (id: string, patch: Partial<DeliveryRowState>) => void;
  onFreeAfterDays: (row: DeliveryRowState, raw: string) => void;
  onPriceCapped: (max: string) => void;
};

function groupByCity(rows: DeliveryRowState[]) {
  const map = new Map<string, DeliveryRowState[]>();
  for (const row of rows) {
    const key = cityKey(row.location);
    map.set(key, [...(map.get(key) || []), row]);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const numberClass =
  "rounded-md border border-slate-200 px-2 py-1 text-base font-bold disabled:opacity-50 sm:text-sm";

/** Active delivery places of one country: price, free-after days and travel time per place. */
export function DeliveryRowsTable({
  rows,
  locale,
  t,
  ...h
}: { rows: DeliveryRowState[]; locale: string; t: DeliveryCopy } & Handlers) {
  const grouped = groupByCity(rows);

  const freeAfterInput = (row: DeliveryRowState, align: "start" | "end") => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={row.location.maxFreeAfterDays ?? undefined}
      step={1}
      disabled={!row.enabled}
      value={row.freeAfterDays}
      title={
        row.location.maxFreeAfterDays != null
          ? t.freeAfterCapped.replaceAll("{n}", String(row.location.maxFreeAfterDays))
          : undefined
      }
      onChange={(e) => h.onFreeAfterDays(row, e.target.value)}
      className={cn(numberClass, "w-20", align === "end" && "text-end")}
    />
  );

  const travelInputs = (row: DeliveryRowState, align: "start" | "end") => (
    <div className={cn("inline-flex flex-wrap items-center gap-1", align === "end" && "justify-end")}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        disabled={!row.enabled}
        value={row.travelHours}
        onChange={(e) => h.onUpdate(row.location.id, { travelHours: e.target.value })}
        className={cn(numberClass, "w-14", align === "end" && "text-end")}
      />
      <span className="text-xs text-slate-500">{t.hours}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        disabled={!row.enabled}
        value={row.travelMinutes}
        onChange={(e) => h.onUpdate(row.location.id, { travelMinutes: e.target.value })}
        className={cn(numberClass, "w-14", align === "end" && "text-end")}
      />
      <span className="text-xs text-slate-500">{t.minutes}</span>
    </div>
  );

  const statusSwitch = (row: DeliveryRowState) => (
    <DeliveryStatusSwitch
      checked={row.enabled}
      disabled={h.togglingId === row.location.id}
      onLabel={t.statusOn}
      offLabel={t.statusOff}
      onChange={(next) => h.onToggle(row.location.id, next)}
    />
  );

  const priceCell = (row: DeliveryRowState, align?: "end") => (
    <PartnerDeliveryPriceCell
      priceEur={row.priceEur}
      maxDeliveryPriceEur={row.maxDeliveryPriceEur}
      disabled={!row.enabled}
      freeLabel={t.free}
      maxLabel={t.maxHint}
      align={align}
      onPriceChange={(eur) => h.onUpdate(row.location.id, { priceEur: eur })}
      onCapped={h.onPriceCapped}
    />
  );

  const desktop = (
    <table className="min-w-full text-left text-sm">
      <thead className="bg-[#e8f5e9] text-xs font-bold uppercase tracking-wide text-slate-600">
        <tr>
          <th className="px-3 py-2.5">{t.city}</th>
          <th className="px-3 py-2.5">{t.place}</th>
          <th className="w-24 px-3 py-2.5">{t.statusOn}</th>
          <th className="px-3 py-2.5">{t.oneWay}</th>
          <th className="px-3 py-2.5">{t.freeAfter}</th>
          <th className="px-3 py-2.5">{t.travelTime}</th>
        </tr>
      </thead>
      <tbody>
        {grouped.map(([city, cityRows]) =>
          cityRows.map((row, idx) => (
            <tr
              key={row.location.id}
              className={cn(idx % 2 === 0 ? "bg-white" : "bg-[#f7fafc]", "border-t border-slate-100")}
            >
              <td className="px-3 py-2.5 align-middle font-bold text-[#0b1f4b]">{idx === 0 ? city : ""}</td>
              <td className="px-3 py-2.5 align-middle font-semibold text-[#0b1f4b]">
                {placeLabel(row.location, locale)}
              </td>
              <td className="px-3 py-2.5 align-middle">{statusSwitch(row)}</td>
              <td className="px-3 py-2.5 align-middle">{priceCell(row)}</td>
              <td className="px-3 py-2.5 align-middle">
                {freeAfterInput(row, "start")}
                <span className="ml-1 text-xs text-slate-500">{t.days}</span>
              </td>
              <td className="px-3 py-2.5 align-middle">{travelInputs(row, "start")}</td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );

  const mobile = (
    <>
      {grouped.map(([city, cityRows]) =>
        cityRows.map((row) => (
          <MobileDataCard key={row.location.id}>
            <MobileDataRow label={t.city}>{city}</MobileDataRow>
            <MobileDataRow label={t.place}>
              <span className="text-end text-[#0b1f4b]">{placeLabel(row.location, locale)}</span>
            </MobileDataRow>
            <MobileDataRow label={t.statusOn}>{statusSwitch(row)}</MobileDataRow>
            <MobileDataRow label={t.oneWay}>{priceCell(row, "end")}</MobileDataRow>
            <MobileDataRow label={t.freeAfter}>
              {freeAfterInput(row, "end")}
              <span className="ml-1 text-xs font-medium text-slate-500">{t.days}</span>
            </MobileDataRow>
            <MobileDataRow label={t.travelTime}>{travelInputs(row, "end")}</MobileDataRow>
          </MobileDataCard>
        )),
      )}
    </>
  );

  return (
    <div className="max-md:border-0 max-md:bg-transparent max-md:p-2 max-md:shadow-none">
      <ResponsiveDataList desktop={desktop} mobile={mobile} />
    </div>
  );
}
