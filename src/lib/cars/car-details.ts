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

/** Write cabinet daily prices into the saved per-car offer list. Other details stay as they are. */
export function descriptionWithCabinetPrices(
  description: string | null | undefined,
  prices: Array<{ extraServiceId: string; slug?: string; name?: string; priceEur: number }>,
): string | null | undefined {
  if (!description || !prices.length) return description;
  const details = parseCarDetails(description);
  const offers = readExtraOffers(details);
  if (!details || !offers.length) return description;
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
    const priceEur = Number(match.priceEur);
    if (!Number.isFinite(priceEur)) return offer;
    const current = Number(offer.priceEur);
    if (Number.isFinite(current) && Math.abs(current - priceEur) < 0.001) return offer;
    changed = true;
    return { ...offer, priceEur };
  });
  if (!changed) return description;
  const blob = `<!--car-details:${JSON.stringify({ ...details, extraOffers })}-->`;
  if (/<!--car-details:[\s\S]*?-->/.test(description)) {
    return description.replace(/<!--car-details:[\s\S]*?-->/, blob);
  }
  return description;
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
    if (offer.forbidden) {
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
