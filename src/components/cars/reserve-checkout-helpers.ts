import { cityStreetLabel, findSearchPlace } from "@/lib/catalog/search-places";
import {
  isExtraChargeFree,
  isFreeCancellation48Extra,
  isMandatoryFreeExtra,
  isPeriodForcedFreeExtra,
  localizeExtraName,
  toExtraServicePricing,
} from "@/lib/extras/pricing";
import {
  isProtectionInsuranceSlot,
  resolveCheckoutSlot,
  type InsuranceCheckoutSlot,
} from "@/lib/extras/checkout-slot";
import { pickServiceLabel } from "@/lib/extras/service-label";
import { toNumber } from "@/lib/utils";

export { isFreeCancellation48Extra };

export type ReservePaidExtra = {
  id: string;
  name: string;
  description?: string;
  priceEur: number;
  /** Cap for the whole rental. Null/absent = no ceiling. */
  maxPeriodEur?: number | null;
  /** Floor for the whole rental when the service is selected. */
  minPeriodEur?: number | null;
  checkoutSlot?: InsuranceCheckoutSlot | "none";
  /** Partner €0 offer — optional; customer can turn on/off */
  free?: boolean;
  /** Admin mandatory free / TPL — always on, not toggled off */
  locked?: boolean;
  /** Partner forbidden territory/service notice — not purchasable */
  forbidden?: boolean;
  slug?: string;
  /** Admin catalog display order */
  sortOrder?: number;
};

export type ReserveCarPayload = {
  id: string;
  title?: string;
  make?: string;
  model?: string;
  year?: number;
  seats?: number;
  doors?: number;
  transmission?: string;
  fuelType?: string;
  dailyRateEur?: unknown;
  discountPercent?: unknown;
  description?: string;
  photos?: Array<{ url: string }>;
  extras?: Array<{
    extraServiceId?: string;
    priceEur?: unknown;
    forbidden?: boolean;
    extraService?: {
      id?: string;
      slug?: string;
      name?: unknown;
      description?: unknown;
      isTpl?: boolean;
      isActive?: boolean;
      minPriceEur?: unknown;
      maxPriceEur?: unknown;
      maxPeriodEur?: unknown;
      minPeriodEur?: unknown;
      sortOrder?: unknown;
      checkoutSlot?: unknown;
    } | null;
  }>;
  partner?: {
    companyName?: string;
    logoUrl?: string | null;
    reviews?: Array<{ averageRating: number }>;
  };
};

const SHORT_MONTHS: Record<string, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ka: ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  pl: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatTripDate(value: string, locale?: string) {
  if (!value) return "—";
  const raw = String(value).trim();
  const wall = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  let year: number;
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;
  if (wall) {
    year = Number(wall[1]);
    month = Number(wall[2]);
    day = Number(wall[3]);
    hour = Number(wall[4] ?? "10");
    minute = Number(wall[5] ?? "0");
  } else {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
    hour = d.getHours();
    minute = d.getMinutes();
  }
  if (![year, month, day, hour, minute].every((n) => Number.isFinite(n))) return raw;
  const months = SHORT_MONTHS[locale || ""] || SHORT_MONTHS.en;
  const monthLabel = months[month - 1] || pad2(month);
  const time = `${pad2(hour)}:${pad2(minute)}`;
  if (locale === "ka") return `${day} ${monthLabel} ${year}, ${time}`;
  if (locale === "ru") return `${day} ${monthLabel} ${year}, ${time}`;
  if (locale === "pl") return `${day} ${monthLabel} ${year}, ${time}`;
  if (locale === "ar") return `${day} ${monthLabel} ${year}, ${time}`;
  if (locale === "de") return `${day}. ${monthLabel} ${year}, ${time}`;
  if (locale === "fr") return `${day} ${monthLabel} ${year}, ${time}`;
  return `${monthLabel} ${day}, ${year}, ${time}`;
}

export function locationLabel(code: string, options?: { airportSuffix?: string }) {
  const place = findSearchPlace(code);
  if (!place) return code;
  if (place.kind === "airport" && place.iata) {
    const suffix = options?.airportSuffix ?? "Airport";
    return `${place.cityName} ${suffix} [${place.iata}]`;
  }
  return place.cityName || place.label;
}

/** Pickup/return line: city plus the street and number when the customer chose a city address. */
export function tripLocationLabel(
  code: string,
  street: string | null | undefined,
  options?: { airportSuffix?: string },
) {
  return cityStreetLabel(code, street) || locationLabel(code, options);
}

export function isAdditionalDriverExtra(extra: { id: string; name: string; checkoutSlot?: string }) {
  if (extra.checkoutSlot === "driver") return true;
  const hay = `${extra.id} ${extra.name}`.toLowerCase();
  return /additional[-_\s]?driver|დამატებითი მძღოლ|доп(\.|олнительн).*вод|conducteur additionnel|zusatzfahrer|dodatkow(y|ego) kierowc/.test(
    hay,
  );
}

