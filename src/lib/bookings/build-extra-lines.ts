import { roundMoney, FULL_PROTECTION_DAILY_RATIO, CANCELLATION_DAILY_EUR } from "@/lib/cars/reserve-pricing";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { pickServiceLabel } from "@/lib/extras/service-label";
import { toNumber } from "@/lib/utils";

export type BookingExtraLine = {
  id: string;
  label: string;
  priceEur: number;
  qty?: number;
};

type ExtraCatalogRow = {
  extraServiceId: string;
  priceEur: unknown;
  maxPeriodEur?: number | null;
  minPeriodEur?: number | null;
  name?: string | null;
  extraService?: { name?: unknown } | null;
};

function jsonName(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["ka", "en", "ru"]) {
      const v = o[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return "";
}

function catalogLabel(row: ExtraCatalogRow): string {
  return pickServiceLabel(jsonName(row.extraService?.name), row.name);
}

/** Build priced extra lines from checkout payload + car catalog. */
export function buildBookingExtraLines(input: {
  extras?: unknown;
  extraIds?: unknown;
  catalog: ExtraCatalogRow[];
  days: number;
  dailyRateEur: number;
  fullProtection?: boolean;
  cancellationProtection?: boolean;
  fullProtectionLabel?: string;
  cancellationLabel?: string;
}): BookingExtraLine[] {
  const days = Math.max(1, input.days || 1);
  const lines: BookingExtraLine[] = [];
  const byId = new Map(input.catalog.map((r) => [r.extraServiceId, r]));

  if (Array.isArray(input.extras)) {
    for (const item of input.extras as Array<Record<string, unknown>>) {
      const id = String(item?.id || item?.extraServiceId || "");
      const qty = Math.max(0, Math.min(5, Number(item?.qty) || 0));
      if (!id || qty <= 0) continue;
      const row = byId.get(id);
      if (!row) continue;
      const label = catalogLabel(row);
      if (!label) continue;
      const unit = toNumber(row.priceEur);
      const line = roundMoney(
        extraPeriodCharge(unit, days, qty, row.maxPeriodEur, row.minPeriodEur),
      );
      lines.push({
        id,
        label: qty > 1 ? `${label} ×${qty}` : label,
        priceEur: line,
        qty,
      });
    }
  } else if (Array.isArray(input.extraIds)) {
    for (const raw of input.extraIds as unknown[]) {
      const id = String(raw || "");
      if (!id) continue;
      const row = byId.get(id);
      if (!row) continue;
      const label = catalogLabel(row);
      if (!label) continue;
      lines.push({
        id,
        label,
        priceEur: roundMoney(
          extraPeriodCharge(toNumber(row.priceEur), days, 1, row.maxPeriodEur, row.minPeriodEur),
        ),
        qty: 1,
      });
    }
  }

  if (input.fullProtection) {
    lines.push({
      id: "full-protection",
      label: input.fullProtectionLabel || "Full protection",
      priceEur: roundMoney(input.dailyRateEur * FULL_PROTECTION_DAILY_RATIO * days),
      qty: 1,
    });
  }
  if (input.cancellationProtection) {
    lines.push({
      id: "cancellation-protection",
      label: input.cancellationLabel || "Cancellation protection",
      priceEur: roundMoney(CANCELLATION_DAILY_EUR * days),
      qty: 1,
    });
  }

  return lines;
}
