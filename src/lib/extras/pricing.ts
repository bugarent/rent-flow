import { toNumber } from "@/lib/utils";
import { readExtraI18n, type ExtraCopyBag } from "@/lib/extras/localized-copy";
import {
  extractCheckoutSlotFromDescription,
  extractStoredMaxPeriod,
  resolveCheckoutSlot,
  type ExtraCheckoutSlot,
} from "@/lib/extras/checkout-slot";

export type ExtraPricingMode = "toggle" | "free" | "ranged";

export type ExtraServicePricing = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  /** Machine and catalog translations of `name`. */
  nameI18n?: ExtraCopyBag;
  /** Machine and catalog translations of `description`. */
  descriptionI18n?: ExtraCopyBag;
  isTpl: boolean;
  isActive: boolean;
  sortOrder: number;
  defaultPriceEur: number;
  minPriceEur: number | null;
  maxPriceEur: number | null;
  /** Cap on this extra for the whole rental (EUR). Null = no cap. Charged amount is min(daily × days, cap). */
  maxPeriodEur: number | null;
  mode: ExtraPricingMode;
  checkoutSlot: ExtraCheckoutSlot;
};

export type PartnerExtraInput = {
  extraServiceId: string;
  /** For ranged: daily price. For toggle: ignored when enabled. For free: ignored (always 0). */
  priceEur?: number | null;
  /** For toggle mode: whether the partner enables the extra. Free mode is always on. */
  enabled?: boolean;
  /** Partner forbidden notice — attached at €0, not purchasable. */
  forbidden?: boolean;
};

export function localizeExtraName(name: unknown, fallback = "Extra"): string {
  if (typeof name === "string" && name.trim()) return name.trim();
  if (name && typeof name === "object" && "en" in name) {
    const en = (name as { en?: unknown }).en;
    if (typeof en === "string" && en.trim()) return en.trim();
  }
  return fallback;
}

/**
 * Admin limits (min/day, max/day, max period): empty or 0 = no limit for the partner,
 * any positive number = that bound. A 0 never makes a service free; the partner always
 * sets the daily price inside whatever bounds exist.
 */
export function resolveExtraPricingMode(
  _minPriceEur?: number | null,
  _maxPriceEur?: number | null,
): ExtraPricingMode {
  return "ranged";
}

/** Admin limit: positive number = bound, empty / 0 / invalid = no limit. */
export function adminLimit(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : null;
}

/** Catalog “Free cancellation 48” — optional free; mutually exclusive with paid cancellation protection. */
export function isFreeCancellation48Extra(extra: {
  slug?: string | null;
  name?: string | null;
  id?: string | null;
}): boolean {
  const slug = String(extra.slug || "").toLowerCase().trim();
  if (slug === "free-cancellation" || slug.includes("free-cancel")) return true;
  const id = String(extra.id || "").toLowerCase();
  if (id.includes("free-cancel")) return true;
  const name = String(extra.name || "").toLowerCase();
  if (name.includes("free cancellation 48")) return true;
  if (name.includes("უფასო გაუქმება") && name.includes("48")) return true;
  return (
    name.includes("cancellation") &&
    name.includes("48") &&
    (name.includes("free") || name.includes("უფასო"))
  );
}

type MandatoryCandidate = {
  isTpl?: boolean;
  mode?: ExtraPricingMode;
  minPriceEur?: number | null;
  maxPriceEur?: number | null;
  slug?: string | null;
  name?: string | null;
  id?: string | null;
};

/** Admin mandatory (stored as `isTpl`): always offered by the partner and locked on at checkout. */
export function isMandatoryExtra(service: MandatoryCandidate): boolean {
  // Free cancel-48 must stay toggleable so it can yield to paid cancellation protection.
  if (isFreeCancellation48Extra(service)) return false;
  return Boolean(service.isTpl);
}

/** System TPL pack: the only mandatory extra that is always a free inclusion. */
function isCoreTplExtra(service: MandatoryCandidate): boolean {
  return String(service.slug || "").toLowerCase().trim() === "tpl";
}

/** Admin-mandatory extra the partner prices within the admin bounds (no bound = any amount). */
export function isMandatoryPricedExtra(service: MandatoryCandidate): boolean {
  return isMandatoryExtra(service) && !isCoreTplExtra(service);
}

/** True when the extra is a locked €0 inclusion (system TPL). */
export function isMandatoryFreeExtra(service: MandatoryCandidate): boolean {
  return isMandatoryExtra(service) && isCoreTplExtra(service);
}

/** Admin period 0 means "no period limit", so no catalog value forces a free rental. */
export function isPeriodForcedFreeExtra(_service: {
  maxPeriodEur?: number | null;
}): boolean {
  return false;
}