function mapCarExtraRow(row: NonNullable<ReserveCarPayload["extras"]>[number]): ReservePaidExtra | null {
  const svc = row.extraService;
  const id = String(svc?.id || row.extraServiceId || "").trim();
  if (!id || !svc || svc.isActive === false) return null;
  const name = pickServiceLabel(localizeExtraName(svc.name, ""));
  if (!name) return null;
  const description = localizeExtraName(svc?.description, "");
  const slug = String(svc?.slug || id);
  const sortOrder = Math.max(0, toNumber(svc?.sortOrder, 100));
  const priced = svc
    ? toExtraServicePricing({
        id,
        slug,
        name: svc.name,
        description: svc.description,
        isTpl: Boolean(svc.isTpl),
        isActive: true,
        sortOrder,
        defaultPriceEur: row.priceEur ?? 0,
        minPriceEur: svc.minPriceEur,
        maxPriceEur: svc.maxPriceEur,
        maxPeriodEur: svc.maxPeriodEur,
        checkoutSlot: svc.checkoutSlot,
      })
    : null;
  const checkoutSlot = resolveCheckoutSlot({
    checkoutSlot: svc?.checkoutSlot ?? priced?.checkoutSlot,
    slug,
    isTpl: Boolean(svc?.isTpl),
    name,
  });
  if (row.forbidden) {
    return {
      id,
      name,
      description,
      priceEur: 0,
      checkoutSlot,
      forbidden: true,
      slug,
      sortOrder,
    };
  }
  const freeCancel48 = isFreeCancellation48Extra({ slug, name, id });
  const mandatoryFree = priced
    ? isMandatoryFreeExtra({ ...priced, slug, name, id })
    : Boolean(svc?.isTpl) && !freeCancel48;
  const periodFree = priced
    ? isPeriodForcedFreeExtra(priced)
    : svc?.maxPeriodEur != null && Number(svc.maxPeriodEur) === 0;
  const rawPrice = Math.max(0, toNumber(row.priceEur, 0));
  const minPeriodEur =
    periodFree || mandatoryFree
      ? null
      : toNumber(svc?.minPeriodEur, 0) > 0
        ? toNumber(svc?.minPeriodEur)
        : null;
  const maxPeriodEur =
    periodFree || mandatoryFree
      ? null
      : priced?.maxPeriodEur != null && Number(priced.maxPeriodEur) > 0
        ? Number(priced.maxPeriodEur)
        : null;
  // Daily €0 is free only when there is no selection minimum. Keep min/max for clamp(daily×days).
  // Free cancellation 48 is free but never locked (exclusive with paid protection).
  const partnerFree =
    !mandatoryFree &&
    !periodFree &&
    !freeCancel48 &&
    isExtraChargeFree(rawPrice, minPeriodEur, maxPeriodEur);
  const free = mandatoryFree || periodFree || partnerFree || freeCancel48;
  return {
    id,
    name,
    description,
    priceEur: free && minPeriodEur == null ? 0 : rawPrice,
    maxPeriodEur: periodFree ? 0 : maxPeriodEur,
    minPeriodEur,
    checkoutSlot,
    free,
    locked: mandatoryFree,
    slug,
    sortOrder,
  };
}

function byAdminSortOrder(a: ReservePaidExtra, b: ReservePaidExtra) {
  return (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name);
}

/** Paid extras for the general “Additional services” list (not protection insurance). */
export function listPaidExtras(car: ReserveCarPayload): ReservePaidExtra[] {
  const rows: ReservePaidExtra[] = [];
  for (const row of car.extras ?? []) {
    const mapped = mapCarExtraRow(row);
    if (!mapped) continue;
    if (mapped.forbidden) continue;
    // Additional driver lives with paid extras; TPL/basic/full stay in insurance panel.
    if (isProtectionInsuranceSlot(mapped.checkoutSlot)) continue;
    rows.push(mapped);
  }
  return rows.sort(byAdminSortOrder);
}

/** Forbidden territory/service notices — shown at the bottom of additional services. */
export function listForbiddenExtras(car: ReserveCarPayload): ReservePaidExtra[] {
  const rows: ReservePaidExtra[] = [];
  for (const row of car.extras ?? []) {
    const mapped = mapCarExtraRow(row);
    if (!mapped?.forbidden) continue;
    if (isProtectionInsuranceSlot(mapped.checkoutSlot)) continue;
    rows.push(mapped);
  }
  return rows.sort(byAdminSortOrder);
}

/** Insurance packs driven by admin extras with protection checkout slots (TPL/basic/full). */
export function listInsuranceExtras(car: ReserveCarPayload): ReservePaidExtra[] {
  const bySlot = new Map<InsuranceCheckoutSlot, ReservePaidExtra>();
  for (const row of car.extras ?? []) {
    const mapped = mapCarExtraRow(row);
    if (!mapped || mapped.forbidden || !isProtectionInsuranceSlot(mapped.checkoutSlot)) continue;
    if (!bySlot.has(mapped.checkoutSlot)) {
      bySlot.set(mapped.checkoutSlot, mapped);
    }
  }
  return [...bySlot.values()].sort(byAdminSortOrder);
}
