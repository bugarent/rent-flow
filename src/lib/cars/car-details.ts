import type { FxRates } from "@/lib/fx";
import { isCurrency, type Currency } from "@/lib/i18n/config";
import { displayStickyMoney, readStickyPin } from "@/lib/partners/pricing-currency";
import { formatMoney, formatMoneyAmount, toNumber } from "@/lib/utils";

/** Parse `<!--car-details:{...}-->` blob from car.description for public/partner UIs. */

export type CarDetailsPricingTier = Array<{
  fromDays: number;
  toDays: number;
  priceEur: string | number;
  /** Amount the partner typed. The listing form shows this again in `enteredCurrency`. */
  enteredAmount?: string;
  enteredCurrency?: string;
}>;

export type CarDetailsBlob = {
  deposit?: string | number;
  /** Amount the partner typed for the refundable deposit. */
  depositEnteredAmount?: string | number;
  /** Currency of `depositEnteredAmount` — display this figure when the site currency matches. */
  depositEnteredCurrency?: string;
  pricingTiers?: CarDetailsPricingTier;
  plate?: string;
  color?: string;
  bodyType?: string;
  [key: string]: unknown;
};

export type CarExtraOffer = {
  extraServiceId: string;
  /** Catalog slug so a file id and a database id for the same service stay the same choice. */
  slug?: string;
  name?: string;
  enabled?: boolean;
  forbidden?: boolean;
  priceEur?: number | string;
};

function offerPlainName(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "en" in value) {
    return String((value as { en?: unknown }).en || "").trim();
  }
  return "";
}

/** Match a saved per-car choice to a catalog row even when the service id changed. */
export function findCarExtraOffer(
  offers: CarExtraOffer[],
  service: { id?: string; slug?: string; name?: unknown },
): CarExtraOffer | undefined {
  const id = String(service.id || "").trim();
  if (id) {
    const byId = offers.find((offer) => offer.extraServiceId === id);
    if (byId) return byId;
  }
  const slug = String(service.slug || "").trim();
  if (slug) {
    const bySlug = offers.find((offer) => String(offer.slug || "") === slug);
    if (bySlug) return bySlug;
  }
  const name = offerPlainName(service.name);
  if (!name) return undefined;
  const byName = offers.filter((offer) => offerPlainName(offer.name) === name);
  return byName.length === 1 ? byName[0] : undefined;
}

export type CabinetExtraSync = {
  extraServiceId: string;
  slug?: string;
  name?: string;
  priceEur: number;
  /** When set, also write enabled/forbidden onto the listing's extraOffers. */
  enabled?: boolean;
  forbidden?: boolean;
};

function cabinetOfferPatch(match: CabinetExtraSync): Pick<CarExtraOffer, "priceEur" | "enabled" | "forbidden"> {
  const forbidden = Boolean(match.forbidden);
  const priceEur = forbidden ? 0 : Number(match.priceEur);
  const enabled = forbidden ? true : match.enabled !== false;
  return {
    priceEur: Number.isFinite(priceEur) ? priceEur : 0,
    enabled,
    forbidden,
  };
}

/** Write cabinet daily prices and offer modes into the saved per-car offer list. */
export function descriptionWithCabinetPrices(
  description: string | null | undefined,
  prices: CabinetExtraSync[],
): string | null | undefined {
  if (!prices.length) return description;
  const rawDescription = description ?? "";
  let details = parseCarDetails(rawDescription);
  // Listings without a car-details blob still need off/forbid stamped for search.
  if (!details) {
    const modeRows = prices.filter((price) => price.forbidden || price.enabled === false);
    if (!modeRows.length) return description;
    details = {};
  }
  const offers = readExtraOffers(details);
  let changed = false;
  const extraOffers = offers.map((offer) => {
    const match = prices.find((price) =>
      findCarExtraOffer([offer], {
        id: price.extraServiceId,
        slug: price.slug,
        name: price.name,
      }),
    );
    if (!match) return offer;
    const patch = cabinetOfferPatch(match);
    const current = Number(offer.priceEur);
    const samePrice =
      Number.isFinite(current) && Math.abs(current - Number(patch.priceEur)) < 0.001;
    const sameMode =
      Boolean(offer.forbidden) === Boolean(patch.forbidden) &&
      (offer.enabled !== false) === Boolean(patch.enabled);
    if (samePrice && sameMode) return offer;
    changed = true;
    return { ...offer, ...patch };
  });
  // Listings with no matching extraOffers still need cabinet off/forbid to stick in search.
  for (const match of prices) {
    if (findCarExtraOffer(extraOffers, { id: match.extraServiceId, slug: match.slug, name: match.name })) {
      continue;
    }
    const patch = cabinetOfferPatch(match);
    if (patch.enabled && !patch.forbidden) continue;
    changed = true;
    extraOffers.push({
      extraServiceId: match.extraServiceId,
      ...(match.slug ? { slug: match.slug } : {}),
      ...(match.name ? { name: match.name } : {}),
      ...patch,
    });
  }
  if (!changed) return description;
  const blob = `<!--car-details:${JSON.stringify({ ...details, extraOffers })}-->`;
  if (/<!--car-details:[\s\S]*?-->/.test(rawDescription)) {
    return rawDescription.replace(/<!--car-details:[\s\S]*?-->/, blob);
  }
  return rawDescription ? `${rawDescription}\n${blob}` : blob;
}

