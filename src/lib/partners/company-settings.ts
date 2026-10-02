import {
  emptySeasonalPricing,
  parseSeasonalPricing,
  type PartnerSeasonPeriod,
  type PartnerSeasonalPricing,
} from "@/lib/partners/seasonal-pricing";
import { parsePartnerMessengers, type PartnerSocialPlatform } from "@/lib/partner";

export type { PartnerSocialPlatform };
/** Currencies partners may price in. Public site still converts from EUR via FX. */
export const PARTNER_PRICING_CURRENCIES = ["USD", "EUR", "GEL"] as const;
export type PartnerPricingCurrency = (typeof PARTNER_PRICING_CURRENCIES)[number];
export const DEFAULT_PARTNER_PRICING_CURRENCY: PartnerPricingCurrency = "USD";

export const PARTNER_PRICING_CURRENCY_LABELS: Record<PartnerPricingCurrency, string> = {
  USD: "USD $",
  EUR: "EUR €",
  GEL: "GEL ₾",
};

export function isPartnerPricingCurrency(value: unknown): value is PartnerPricingCurrency {
  return (
    typeof value === "string" &&
    (PARTNER_PRICING_CURRENCIES as readonly string[]).includes(value.toUpperCase())
  );
}

export function parsePartnerPricingCurrency(value: unknown): PartnerPricingCurrency {
  if (typeof value !== "string") return DEFAULT_PARTNER_PRICING_CURRENCY;
  const upper = value.trim().toUpperCase();
  return isPartnerPricingCurrency(upper) ? upper : DEFAULT_PARTNER_PRICING_CURRENCY;
}

export type WorkingDayConfig = {
  enabled: boolean;
  start: string; // HH:MM
  end: string;
};

export type TariffInterval = {
  fromDays: number;
  toDays: number;
};

/** Next row always starts at previous “to” + 1. First row always starts at 1. */
export function normalizeTariffIntervals(
  rows: TariffInterval[],
  maxIntervals = 8,
): TariffInterval[] {
  const tariffs: TariffInterval[] = [];
  for (let i = 0; i < Math.min(rows.length, maxIntervals); i++) {
    const fromDays = i === 0 ? 1 : tariffs[i - 1].toDays + 1;
    if (fromDays > 999) break;
    let toDays = Math.floor(Number(rows[i]?.toDays));
    if (!Number.isFinite(toDays) || toDays < fromDays) toDays = fromDays;
    toDays = Math.min(999, toDays);
    tariffs.push({ fromDays, toDays });
  }
  return tariffs;
}

/** First day of the open-ended last bucket (shown as N+). */
export function tariffPlusFromDays(tariffs: TariffInterval[]): number {
  const last = tariffs[tariffs.length - 1];
  return last ? last.toDays + 1 : 31;
}

