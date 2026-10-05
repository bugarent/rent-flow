"use client";

import { useEffect, useRef, useState } from "react";
import type { ExtraServicePricing } from "@/lib/extras/pricing";

export type PriceWindowCopy = {
  minDay: string;
  maxDay: string;
  periodMax: string;
  minDayHint: string;
  maxDayHint: string;
  periodHint: string;
};

type Bounds = {
  minPriceEur: number | null;
  maxPriceEur: number | null;
  maxPeriodEur: number | null;
};

function asText(value: number | null | undefined) {
  return value == null ? "" : String(value);
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parsePriceWindows(minRaw: string, maxRaw: string, periodRaw: string): Bounds {
  return {
    minPriceEur: parseOptionalNumber(minRaw),
    maxPriceEur: parseOptionalNumber(maxRaw),
    maxPeriodEur: parseOptionalNumber(periodRaw),
  };
}

export function ExtraPriceWindows({
  item,
  copy,
  disabled,
  saving,
  onCommit,
}: {
  item: ExtraServicePricing;
  copy: PriceWindowCopy;
  disabled?: boolean;
  saving?: boolean;
  onCommit: (bounds: Bounds) => void;
}) {
  const [minPrice, setMinPrice] = useState(() => asText(item.minPriceEur));
  const [maxPrice, setMaxPrice] = useState(() => asText(item.maxPriceEur));
  const [periodPrice, setPeriodPrice] = useState(() => asText(item.maxPeriodEur));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rootRef.current?.contains(document.activeElement)) return;
    setMinPrice(asText(item.minPriceEur));
    setMaxPrice(asText(item.maxPriceEur));
    setPeriodPrice(asText(item.maxPeriodEur));
  }, [item.minPriceEur, item.maxPriceEur, item.maxPeriodEur]);

  const commit = () => {
    if (disabled) return;
    const next = parsePriceWindows(minPrice, maxPrice, periodPrice);
    const same =
      next.minPriceEur === (item.minPriceEur ?? null) &&
      next.maxPriceEur === (item.maxPriceEur ?? null) &&
      next.maxPeriodEur === (item.maxPeriodEur ?? null);
    if (same) return;
    onCommit(next);
  };

  const field = (
    label: string,
    hint: string,
    value: string,
    onChange: (value: string) => void,
    tone: "default" | "cap",
  ) => (
    <label className="block min-w-0 text-[11px] font-semibold text-slate-700">
      {label}
      <input
        type="number"
        min={0}
        step="0.01"
        disabled={disabled || saving}
        title={hint}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={
          tone === "cap"
            ? "mt-1 w-full rounded-lg border border-amber-300 bg-amber-50/70 px-2 py-1.5 text-sm font-normal disabled:opacity-60"
            : "mt-1 w-full rounded-lg border px-2 py-1.5 text-sm font-normal disabled:opacity-60"
        }
      />
    </label>
  );

  return (
    <div ref={rootRef} className="grid min-w-[16rem] grid-cols-3 gap-2">
      {field(copy.minDay, copy.minDayHint, minPrice, setMinPrice, "default")}
      {field(copy.maxDay, copy.maxDayHint, maxPrice, setMaxPrice, "default")}
      {field(copy.periodMax, copy.periodHint, periodPrice, setPeriodPrice, "cap")}
    </div>
  );
}