/** Open-ended last tier saved by the car form (`N+` days). */
const OPEN_TIER_TO_DAYS = 9999;

/**
 * Move a car's saved tier prices onto the partner's current day ranges, column by column —
 * the same mapping the car form shows. A range added at the end reuses the price of the one
 * before it; the `N+` price stays on the open-ended tier. Other details stay as they are.
 */
export function descriptionWithTariffRanges(
  description: string | null | undefined,
  intervals: Array<{ fromDays: number; toDays: number }>,
): string | null | undefined {
  if (!description || !intervals.length) return description;
  const details = parseCarDetails(description);
  const tiers = Array.isArray(details?.pricingTiers) ? details.pricingTiers : [];
  if (!details || !tiers.length) return description;

  const sorted = [...tiers].sort((a, b) => (Number(a.fromDays) || 0) - (Number(b.fromDays) || 0));
  const openIndex = sorted.findIndex((t) => (Number(t.toDays) || 0) >= OPEN_TIER_TO_DAYS);
  const bounded = openIndex >= 0 ? sorted.filter((_, i) => i !== openIndex) : sorted;
  const open = openIndex >= 0 ? sorted[openIndex] : undefined;

  let carry = bounded[0];
  const nextTiers: CarDetailsPricingTier = intervals.map((interval, i) => {
    const source = bounded[i] ?? carry;
    carry = source ?? carry;
    return {
      fromDays: interval.fromDays,
      toDays: interval.toDays,
      priceEur: source?.priceEur ?? "",
      ...(source?.enteredAmount
        ? { enteredAmount: source.enteredAmount, enteredCurrency: source.enteredCurrency }
        : {}),
    };
  });
  const openSource = open ?? carry;
  nextTiers.push({
    fromDays: intervals[intervals.length - 1].toDays + 1,
    toDays: OPEN_TIER_TO_DAYS,
    priceEur: openSource?.priceEur ?? "",
    ...(openSource?.enteredAmount
      ? { enteredAmount: openSource.enteredAmount, enteredCurrency: openSource.enteredCurrency }
      : {}),
  });

  const same =
    nextTiers.length === tiers.length &&
    nextTiers.every((t, i) => {
      const old = sorted[i];
      return (
        old &&
        Number(old.fromDays) === t.fromDays &&
        Number(old.toDays) === t.toDays &&
        String(old.priceEur) === String(t.priceEur)
      );
    });
  if (same) return description;

  const blob = `<!--car-details:${JSON.stringify({ ...details, pricingTiers: nextTiers })}-->`;
  return description.replace(/<!--car-details:[\s\S]*?-->/, blob);
}

/**
 * Public search and checkout price a trip with the same day columns the partner
 * sees on the car form. Saved prices stay in their columns; only the day ranges move.
 */
export function descriptionForPublicPricing(
  description: string | null | undefined,
  intervals: Array<{ fromDays: number; toDays: number }>,
): string | null | undefined {
  if (!description || !intervals.length) return description;
  return descriptionWithTariffRanges(description, intervals) ?? description;
}

export function readExtraOffers(details: CarDetailsBlob | null | undefined): CarExtraOffer[] {
  const raw = details && Array.isArray(details.extraOffers) ? details.extraOffers : [];
  return raw.filter(
    (offer): offer is CarExtraOffer =>
      Boolean(offer) && typeof offer === "object" && typeof (offer as CarExtraOffer).extraServiceId === "string",
  );
}

export function extraOfferMode(offer: { enabled?: boolean; forbidden?: boolean } | undefined): "on" | "off" | "forbidden" {
  if (!offer) return "on";
  if (offer.forbidden) return "forbidden";
  if (offer.enabled === false) return "off";
  return "on";
}

