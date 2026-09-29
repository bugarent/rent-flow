import { toNumber } from "@/lib/utils";

export type DeliveryLocationView = {
  id: string;
  airportId: string;
  iata: string;
  label: string;
  country: string;
  countryIso2: string;
  maxDeliveryPriceEur: number;
  isActive: boolean;
  sortOrder: number;
  kind?: "airport" | "city";
  /** City display name when known (e.g. Kutaisi). */
  cityName?: string;
  /** When true, homepage shows the individual/custom booking banner for this pickup. */
  individualBookingEnabled?: boolean;
  /**
   * Admin maximum for the partner "free after N days" field.
   * null = no cap. After this many rental days, delivery may become free;
   * a partner cannot require a longer period.
   */
  maxFreeAfterDays?: number | null;
};

export type PartnerDeliveryInput = {
  deliveryLocationId: string;
  enabled?: boolean;
  priceEur?: number | null;
  freeAfterDays?: number | null;
  travelTimeMinutes?: number | null;
};

export function localizeJsonName(name: unknown, fallback = ""): string {
  if (typeof name === "string" && name.trim()) return name.trim();
  if (name && typeof name === "object" && "en" in name) {
    const en = (name as { en?: unknown }).en;
    if (typeof en === "string" && en.trim()) return en.trim();
  }
  return fallback;
}

/** Admin max free-after days. null/invalid = no cap. 0 is a real maximum. */
export function normalizeMaxFreeAfterDays(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Partner free-after days cannot exceed the admin maximum.
 * A longer period is rewritten to that maximum.
 */
export function capFreeAfterDays(
  maxFreeAfterDays: number | null | undefined,
  requested: number | null | undefined,
): { freeAfterDays: number | null; capped: boolean } {
  const raw =
    requested == null || Number.isNaN(Number(requested))
      ? null
      : Math.max(0, Math.floor(Number(requested)));
  const max = normalizeMaxFreeAfterDays(maxFreeAfterDays);
  if (max == null || raw == null) return { freeAfterDays: raw, capped: false };
  if (raw > max) return { freeAfterDays: max, capped: true };
  return { freeAfterDays: raw, capped: false };
}

/** Cap partner delivery price to admin max; returns adjusted price + whether it was capped. */
export function normalizeDeliveryPrice(
  maxDeliveryPriceEur: number,
  requested: number | null | undefined,
): { priceEur: number; capped: boolean } {
  const max = Math.max(0, toNumber(maxDeliveryPriceEur, 0));
  let price = toNumber(requested, 0);
  if (price < 0) price = 0;
  if (price > max) {
    return { priceEur: max, capped: true };
  }
  return { priceEur: price, capped: false };
}

export type DeliveryAdjustment = {
  deliveryLocationId: string;
  label: string;
  requested: number;
  saved: number;
  max: number;
};

export type ResolvedDeliveryRow = {
  deliveryLocationId: string;
  priceEur: number;
  freeAfterDays: number | null;
  travelTimeMinutes: number;
};

/** Resolve partner delivery selections against active admin locations (caps over-max prices). */
export function resolvePartnerDeliveryPrices(
  catalog: DeliveryLocationView[],
  rawInputs: unknown,
): {
  rows: ResolvedDeliveryRow[];
  adjustments: DeliveryAdjustment[];
} {
  const inputs = Array.isArray(rawInputs) ? (rawInputs as PartnerDeliveryInput[]) : [];
  const byId = new Map(inputs.map((i) => [i.deliveryLocationId, i]));
  const rows: ResolvedDeliveryRow[] = [];
  const adjustments: DeliveryAdjustment[] = [];

  for (const loc of catalog) {
    const input = byId.get(loc.id);
    if (!input || input.enabled === false) continue;
    const requested = toNumber(input.priceEur, 0);
    const { priceEur, capped } = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, requested);
    const freeAfterRaw = input.freeAfterDays;
    const parsedFree =
      freeAfterRaw == null || Number.isNaN(Number(freeAfterRaw))
        ? null
        : Math.max(0, Math.floor(toNumber(freeAfterRaw, 0)));
    const { freeAfterDays } = capFreeAfterDays(loc.maxFreeAfterDays, parsedFree);
    const travelTimeMinutes = Math.max(0, Math.floor(toNumber(input.travelTimeMinutes, 0)));
    rows.push({ deliveryLocationId: loc.id, priceEur, freeAfterDays, travelTimeMinutes });
    if (capped) {
      adjustments.push({
        deliveryLocationId: loc.id,
        label: loc.label,
        requested,
        saved: priceEur,
        max: loc.maxDeliveryPriceEur,
      });
    }
  }

  return { rows, adjustments };
}

/** Delivery fee becomes 0 when rental days exceed freeAfterDays (0/null = never free by duration). */
export function effectiveOneWayDeliveryPrice(
  priceEur: number,
  freeAfterDays: number | null | undefined,
  rentalDays: number,
): number {
  const freeAfter = freeAfterDays == null ? 0 : Math.floor(Number(freeAfterDays) || 0);
  if (freeAfter > 0 && rentalDays > freeAfter) return 0;
  return Math.max(0, priceEur);
}

export function isSyntheticDeliveryId(id: string) {
  return id.startsWith("__city__:") || id.startsWith("__office__:");
}
