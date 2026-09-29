/** Structured refund reasons for admin invoices (dates / price lines). */

import { roundMoney } from "@/lib/cars/reserve-pricing";

export type RefundDateChange = {
  type: "dates";
  pickupFrom: string;
  pickupTo: string;
  dropoffFrom: string;
  dropoffTo: string;
};

export type RefundExtraChange = {
  type: "extra";
  label: string;
  priceFromEur: number;
  priceToEur: number;
  /** Site-fee (deposit %) share of this line's reduction — sums toward refund total. */
  siteFeeShareEur?: number;
};

export type RefundChangeDetail = RefundDateChange | RefundExtraChange;

const MONEY_EPS = 0.005;

export function formatRefundDateDisplay(iso: string): string {
  const raw = String(iso || "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw || "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function rentalDayCount(pickupIso: string, dropoffIso: string): number {
  const ms = new Date(dropoffIso).getTime() - new Date(pickupIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function moneyChanged(from: number, to: number): boolean {
  return Math.abs(from - to) >= MONEY_EPS;
}

function siteFeeShare(from: number, to: number, depositPercent: number): number | undefined {
  const delta = from - to;
  if (delta <= MONEY_EPS) return undefined;
  const pct = Math.min(100, Math.max(0, Number(depositPercent) || 0));
  if (pct <= 0) return undefined;
  return roundMoney((delta * pct) / 100);
}

export function summarizeRefundChanges(changes: RefundChangeDetail[]): string {
  if (!changes.length) return "";
  const parts: string[] = [];
  for (const c of changes) {
    if (c.type === "dates") {
      const puFrom = formatRefundDateDisplay(c.pickupFrom);
      const puTo = formatRefundDateDisplay(c.pickupTo);
      const doFrom = formatRefundDateDisplay(c.dropoffFrom);
      const doTo = formatRefundDateDisplay(c.dropoffTo);
      if (doFrom !== doTo || puFrom !== puTo) {
        parts.push(`${puFrom} – ${doFrom} → ${puTo} – ${doTo}`);
      }
    } else {
      const from = Number(c.priceFromEur) || 0;
      const to = Number(c.priceToEur) || 0;
      let line: string;
      if (from <= 0 && to > 0) line = `${c.label}: +€${to.toFixed(2)}`;
      else if (to <= 0 && from > 0) line = `${c.label}: €${from.toFixed(2)} → გაუქმებული`;
      else line = `${c.label}: €${from.toFixed(2)} → €${to.toFixed(2)}`;
      if (c.siteFeeShareEur != null && c.siteFeeShareEur > 0) {
        line += ` (საიტი €${Number(c.siteFeeShareEur).toFixed(2)})`;
      }
      parts.push(line);
    }
  }
  return parts.join("; ");
}

export function isRefundChangeDetail(value: unknown): value is RefundChangeDetail {
  if (!value || typeof value !== "object") return false;
  const v = value as { type?: unknown };
  return v.type === "dates" || v.type === "extra";
}

export function normalizeRefundChanges(raw: unknown): RefundChangeDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRefundChangeDetail).map((c) => {
    if (c.type === "dates") {
      return {
        type: "dates" as const,
        pickupFrom: String(c.pickupFrom || ""),
        pickupTo: String(c.pickupTo || ""),
        dropoffFrom: String(c.dropoffFrom || ""),
        dropoffTo: String(c.dropoffTo || ""),
      };
    }
    const share = Number((c as RefundExtraChange).siteFeeShareEur);
    return {
      type: "extra" as const,
      label: String(c.label || "").trim() || "Extra",
      priceFromEur: Number(c.priceFromEur) || 0,
      priceToEur: Number(c.priceToEur) || 0,
      ...(Number.isFinite(share) && share > 0 ? { siteFeeShareEur: roundMoney(share) } : {}),
    };
  });
}

function dayKey(iso: string): string {
  const raw = String(iso || "").trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function pushPriceLine(
  out: RefundChangeDetail[],
  label: string,
  from: number,
  to: number,
  depositPercent?: number,
) {
  if (!moneyChanged(from, to)) return;
  const share =
    depositPercent != null ? siteFeeShare(from, to, depositPercent) : undefined;
  out.push({
    type: "extra",
    label: String(label || "").trim() || "Item",
    priceFromEur: from,
    priceToEur: to,
    ...(share != null ? { siteFeeShareEur: share } : {}),
  });
}

export function attachSiteFeeShares(
  changes: RefundChangeDetail[],
  depositPercent: number,
): RefundChangeDetail[] {
  return changes.map((c) => {
    if (c.type !== "extra") return c;
    const share = siteFeeShare(c.priceFromEur, c.priceToEur, depositPercent);
    if (share == null) {
      const { siteFeeShareEur: _drop, ...rest } = c;
      return rest;
    }
    return { ...c, siteFeeShareEur: share };
  });
}

/**
 * If a refund only stored the date change, reconstruct rental + per-day extras
 * from the current booking (prices already reflect the new day count).
 */
export function expandRefundChangesFromTrip(input: {
  changes?: RefundChangeDetail[] | null;
  depositPercent: number;
  dailyRateEur: number;
  rentalLabel?: string;
  extras: Array<{ label: string; priceEur: number }>;
}): RefundChangeDetail[] {
  const base = normalizeRefundChanges(input.changes);
  if (base.some((c) => c.type === "extra")) {
    return attachSiteFeeShares(base, input.depositPercent);
  }

  const dates = base.find((c): c is RefundDateChange => c.type === "dates");
  if (!dates) return base;

  const oldDays = rentalDayCount(dates.pickupFrom, dates.dropoffFrom);
  const newDays = rentalDayCount(dates.pickupTo, dates.dropoffTo);
  if (oldDays === newDays) return base;

  const out: RefundChangeDetail[] = [...base];
  const daily = Number(input.dailyRateEur) || 0;
  const pct = input.depositPercent;

  if (daily > 0) {
    pushPriceLine(
      out,
      input.rentalLabel || "მანქანის ქირა",
      roundMoney(daily * oldDays),
      roundMoney(daily * newDays),
      pct,
    );
  }

  if (newDays > 0) {
    for (const ex of input.extras) {
      const to = Number(ex.priceEur) || 0;
      if (to <= 0) continue;
      const from = roundMoney((to * oldDays) / newDays);
      pushPriceLine(out, String(ex.label || "").trim() || "Extra", from, to, pct);
    }
  }

  return out;
}

/** Build structured refund reason lines from before/after booking state. */
export function buildRefundChanges(input: {
  pickupFrom: string;
  pickupTo: string;
  dropoffFrom: string;
  dropoffTo: string;
  previousExtras: Array<{ id: string; label: string; priceEur: number }>;
  nextExtras: Array<{ id: string; label: string; priceEur: number }>;
  rentalFromEur?: number;
  rentalToEur?: number;
  rentalLabel?: string;
  deliveryFromEur?: number;
  deliveryToEur?: number;
  deliveryLabel?: string;
  depositPercent?: number;
}): RefundChangeDetail[] {
  const out: RefundChangeDetail[] = [];
  const pct = input.depositPercent;
  const pickupChanged = dayKey(input.pickupFrom) !== dayKey(input.pickupTo);
  const dropoffChanged = dayKey(input.dropoffFrom) !== dayKey(input.dropoffTo);
  if (pickupChanged || dropoffChanged) {
    out.push({
      type: "dates",
      pickupFrom: input.pickupFrom,
      pickupTo: input.pickupTo,
      dropoffFrom: input.dropoffFrom,
      dropoffTo: input.dropoffTo,
    });
  }

  if (input.rentalFromEur != null && input.rentalToEur != null) {
    pushPriceLine(
      out,
      input.rentalLabel || "Rental",
      Number(input.rentalFromEur) || 0,
      Number(input.rentalToEur) || 0,
      pct,
    );
  }
  if (input.deliveryFromEur != null && input.deliveryToEur != null) {
    pushPriceLine(
      out,
      input.deliveryLabel || "Delivery",
      Number(input.deliveryFromEur) || 0,
      Number(input.deliveryToEur) || 0,
      pct,
    );
  }

  const nextById = new Map(input.nextExtras.map((e) => [e.id, e] as const));
  const prevById = new Map(input.previousExtras.map((e) => [e.id, e] as const));

  for (const prev of input.previousExtras) {
    const next = nextById.get(prev.id);
    const from = Number(prev.priceEur) || 0;
    if (!next) {
      if (from > 0) {
        pushPriceLine(out, String(prev.label || "").trim() || prev.id, from, 0, pct);
      }
      continue;
    }
    const to = Number(next.priceEur) || 0;
    pushPriceLine(
      out,
      String(next.label || prev.label || "").trim() || prev.id,
      from,
      to,
      pct,
    );
  }

  for (const next of input.nextExtras) {
    if (prevById.has(next.id)) continue;
    const to = Number(next.priceEur) || 0;
    if (to > 0) {
      pushPriceLine(out, String(next.label || "").trim() || next.id, 0, to, pct);
    }
  }

  return out;
}
