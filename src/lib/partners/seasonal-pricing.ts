/** Partner-level seasonal pricing periods (account page → create-auto price rows). */

export type PartnerSeasonPeriod = {
  /** Month-day inclusive, MM-DD */
  from: string;
  /** Month-day inclusive, MM-DD */
  to: string;
};

export type PartnerSeasonalPricing = {
  enabled: boolean;
  /** Legacy year-round period. No longer shown as a default row. */
  base?: PartnerSeasonPeriod;
  /** Partner-saved seasonal periods (shown only after “Add season”). */
  seasons: PartnerSeasonPeriod[];
};

export const FIXED_BASE_SEASON: PartnerSeasonPeriod = { from: "01-01", to: "12-31" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function emptySeasonalPricing(): PartnerSeasonalPricing {
  return { enabled: false, base: { ...FIXED_BASE_SEASON }, seasons: [] };
}

export function parseSeasonalPricing(raw: unknown): PartnerSeasonalPricing {
  if (!raw || typeof raw !== "object") return emptySeasonalPricing();
  const obj = raw as Record<string, unknown>;
  const seasonsRaw = Array.isArray(obj.seasons) ? obj.seasons : [];
  const seasons: PartnerSeasonPeriod[] = [];
  for (const item of seasonsRaw) {
    if (!item || typeof item !== "object") continue;
    const from = normalizeMd((item as PartnerSeasonPeriod).from);
    const to = normalizeMd((item as PartnerSeasonPeriod).to);
    if (from && to) seasons.push({ from, to });
  }
  let base: PartnerSeasonPeriod | undefined;
  if (obj.base && typeof obj.base === "object") {
    const from = normalizeMd((obj.base as PartnerSeasonPeriod).from);
    const to = normalizeMd((obj.base as PartnerSeasonPeriod).to);
    if (from && to) base = { from, to };
  }
  return {
    enabled: Boolean(obj.enabled),
    base: base || { ...FIXED_BASE_SEASON },
    seasons,
  };
}

/** Accept MM-DD or M-D; return MM-DD or "". */
export function normalizeMd(value: string | undefined | null): string {
  const s = String(value ?? "").trim();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(s);
  if (!m) return "";
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatSeasonPeriodLabel(period: PartnerSeasonPeriod): string {
  return `${formatMdLabel(period.from)} – ${formatMdLabel(period.to)}`;
}

export function formatMdLabel(md: string): string {
  const n = normalizeMd(md);
  if (!n) return md || "—";
  const [mm, dd] = n.split("-");
  const month = MONTHS[Number(mm) - 1] ?? mm;
  return `${month} ${dd}`;
}

export const SEASON_MONTH_OPTIONS = MONTHS.map((label, i) => ({
  value: i + 1,
  label,
}));

export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function mdParts(md: string): { month: number; day: number } {
  const n = normalizeMd(md) || "01-01";
  const [mm, dd] = n.split("-");
  return { month: Number(mm) || 1, day: Number(dd) || 1 };
}

export function mdFromParts(month: number, day: number): string {
  const m = Math.min(12, Math.max(1, month));
  const d = Math.min(daysInMonth(m), Math.max(1, day));
  return `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export type CarSeasonRates = {
  d1_3: string;
  d4_5: string;
  d6_30: string;
  d31: string;
};

export type CarSeasonPriceRow = {
  index: number;
  from: string;
  to: string;
  fixed: boolean;
  rates: CarSeasonRates;
};

export function emptyRates(): CarSeasonRates {
  return { d1_3: "", d4_5: "", d6_30: "", d31: "" };
}

/** Rows shown on Create auto: only seasons the partner added (no implicit year-round row). */
export function buildCreateAutoSeasonRows(pricing: PartnerSeasonalPricing): Omit<CarSeasonPriceRow, "rates">[] {
  return pricing.seasons
    .filter((s) => normalizeMd(s.from) && normalizeMd(s.to))
    .map((s, i) => ({ index: i + 1, from: s.from, to: s.to, fixed: false }));
}

export function defaultNewSeasonPeriod(existing: PartnerSeasonPeriod[]): PartnerSeasonPeriod {
  if (!existing.some((s) => s.from === "06-01" && s.to === "08-31")) {
    return { from: "06-01", to: "08-31" };
  }
  return { from: "09-01", to: "09-30" };
}
