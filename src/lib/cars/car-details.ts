import { formatMoney } from "@/lib/utils";

/** Parse `<!--car-details:{...}-->` blob from car.description for public/partner UIs. */

export type CarDetailsPricingTier = Array<{
  fromDays: number;
  toDays: number;
  priceEur: string | number;
}>;

export type CarDetailsBlob = {
  deposit?: string | number;
  /** Franchise / excess as percent of the security deposit (0–100). */
  franchise?: string | number;
  franchiseEnabled?: boolean;
  useSeasonalPricing?: boolean;
  pricingTiers?: CarDetailsPricingTier;
  seasons?: Array<{
    index: number;
    from: string;
    to: string;
    rates?: Record<string, string | number>;
  }>;
  rates?: Record<string, string | number>;
  plate?: string;
  color?: string;
  bodyType?: string;
  [key: string]: unknown;
};

export function parseCarDetails(description: string | null | undefined): CarDetailsBlob | null {
  if (!description) return null;
  const m = /<!--car-details:([\s\S]*?)-->/.exec(description);
  if (!m?.[1]) return null;
  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as CarDetailsBlob;
  } catch {
    return null;
  }
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

/** Franchise stored as % of deposit (0–100). Legacy currency values (>100) map via deposit. */
export function resolveFranchisePercent(details: CarDetailsBlob | null | undefined): number {
  if (!details || details.franchiseEnabled === false) return 0;
  const raw = Number(details.franchise);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw <= 100) return Math.round(raw * 100) / 100;
  const deposit = Number(details.deposit);
  if (Number.isFinite(deposit) && deposit > 0) {
    return Math.min(100, Math.round((raw / deposit) * 10000) / 100);
  }
  return 0;
}

/** Absolute franchise / excess amount in EUR = deposit × percent / 100. */
export function resolveFranchiseAmountEur(details: CarDetailsBlob | null | undefined): number {
  const percent = resolveFranchisePercent(details);
  if (percent <= 0) return 0;
  const deposit = Number(details?.deposit);
  if (!Number.isFinite(deposit) || deposit <= 0) return 0;
  return roundMoney((deposit * percent) / 100);
}

export function formatFranchiseLabel(
  details: CarDetailsBlob | null,
  format: (amountEur: number) => string = (n) => formatMoney(n, "EUR"),
): string {
  if (!details) return "—";
  if (details.franchiseEnabled === false) return `0% (${format(0)})`;
  const percent = resolveFranchisePercent(details);
  if (percent <= 0) return `0% (${format(0)})`;
  const amount = resolveFranchiseAmountEur(details);
  if (amount > 0) return `${percent}% (${format(amount)})`;
  return `${percent}%`;
}

export function formatDepositLabel(
  details: CarDetailsBlob | null,
  format: (amountEur: number) => string = (n) => formatMoney(n, "EUR"),
): string {
  if (!details) return "—";
  const n = Number(details.deposit);
  if (!Number.isFinite(n)) return "—";
  return format(n);
}