/** Compact admin reason: `Name<TAB>from<TAB>to` lines joined by `; `. */
export function extrasModerationChange(
  beforeDescription: string | null | undefined,
  beforeExtras: Array<{
    extraServiceId?: string;
    forbidden?: boolean;
    extraService?: { name?: unknown };
  }>,
  afterDescription: string | null | undefined,
): string | null {
  const beforeDetails = parseCarDetails(beforeDescription);
  const savedBefore = readExtraOffers(beforeDetails);
  const previous: CarExtraOffer[] = savedBefore.length
    ? savedBefore
    : beforeExtras.flatMap((row) => {
        const id = String(row.extraServiceId || "").trim();
        if (!id) return [];
        const rawName = row.extraService?.name;
        const name =
          typeof rawName === "string"
            ? rawName
            : rawName && typeof rawName === "object" && "en" in rawName
              ? String((rawName as { en?: unknown }).en || "")
              : "";
        return [
          {
            extraServiceId: id,
            name,
            enabled: !row.forbidden,
            forbidden: Boolean(row.forbidden),
          },
        ];
      });
  const next = readExtraOffers(parseCarDetails(afterDescription));
  if (!next.length && !previous.length) return null;
  const prevById = new Map(previous.map((offer) => [offer.extraServiceId, offer]));
  const nextById = new Map(next.map((offer) => [offer.extraServiceId, offer]));
  const lines: string[] = [];
  for (const id of new Set([...prevById.keys(), ...nextById.keys()])) {
    const fromOffer = prevById.get(id);
    const toOffer = nextById.get(id);
    const from = extraOfferMode(fromOffer);
    const to = extraOfferMode(toOffer);
    if (from === to) continue;
    const name = String(toOffer?.name || fromOffer?.name || id).replace(/[\t;]/g, " ");
    lines.push(`${name}\t${from}\t${to}`);
  }
  return lines.length ? lines.join("; ") : null;
}

export function filterExtrasByCarOffers<
  T extends {
    extraServiceId: string;
    forbidden?: boolean;
    priceEur?: unknown;
    extraService?: { slug?: string; name?: unknown } | null;
  },
>(
  extras: T[],
  description: string | null | undefined,
): T[] {
  const offers = readExtraOffers(parseCarDetails(description));
  if (!offers.length) return extras;
  const next: T[] = [];
  for (const row of extras) {
    const offer = findCarExtraOffer(offers, {
      id: row.extraServiceId,
      slug: row.extraService?.slug,
      name: row.extraService?.name,
    });
    if (!offer) {
      next.push(row);
      continue;
    }
    // Cabinet hydrate may already mark forbidden; do not clear it when a stale offer still says "on".
    if (row.forbidden || offer.forbidden) {
      next.push({ ...row, forbidden: true, priceEur: 0 });
      continue;
    }
    if (offer.enabled === false) continue;
    next.push({ ...row, forbidden: false });
  }
  return next;
}

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

/**
 * Refundable deposit as the partner set it. When they typed 200 USD, USD viewers
 * always see 200$ — FX moves must not rewrite that figure via the EUR snapshot.
 */
export function formatDepositLabel(
  details: CarDetailsBlob | null | undefined,
  formatOrOpts:
    | ((amountEur: number) => string)
    | {
        currency: Currency;
        rates: FxRates;
        formatEur?: (amountEur: number) => string;
      } = (n) => formatMoney(n, "EUR"),
): string {
  if (!details) return "—";
  if (typeof formatOrOpts === "function") {
    const n = Number(details.deposit);
    if (!Number.isFinite(n)) return "—";
    return formatOrOpts(n);
  }
  const { currency, rates, formatEur } = formatOrOpts;
  const pin = readStickyPin({
    enteredAmount: details.depositEnteredAmount,
    enteredCurrency: details.depositEnteredCurrency,
    priceEur: details.deposit,
  });
  const entered = String(pin.amount || "").trim();
  if (entered && isCurrency(pin.currency)) {
    if (pin.currency === currency) {
      const amount = toNumber(entered, Number.NaN);
      return Number.isFinite(amount) ? formatMoneyAmount(amount, currency) : "—";
    }
    const shown = displayStickyMoney(pin, currency, rates);
    const amount = toNumber(shown, Number.NaN);
    return Number.isFinite(amount) ? formatMoneyAmount(amount, currency) : "—";
  }
  const n = Number(details.deposit);
  if (!Number.isFinite(n)) return "—";
  return formatEur ? formatEur(n) : formatMoney(n, currency, rates);
}