export type PartnerCompanySettings = {
  /** Public brand / trade name shown on car listings with the logo. */
  title: string;
  /** Person name. `legalName` stays the joined value for invoices and older readers. */
  firstName: string;
  lastName: string;
  legalName: string;
  country: string;
  centralOffice: string;
  address: string;
  /** Locale codes the partner can speak with customers (site header languages). */
  clientLanguages: string[];
  logoUrl: string;
  primaryPhone: string;
  secondaryPhone: string;
  /** Messengers active on the primary phone — at least one required. */
  primaryMessengers: PartnerSocialPlatform[];
  /** Messengers active on the secondary phone — at least one required. */
  secondaryMessengers: PartnerSocialPlatform[];
  email: string;
  website: string;
  /** Countries where the partner delivers cars (ISO2). Drives Create-auto pickup locations. */
  deliveryCountryIso2s: string[];
  /**
   * Delivery location ids (or place codes until save resolves them).
   * Remembered for the partner even when admin hides the place from homepage search.
   */
  deliveryLocationIds: string[];
  workingDays: Record<string, WorkingDayConfig>;
  prepMinutes: number;
  publicHolidays: string[];
  offHoursService: boolean;
  /** Off-hours fee in `pricingCurrency` (partner working currency). */
  offHoursPrice: string;
  /**
   * Currency the partner uses when entering prices (create-auto, off-hours, etc.).
   * Default USD. Car listing rates are converted to EUR for storage; public pages
   * convert EUR → the visitor’s selected header currency.
   */
  pricingCurrency: PartnerPricingCurrency;
  rentPaymentMethods: string[];
  requireCreditCard: boolean;
  depositMethods: string[];
  cashDepositRefundDays: number;
  tariffs: TariffInterval[];
  seasonalPricing: PartnerSeasonalPricing;
  yearFullySeasonal: boolean;
  /** Public URL of the rental contract PDF (or image) shown to customers at checkout. */
  contractUrl: string;
  /** When true and contractUrl is set, checkout uses the partner’s own contract. */
  partnerContractActive: boolean;
  /** When true (and partner contract is not active), checkout uses the platform site contract. */
  useSiteContract: boolean;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const WORKING_DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const RENT_PAYMENT_OPTIONS = [
  "Cash",
  "Visa",
  "MasterCard",
  "American Express",
  "MIR",
  "UnionPay",
  "СБП",
  "Stablecoins (USDT, USDC, BUSD)",
  "Crypto (any coins)",
] as const;

export const DEPOSIT_METHOD_OPTIONS = [
  "Cash",
  "Visa debit",
  "MasterCard debit",
  "American Express debit",
  "MIR debit",
  "UnionPay debit",
  "Visa credit",
  "MasterCard credit",
  "American Express credit",
  "MIR credit",
  "UnionPay credit",
  "Stablecoins (USDT, USDC, BUSD)",
  "Crypto (any coins)",
] as const;

function defaultWorkingDays(): Record<string, WorkingDayConfig> {
  const out: Record<string, WorkingDayConfig> = {};
  for (const d of DAYS) {
    out[d] = {
      enabled: d !== "sunday",
      start: "09:00",
      end: "21:00",
    };
  }
  return out;
}

export function defaultCompanySettings(
  seed?: Partial<{
    companyName: string;
    email: string;
    phone: string;
    secondaryPhone: string | null;
    messengers?: unknown;
    primaryMessengers?: unknown;
    secondaryMessengers?: unknown;
    messenger?: string | null;
    deliveryCountryIso2s?: string[];
  }>,
): PartnerCompanySettings {
  const legacy = parsePartnerMessengers(seed?.messengers, seed?.messenger);
  const primaryMessengers = parsePartnerMessengers(seed?.primaryMessengers).length
    ? parsePartnerMessengers(seed?.primaryMessengers)
    : legacy;
  const secondaryMessengers = parsePartnerMessengers(seed?.secondaryMessengers);
  return {
    title: seed?.companyName ?? "",
    firstName: "",
    lastName: "",
    legalName: seed?.companyName ?? "",
    country: "GE",
    centralOffice: "Kutaisi",
    address: "",
    clientLanguages: ["en"],
    logoUrl: "",
    primaryPhone: seed?.phone ?? "",
    secondaryPhone: seed?.secondaryPhone ?? "",
    primaryMessengers,
    secondaryMessengers,
    email: seed?.email ?? "",
    website: "",
    deliveryCountryIso2s: Array.isArray(seed?.deliveryCountryIso2s)
      ? seed!.deliveryCountryIso2s!.map((c) => String(c).toUpperCase())
      : ["GE"],
    deliveryLocationIds: [],
    workingDays: defaultWorkingDays(),
    prepMinutes: 90,
    publicHolidays: [],
    offHoursService: false,
    offHoursPrice: "15",
    pricingCurrency: DEFAULT_PARTNER_PRICING_CURRENCY,
    rentPaymentMethods: ["Cash"],
    requireCreditCard: false,
    depositMethods: ["Cash"],
    cashDepositRefundDays: 0,
    tariffs: [
      { fromDays: 1, toDays: 3 },
      { fromDays: 4, toDays: 5 },
      { fromDays: 6, toDays: 30 },
    ],
    seasonalPricing: emptySeasonalPricing(),
    yearFullySeasonal: true,
    contractUrl: "",
    partnerContractActive: false,
    useSiteContract: true,
  };
}

export function splitPersonName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function joinPersonName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function parseCompanySettings(raw: unknown, seed?: Parameters<typeof defaultCompanySettings>[0]): PartnerCompanySettings {
  const base = defaultCompanySettings(seed);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const workingDays = { ...base.workingDays };
  if (o.workingDays && typeof o.workingDays === "object") {
    for (const key of DAYS) {
      const row = (o.workingDays as Record<string, WorkingDayConfig>)[key];
      if (row && typeof row === "object") {
        workingDays[key] = {
          enabled: Boolean(row.enabled),
          start: String(row.start || "09:00"),
          end: String(row.end || "21:00"),
        };
      }
    }
  }
  const tariffs = normalizeTariffIntervals(
    Array.isArray(o.tariffs)
      ? (o.tariffs as TariffInterval[])
          .map((t) => ({
            fromDays: Number(t.fromDays) || 1,
            toDays: Number(t.toDays) || 1,
          }))
          .filter((t) => t.fromDays > 0 && t.toDays >= t.fromDays)
      : base.tariffs,
  );

  const seasonal = parseSeasonalPricing(o.seasonalPricing);
  const seasons: PartnerSeasonPeriod[] = seasonal.seasons;

  const legacyLanguageMap: Record<string, string> = {
    english: "en",
    georgian: "ka",
    russian: "ru",
    français: "fr",
    french: "fr",
    deutsch: "de",
    german: "de",
    polski: "pl",
    polish: "pl",
    العربية: "ar",
    arabic: "ar",
  };
  let clientLanguages: string[] = base.clientLanguages;
  if (Array.isArray(o.clientLanguages) && o.clientLanguages.length) {
    clientLanguages = o.clientLanguages.map(String).map((c) => c.toLowerCase()).filter(Boolean);
  } else if (typeof o.language === "string" && o.language.trim()) {
    const raw = o.language.trim();
    const mapped = legacyLanguageMap[raw.toLowerCase()] || (/^[a-z]{2}$/i.test(raw) ? raw.toLowerCase() : "en");
    clientLanguages = [mapped];
  }

  const storedFirst = typeof o.firstName === "string" ? o.firstName : undefined;
  const storedLast = typeof o.lastName === "string" ? o.lastName : undefined;
  const hasPersonName = storedFirst !== undefined || storedLast !== undefined;
  const split = splitPersonName(String(o.legalName ?? base.legalName));
  const firstName = (hasPersonName ? storedFirst ?? "" : split.firstName).trim();
  const lastName = (hasPersonName ? storedLast ?? "" : split.lastName).trim();
  const legalName = hasPersonName
    ? joinPersonName(firstName, lastName)
    : joinPersonName(firstName, lastName) || String(o.legalName ?? base.legalName).trim();

  return {
    title: String(o.title ?? base.title),
    firstName,
    lastName,
    legalName,
    country: String(o.country ?? base.country),
    centralOffice: String(o.centralOffice ?? base.centralOffice),
    address: String(o.address ?? base.address),
    clientLanguages: clientLanguages.length ? clientLanguages : ["en"],
    logoUrl: String(o.logoUrl ?? base.logoUrl),
    primaryPhone: String(o.primaryPhone ?? base.primaryPhone),
    secondaryPhone: String(o.secondaryPhone ?? base.secondaryPhone),
    primaryMessengers: (() => {
      const primary = parsePartnerMessengers(o.primaryMessengers);
      if (primary.length) return primary;
      const legacy = parsePartnerMessengers(o.messengers);
      return legacy.length ? legacy : base.primaryMessengers;
    })(),
    secondaryMessengers: (() => {
      const secondary = parsePartnerMessengers(o.secondaryMessengers);
      return secondary.length ? secondary : base.secondaryMessengers;
    })(),
    email: String(o.email ?? base.email),
    website: String(o.website ?? base.website),
    deliveryCountryIso2s: Array.isArray(o.deliveryCountryIso2s)
      ? o.deliveryCountryIso2s.map((c) => String(c).toUpperCase()).filter(Boolean)
      : base.deliveryCountryIso2s,
    deliveryLocationIds: Array.isArray(o.deliveryLocationIds)
      ? o.deliveryLocationIds.map(String).filter(Boolean)
      : base.deliveryLocationIds,
    workingDays,
    prepMinutes: Number(o.prepMinutes) > 0 ? Number(o.prepMinutes) : 90,
    publicHolidays: Array.isArray(o.publicHolidays) ? o.publicHolidays.map(String) : [],
    offHoursService: Boolean(o.offHoursService),
    offHoursPrice: String(o.offHoursPrice ?? base.offHoursPrice),
    pricingCurrency: parsePartnerPricingCurrency(o.pricingCurrency),
    rentPaymentMethods: Array.isArray(o.rentPaymentMethods)
      ? o.rentPaymentMethods.map(String)
      : base.rentPaymentMethods,
    requireCreditCard: Boolean(o.requireCreditCard),
    depositMethods: Array.isArray(o.depositMethods) ? o.depositMethods.map(String) : base.depositMethods,
    cashDepositRefundDays: Math.max(0, Number(o.cashDepositRefundDays) || 0),
    tariffs: tariffs.length ? tariffs : base.tariffs,
    seasonalPricing: {
      enabled: Boolean(seasonal.enabled) || seasons.length > 0,
      seasons,
    },
    yearFullySeasonal: o.yearFullySeasonal === undefined ? true : Boolean(o.yearFullySeasonal),
    ...normalizeContractSelection({
      contractUrl: typeof o.contractUrl === "string" ? o.contractUrl.trim() : base.contractUrl,
      partnerContractActive: Boolean(o.partnerContractActive),
      useSiteContract: o.useSiteContract === undefined ? true : Boolean(o.useSiteContract),
    }),
  };
}

/** Keep partner vs site contract flags mutually consistent. */
export function normalizeContractSelection(input: {
  contractUrl: string;
  partnerContractActive: boolean;
  useSiteContract: boolean;
}): Pick<PartnerCompanySettings, "contractUrl" | "partnerContractActive" | "useSiteContract"> {
  const contractUrl = String(input.contractUrl || "").trim();
  let partnerContractActive = Boolean(input.partnerContractActive) && Boolean(contractUrl);
  let useSiteContract = Boolean(input.useSiteContract);
  if (!contractUrl) {
    partnerContractActive = false;
    useSiteContract = true;
  } else if (partnerContractActive) {
    useSiteContract = false;
  } else {
    useSiteContract = true;
  }
  return { contractUrl, partnerContractActive, useSiteContract };
}

/** URL shown on checkout agree-links: partner active contract, else site template. */
export function resolveActiveContractUrl(
  settings: Pick<PartnerCompanySettings, "contractUrl" | "partnerContractActive" | "useSiteContract">,
  siteContractUrl: string,
): string {
  const n = normalizeContractSelection(settings);
  const site = String(siteContractUrl || "").trim();
  if (n.partnerContractActive && n.contractUrl) return n.contractUrl;
  if (n.useSiteContract && site) return site;
  return n.contractUrl || site;
}

export const PERSONAL_INFO_SECTIONS = [
  { id: "main-information", label: "Main information" },
  { id: "work-days", label: "Work and not work days" },
  { id: "payment-deposit", label: "Payment and deposit" },
  { id: "tariff", label: "Tariff" },
  { id: "contract", label: "Contract" },
  { id: "password-service", label: "Password and service" },
] as const;