export function toExtraServicePricing(row: {
  id: string;
  slug: string;
  name: unknown;
  description?: unknown;
  isTpl: boolean;
  isActive: boolean;
  sortOrder: number;
  defaultPriceEur: unknown;
  minPriceEur?: unknown;
  maxPriceEur?: unknown;
  maxPeriodEur?: unknown;
  checkoutSlot?: unknown;
  nameI18n?: ExtraCopyBag;
  descriptionI18n?: ExtraCopyBag;
}): ExtraServicePricing {
  const minPriceEur = adminLimit(row.minPriceEur);
  const maxPriceEur = adminLimit(row.maxPriceEur);
  let maxPeriodEur = adminLimit(row.maxPeriodEur);
  if (row.maxPeriodEur === undefined) {
    const embedded = extractStoredMaxPeriod(row.description);
    if (embedded.present) maxPeriodEur = adminLimit(embedded.value);
  }
  const name = localizeExtraName(row.name);
  const description = localizeExtraName(row.description, "");
  const nameI18n = { ...readExtraI18n(row.name), ...(row.nameI18n || {}) };
  const descriptionI18n = { ...readExtraI18n(row.description), ...(row.descriptionI18n || {}) };
  const checkoutSlot = resolveCheckoutSlot({
    checkoutSlot: row.checkoutSlot ?? extractCheckoutSlotFromDescription(row.description),
    slug: row.slug,
    isTpl: row.isTpl,
    name,
  });

  return {
    id: row.id,
    slug: row.slug,
    name,
    description,
    nameI18n: Object.keys(nameI18n).length ? nameI18n : undefined,
    descriptionI18n: Object.keys(descriptionI18n).length ? descriptionI18n : undefined,
    isTpl: row.isTpl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    defaultPriceEur: toNumber(row.defaultPriceEur, 0),
    minPriceEur,
    maxPriceEur,
    maxPeriodEur,
    mode: resolveExtraPricingMode(minPriceEur, maxPriceEur),
    checkoutSlot,
  };
}

/**
 * Apply admin pricing rules to a partner-submitted extra selection.
 * Returns null if the partner disables a toggle-mode extra (should not create CarExtra).
 * Mandatory free extras are always attached at €0.
 */
export function normalizePartnerExtraPrice(
  service: ExtraServicePricing,
  input: PartnerExtraInput,
): { extraServiceId: string; priceEur: number; forbidden?: boolean } | null {
  if (isMandatoryPricedExtra(service)) {
    return {
      extraServiceId: service.id,
      priceEur: clampPartnerDailyPrice(service.minPriceEur, service.maxPriceEur, toNumber(input.priceEur, 0)),
    };
  }
  if (service.mode === "free" || service.isTpl) {
    return { extraServiceId: service.id, priceEur: 0 };
  }

  if (input.forbidden) {
    return { extraServiceId: service.id, priceEur: 0, forbidden: true };
  }

  if (isPeriodForcedFreeExtra(service)) {
    if (input.enabled === false) return null;
    return { extraServiceId: service.id, priceEur: 0 };
  }

  if (service.mode === "toggle") {
    if (!input.enabled) return null;
    return { extraServiceId: service.id, priceEur: 0 };
  }

  // Ranged: partner offers it with a daily price in [min, max] (max null = no ceiling).
  if (input.enabled === false) return null;
  let price = toNumber(input.priceEur, service.defaultPriceEur);
  const min = adminLimit(service.minPriceEur) ?? 0;
  const max = adminLimit(service.maxPriceEur);

  if (!Number.isFinite(price) || price < 0) price = min;
  if (price < min) price = min;
  if (max != null && price > max) price = max;

  return { extraServiceId: service.id, priceEur: price };
}

/**
 * Partner daily price stays inside the admin min/max.
 * 0 and 10 means any amount up to 10. A higher or lower number
 * is rewritten to that bound. Empty or 0 admin maximum means no ceiling.
 */
export function clampPartnerDailyPrice(
  minPriceEur: number | null | undefined,
  maxPriceEur: number | null | undefined,
  price: number | null | undefined,
): number {
  const min = adminLimit(minPriceEur) ?? 0;
  const max = adminLimit(maxPriceEur);
  let n = Number(price);
  if (!Number.isFinite(n) || n < 0) n = min;
  if (n < min) n = min;
  if (max != null && n > max) n = max;
  if (max != null && n < min) n = max;
  return Number(n.toFixed(2));
}

/**
 * Partner "max for the rental" cannot exceed the admin period maximum.
 * Empty or 0 admin maximum means no period ceiling.
 */
export function capPartnerMaxPeriod(
  adminMax: number | null | undefined,
  requested: number | null | undefined,
): { maxPeriodEur: number | null; capped: boolean } {
  if (isPeriodForcedFreeExtra({ maxPeriodEur: adminMax == null ? null : Number(adminMax) })) {
    return { maxPeriodEur: null, capped: true };
  }
  const partner = optionalPeriodMoney(requested);
  const admin = optionalPeriodMoney(adminMax);
  if (admin == null || partner == null) return { maxPeriodEur: partner, capped: false };
  if (partner > admin) return { maxPeriodEur: admin, capped: true };
  return { maxPeriodEur: partner, capped: false };
}

/** Positive money, or null when the partner left the floor/cap empty. */
export function optionalPeriodMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Number(n.toFixed(2));
}

/** Admin period field as stored: empty = null; 0 is kept and read back as "no limit". */
export function optionalAdminPeriodMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Number(n.toFixed(2));
}

/**
 * Partner period floor/cap, still respecting an admin catalog ceiling when one exists.
 * Admin period 0 means no ceiling. The floor never sits above the ceiling.
 */
export function effectivePeriodBounds(
  catalogMax: number | null | undefined,
  partnerMax: number | null | undefined,
  partnerMin: number | null | undefined,
): { minPeriodEur: number | null; maxPeriodEur: number | null } {
  if (isPeriodForcedFreeExtra({ maxPeriodEur: catalogMax == null ? null : Number(catalogMax) })) {
    return { minPeriodEur: null, maxPeriodEur: 0 };
  }
  const ceilings = [catalogMax, partnerMax]
    .map((n) => (n == null ? NaN : Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  const maxPeriodEur = ceilings.length ? Math.min(...ceilings) : null;
  let minPeriodEur = optionalPeriodMoney(partnerMin);
  if (minPeriodEur != null && maxPeriodEur != null && minPeriodEur > maxPeriodEur) {
    minPeriodEur = maxPeriodEur;
  }
  return { minPeriodEur, maxPeriodEur };
}

/**
 * Charge for one extra over the rental.
 * Total = daily × days, then raised to the minimum (if set) and cut at the maximum (if set).
 * Empty / 0 period max means no ceiling.
 * Daily €0 with a selection minimum still charges that floor (not “free”).
 */
export function extraPeriodCharge(
  dailyPrice: number,
  days: number,
  qty = 1,
  maxPeriodEur?: number | null,
  minPeriodEur?: number | null,
): number {
  const dayCount = Math.max(1, Number(days) || 1);
  const units = Math.max(0, Number(qty) || 0);
  const daily = Math.max(0, Number(dailyPrice) || 0);
  let amount = daily * units * dayCount;
  const capRaw = maxPeriodEur == null ? NaN : Number(maxPeriodEur);
  const floorRaw = minPeriodEur == null ? NaN : Number(minPeriodEur);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw * units : null;
  const floor = Number.isFinite(floorRaw) && floorRaw > 0 ? floorRaw * units : null;
  if (floor != null) amount = Math.max(amount, floor);
  if (cap != null) amount = Math.min(amount, cap);
  return amount;
}

/**
 * Whether the customer pays €0 for this extra (any rental length).
 * Daily €0 alone is free only when there is no selection minimum.
 */
export function isExtraChargeFree(
  dailyPrice: number,
  minPeriodEur?: number | null,
  _maxPeriodEur?: number | null,
): boolean {
  if (optionalPeriodMoney(minPeriodEur) != null) return false;
  return Math.max(0, Number(dailyPrice) || 0) <= 0;
}

export function slugifyExtraName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `extra-${Date.now().toString(36)}`;
}

/** Customer-facing free inclusions from a car's attached extras (+ optional global free catalog). */
export function listMandatoryFreeInclusions(
  carExtras: Array<{
    extraService?: {
      id?: string;
      name?: unknown;
      description?: unknown;
      isTpl?: boolean;
      isActive?: boolean;
      minPriceEur?: unknown;
      maxPriceEur?: unknown;
    } | null;
  }>,
  catalogFree?: ExtraServicePricing[],
): Array<{ id: string; name: string; description?: string }> {
  const byId = new Map<string, { id: string; name: string; description?: string }>();

  for (const row of carExtras) {
    const svc = row.extraService;
    if (!svc?.id || svc.isActive === false) continue;
    const priced = toExtraServicePricing({
      id: svc.id,
      slug: svc.id,
      name: svc.name,
      description: svc.description,
      isTpl: Boolean(svc.isTpl),
      isActive: true,
      sortOrder: 0,
      defaultPriceEur: 0,
      minPriceEur: svc.minPriceEur,
      maxPriceEur: svc.maxPriceEur,
    });
    if (!isMandatoryFreeExtra(priced)) continue;
    byId.set(priced.id, {
      id: priced.id,
      name: priced.name,
      description: priced.description,
    });
  }

  for (const service of catalogFree ?? []) {
    if (!service.isActive || !isMandatoryFreeExtra(service)) continue;
    if (!byId.has(service.id)) {
      byId.set(service.id, {
        id: service.id,
        name: service.name,
        description: service.description,
      });
    }
  }

  return [...byId.values()];
}
