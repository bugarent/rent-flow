"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Plus, Trash2, Upload } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { PartnerCurrencySelect } from "@/components/partner/partner-currency-select";
import { cn } from "@/lib/utils";
import {
  DEPOSIT_METHOD_OPTIONS,
  PARTNER_PRICING_CURRENCIES,
  PARTNER_PRICING_CURRENCY_LABELS,
  PERSONAL_INFO_SECTIONS,
  RENT_PAYMENT_OPTIONS,
  WORKING_DAY_LABELS,
  joinPersonName,
  normalizeContractSelection,
  type PartnerCompanySettings,
  type PartnerPricingCurrency,
  type TariffInterval,
  normalizeTariffIntervals,
  tariffPlusFromDays,
} from "@/lib/partners/company-settings";
import { partnerCurrencySymbol, rebasePartnerAmount } from "@/lib/partners/pricing-currency";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { CountryFlag } from "@/components/ui/country-flag";
import { worldCountryName, WORLD_COUNTRIES } from "@/lib/catalog/world-countries";
import {
  majorCitiesForCountryIso2,
  resolveOfficeCountryIso2,
} from "@/lib/catalog/office-locations";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { CREATE_AUTO_BACKDROP_URL } from "@/lib/brand";
import { PartnerTelegramVerifyBanner } from "@/components/partner/partner-telegram-verify-banner";
import { PhoneMessengerIcons } from "@/components/partner/phone-messenger-icons";
import { locationCodesEqual, normalizeLocationCode } from "@/lib/catalog/search-places";
import type { PartnerSocialPlatform } from "@/lib/partner";

async function uploadPartnerFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/partners/uploads", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return String(data.url);
}

async function uploadLogoFile(file: File): Promise<string> {
  const squared = await squareLogoFile(file);
  return uploadPartnerFile(squared);
}

/** Center-crop any image to a square PNG for partner logo. */
async function squareLogoFile(file: File, size = 512): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process logo");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process logo"))), "image/png");
  });
  const base = file.name.replace(/\.\w+$/, "") || "logo";
  return new File([blob], `${base}-square.png`, { type: "image/png" });
}

const HEADER_BAND = "rgba(168, 210, 178, 0.94)";
const HEADER_BORDER = "#8fbf9a";
const HEADER_TEXT = "#143322";
const HEADER_BAND_REMOD = "rgba(250, 204, 21, 0.94)";
const HEADER_BORDER_REMOD = "#ca8a04";
const HEADER_TEXT_REMOD = "#713f12";
const ACCENT = "#28a745";
const MAX_TARIFF_INTERVALS = 4;
const SECTION_HEAD = "#d9e2e8";

const inputClass =
  "w-full rounded-md border border-[#c5ced8] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none focus:border-[#5b4a8a] focus:ring-2 focus:ring-[#5b4a8a]/20";

const inputErrorClass = "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-400/40";

function Section({
  id,
  title,
  trailing,
  children,
}: {
  id: string;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 overflow-hidden rounded-lg border border-[#d5dde6] bg-white shadow-sm">
      <header
        className="flex items-center justify-between gap-3 border-b border-[#cfd8e3] px-5 py-3.5 text-[15px] font-bold tracking-wide text-[#2a3340]"
        style={{ backgroundColor: SECTION_HEAD }}
      >
        <span>{title}</span>
        {trailing ? <span className="shrink-0 font-mono text-sm font-bold tracking-normal text-[#0b5c2e]">{trailing}</span> : null}
      </header>
      <div className="bg-[#fbfcfd] px-5 py-5 sm:px-7 sm:py-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  invalid,
  error,
  changed,
  previous,
  children,
}: {
  label: string;
  required?: boolean;
  invalid?: boolean;
  error?: string;
  changed?: boolean;
  previous?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-sm">
      <span
        className={cn(
          "mb-1.5 block font-semibold",
          changed || invalid ? "text-red-700" : "text-[#3a4553]",
        )}
      >
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
      {changed && previous ? (
        <p className="mt-1 text-xs font-semibold text-red-700">
          იყო: <span className="line-through opacity-80">{previous}</span>
        </p>
      ) : null}
      {invalid && error ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

export type AdminProfileReviewConfig = {
  partnerId: string;
  backHref: string;
  backLabel: string;
  changedFields: Array<{ field: string; from: string; to: string }>;
};

export function PartnerPersonalInfoForm({
  initial,
  catalogCountries = [],
  partnerStatus: partnerStatusInitial = "PENDING",
  pendingRemoderation: pendingRemoderationInitial = false,
  partnerCode = null,
  fxRates = DEFAULT_FX_RATES,
  adminReview = null,
  lastAdminNote: lastAdminNoteInitial = null,
}: {
  initial: PartnerCompanySettings;
  catalogCountries?: Array<{ iso2: string; name: string; hoverRegion?: "Europe" | "Asia" }>;
  /** Kept for call-site compat — countries are always editable. */
  countriesEditable?: boolean;
  countriesEditUnlockUntil?: string | null;
  partnerStatus?: string;
  pendingRemoderation?: boolean;
  partnerCode?: string | null;
  fxRates?: FxRates;
  /** When set, form is a read-only admin remodeation review with red change highlights. */
  adminReview?: AdminProfileReviewConfig | null;
  /** Admin rejection note from last remodeation (partner-facing). */
  lastAdminNote?: string | null;
}) {
  const { dictionary, locale } = usePartnerLocale();
  const router = useRouter();
  const isAdminReview = Boolean(adminReview);
  const pi = dictionary.personalInfo;
  const common = dictionary.common;
  const sectionNavLabel = (id: (typeof PERSONAL_INFO_SECTIONS)[number]["id"]) => {
    const map = {
      "main-information": pi.sections.main,
      "work-days": pi.sections.workDays,
      "payment-deposit": pi.sections.payment,
      tariff: pi.sections.tariff,
      contract: pi.sections.contract,
      "password-service": pi.sections.password,
    } as const;
    return map[id];
  };
  const [active, setActive] = useState<string>(PERSONAL_INFO_SECTIONS[0].id);
  const [settings, setSettings] = useState(() => ({
    ...initial,
    ...normalizeContractSelection({
      contractUrl: initial.contractUrl ?? "",
      partnerContractActive: Boolean(initial.partnerContractActive),
      useSiteContract: initial.useSiteContract === undefined ? true : Boolean(initial.useSiteContract),
    }),
    tariffs: normalizeTariffIntervals(initial.tariffs, MAX_TARIFF_INTERVALS),
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [contractUploading, setContractUploading] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const [partnerStatus, setPartnerStatus] = useState(partnerStatusInitial);
  const [pendingRemoderation, setPendingRemoderation] = useState(
    pendingRemoderationInitial || isAdminReview,
  );
  const [pendingCountryAdds, setPendingCountryAdds] = useState<string[]>([]);
  const [pendingCountryRemoves, setPendingCountryRemoves] = useState<string[]>([]);
  const [countryNotice, setCountryNotice] = useState("");
  const [activeDeliveryLocations, setActiveDeliveryLocations] = useState<DeliveryLocationView[]>([]);
  const [locationsLoadError, setLocationsLoadError] = useState("");
  const [invalidLocationCountries, setInvalidLocationCountries] = useState<Set<string>>(new Set());
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [lastAdminNote, setLastAdminNote] = useState(lastAdminNoteInitial);

  const changedMap = useMemo(() => {
    const map = new Map<string, { from: string; to: string }>();
    for (const ch of adminReview?.changedFields || []) {
      if (!ch.field) continue;
      map.set(ch.field, { from: ch.from, to: ch.to });
    }
    return map;
  }, [adminReview]);

  const fieldChange = (field: string) => {
    if (changedMap.has(field)) return changedMap.get(field);
    if (field === "deliveryCountries") {
      return changedMap.get("deliveryCountryIso2s") || changedMap.get("deliveryLocationIds");
    }
    return undefined;
  };

  const isChanged = (field: string) => Boolean(fieldChange(field));

  const wrapChanged = (field: string) =>
    cn(isChanged(field) && "rounded-md border-2 border-red-500 bg-red-50/90 p-2");

  const navSections = useMemo(
    () =>
      isAdminReview
        ? PERSONAL_INFO_SECTIONS.filter((s) => s.id !== "password-service")
        : PERSONAL_INFO_SECTIONS,
    [isAdminReview],
  );

  const sectionHasChanges = (sectionId: string) => {
    if (!isAdminReview) return false;
    const keysBySection: Record<string, string[]> = {
      "main-information": [
        "logoUrl",
        "title",
        "firstName",
        "lastName",
        "legalName",
        "country",
        "centralOffice",
        "address",
        "clientLanguages",
        "deliveryCountryIso2s",
        "deliveryLocationIds",
        "primaryPhone",
        "secondaryPhone",
        "email",
        "website",
        "primaryMessengers",
        "secondaryMessengers",
      ],
      "work-days": [
        "workingDays",
        "pricingCurrency",
        "prepMinutes",
        "publicHolidays",
        "offHoursService",
        "offHoursPrice",
      ],
      "payment-deposit": [
        "rentPaymentMethods",
        "depositMethods",
        "requireCreditCard",
        "cashDepositRefundDays",
      ],
      tariff: ["tariffs", "seasonalPricing", "yearFullySeasonal"],
      contract: ["contractUrl", "partnerContractActive", "useSiteContract"],
    };
    return (keysBySection[sectionId] || []).some((k) => changedMap.has(k));
  };

  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of activeDeliveryLocations) {
      if (!loc.isActive) continue;
      const iso2 = (loc.countryIso2 || "").toUpperCase();
      if (iso2.length !== 2) continue;
      if (!map.has(iso2)) map.set(iso2, worldCountryName(iso2));
    }
    return [...map.entries()]
      .map(([iso2, name]) => ({ iso2, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [activeDeliveryLocations]);

  const committedCountries = settings.deliveryCountryIso2s ?? [];
  const visibleCommitted = committedCountries.filter((iso) => !pendingCountryRemoves.includes(iso));
  const countriesDirty = pendingCountryAdds.length > 0 || pendingCountryRemoves.length > 0;

  const officeCountryOptions = useMemo(
    () =>
      WORLD_COUNTRIES.map((c) => ({ iso2: c.iso2.toUpperCase(), name: c.name })).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [],
  );

  const officeCountryIso2 = resolveOfficeCountryIso2(settings.country);
  const officeCities = useMemo(
    () => majorCitiesForCountryIso2(officeCountryIso2),
    [officeCountryIso2],
  );

  const onOfficeCountryChange = (iso2: string) => {
    const cities = majorCitiesForCountryIso2(iso2);
    const nextCity =
      cities.find((c) => c.name === settings.centralOffice)?.name ?? cities[0]?.name ?? "";
    patch({ country: iso2, centralOffice: nextCity });
  };

  const toggleClientLanguage = (code: Locale) => {
    setSettings((prev) => {
      const list = prev.clientLanguages ?? [];
      const next = list.includes(code) ? list.filter((x) => x !== code) : [...list, code];
      return { ...prev, clientLanguages: next.length ? next : [code] };
    });
    setInvalidFields((prev) => {
      if (!prev.has("clientLanguages")) return prev;
      const next = new Set(prev);
      next.delete("clientLanguages");
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Full catalog for id/label enrichment (not homepage-only)
        const res = await fetch("/api/delivery-locations?all=1", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // Catalog places still work offline — only soft-warn
          setLocationsLoadError("");
          return;
        }
        const list = Array.isArray(data) ? data : Array.isArray(data.locations) ? data.locations : [];
        setActiveDeliveryLocations(list as DeliveryLocationView[]);
        setLocationsLoadError("");
      } catch {
        if (!cancelled) setLocationsLoadError("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pi.locationsLoadError]);

  useEffect(() => {
    const nodes = PERSONAL_INFO_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.15, 0.4] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActive(id);
  };

  const patch = (partial: Partial<PartnerCompanySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if ("firstName" in partial || "lastName" in partial) {
        next.legalName = joinPersonName(next.firstName, next.lastName);
      }
      return next;
    });
    setInvalidFields((prev) => {
      if (!prev.size) return prev;
      const next = new Set(prev);
      for (const key of Object.keys(partial)) next.delete(key);
      if ("deliveryCountryIso2s" in partial) next.delete("deliveryCountries");
      if ("clientLanguages" in partial) next.delete("clientLanguages");
      if ("primaryPhone" in partial) next.delete("primaryPhone");
      return next;
    });
  };

  const moneySymbol = partnerCurrencySymbol(settings.pricingCurrency ?? "USD");

  const onPricingCurrencyChange = (next: PartnerPricingCurrency) => {
    setSettings((prev) => {
      const from = prev.pricingCurrency ?? "USD";
      if (from === next) return { ...prev, pricingCurrency: next };
      return {
        ...prev,
        pricingCurrency: next,
        offHoursPrice: rebasePartnerAmount(prev.offHoursPrice, from, next, fxRates),
      };
    });
  };

  const fieldClass = (key: string) =>
    cn(inputClass, (invalidFields.has(key) || isChanged(key)) && inputErrorClass);

  const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const looksLikeWebsite = (value: string) => {
    const v = value.trim();
    if (!v) return false;
    if (/^https?:\/\//i.test(v)) return /https?:\/\/.+\..+/i.test(v);
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/.*)?$/i.test(v);
  };
  const looksLikePhone = (value: string) => value.replace(/\D/g, "").length >= 8;

  const collectInvalidFields = () => {
    const missing = new Set<string>();
    if (!settings.logoUrl.trim()) missing.add("logoUrl");
    if (!settings.title.trim()) missing.add("title");
    if (!settings.firstName.trim()) missing.add("firstName");
    if (!settings.lastName.trim()) missing.add("lastName");
    if (!officeCountryIso2.trim()) missing.add("country");
    if (!settings.centralOffice.trim() && !officeCities[0]?.name) missing.add("centralOffice");
    if (!settings.address.trim()) missing.add("address");
    if (!(settings.clientLanguages?.length > 0)) missing.add("clientLanguages");
    if (!(settings.deliveryCountryIso2s?.length > 0)) missing.add("deliveryCountries");
    if (!settings.primaryPhone.trim() || !looksLikePhone(settings.primaryPhone)) missing.add("primaryPhone");
    if (!settings.secondaryPhone.trim() || !looksLikePhone(settings.secondaryPhone)) missing.add("secondaryPhone");
    if (!settings.email.trim() || !looksLikeEmail(settings.email)) missing.add("email");
    if (settings.website.trim() && !looksLikeWebsite(settings.website)) missing.add("website");
    if (!(settings.primaryMessengers?.length > 0)) missing.add("primaryMessengers");
    if (!(settings.secondaryMessengers?.length > 0)) missing.add("secondaryMessengers");
    return missing;
  };

  const fieldError = (key: string): string => {
    if (!invalidFields.has(key)) return "";
    switch (key) {
      case "logoUrl":
        return pi.logoRequired;
      case "email":
        return settings.email.trim() ? pi.invalidEmail : pi.fieldRequired;
      case "website":
        return settings.website.trim() ? pi.invalidWebsite : "";
      case "primaryPhone":
      case "secondaryPhone":
        return (key === "primaryPhone" ? settings.primaryPhone : settings.secondaryPhone).trim()
          ? pi.invalidPhone
          : pi.fieldRequired;
      case "deliveryCountries":
        return (settings.deliveryCountryIso2s?.length ?? 0) > 0
          ? pi.countriesNeedLocation
          : pi.countriesNeedOne;
      case "clientLanguages":
        return pi.fieldRequired;
      case "messengers":
      case "primaryMessengers":
      case "secondaryMessengers":
        return pi.messengersRequired;
      default:
        return pi.fieldRequired;
    }
  };

  const MAIN_INFO_KEYS = [
    "logoUrl",
    "title",
    "firstName",
    "lastName",
    "country",
    "centralOffice",
    "address",
    "clientLanguages",
    "deliveryCountries",
    "primaryPhone",
    "secondaryPhone",
    "email",
    "website",
    "primaryMessengers",
    "secondaryMessengers",
  ] as const;

  const sectionHasInvalid = (sectionId: string) => {
    if (sectionId === "main-information") {
      return MAIN_INFO_KEYS.some((k) => invalidFields.has(k));
    }
    return false;
  };

  const markFieldInvalid = (key: string, isBad: boolean) => {
    setInvalidFields((prev) => {
      const next = new Set(prev);
      if (isBad) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const validateFieldLive = (key: string) => {
    switch (key) {
      case "logoUrl":
        markFieldInvalid(key, !settings.logoUrl.trim());
        break;
      case "title":
        markFieldInvalid(key, !settings.title.trim());
        break;
      case "firstName":
        markFieldInvalid(key, !settings.firstName.trim());
        break;
      case "lastName":
        markFieldInvalid(key, !settings.lastName.trim());
        break;
      case "address":
        markFieldInvalid(key, !settings.address.trim());
        break;
      case "primaryPhone":
        markFieldInvalid(key, !settings.primaryPhone.trim() || !looksLikePhone(settings.primaryPhone));
        break;
      case "secondaryPhone":
        markFieldInvalid(
          key,
          !settings.secondaryPhone.trim() || !looksLikePhone(settings.secondaryPhone),
        );
        break;
      case "email":
        markFieldInvalid(key, !settings.email.trim() || !looksLikeEmail(settings.email));
        break;
      case "website":
        markFieldInvalid(key, Boolean(settings.website.trim()) && !looksLikeWebsite(settings.website));
        break;
      case "clientLanguages":
        markFieldInvalid(key, !(settings.clientLanguages?.length > 0));
        break;
      case "deliveryCountries":
        markFieldInvalid(key, !(settings.deliveryCountryIso2s?.length > 0));
        break;
      default:
        break;
    }
  };

  const scrollToFirstInvalid = (fields: Set<string>) => {
    const order = [
      "logoUrl",
      "title",
      "firstName",
      "lastName",
      "country",
      "centralOffice",
      "address",
      "clientLanguages",
      "deliveryCountries",
      "primaryPhone",
      "primaryMessengers",
      "secondaryPhone",
      "secondaryMessengers",
      "email",
      "website",
    ];
    const first = order.find((k) => fields.has(k));
    if (!first) return;
    const el = document.querySelector(`[data-field="${first}"]`);
    if (el instanceof HTMLElement) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  };

  const toggleList = (key: "rentPaymentMethods" | "depositMethods", value: string) => {
    setSettings((prev) => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const setWorkingDay = (day: string, partial: Partial<PartnerCompanySettings["workingDays"][string]>) => {
    setSettings((prev) => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: { ...prev.workingDays[day], ...partial },
      },
    }));
  };

  const normalizeTariffs = (rows: TariffInterval[]): TariffInterval[] =>
    normalizeTariffIntervals(rows, MAX_TARIFF_INTERVALS);

  const updateTariff = (index: number, patchRow: Partial<TariffInterval>) => {
    setSettings((prev) => {
      const draft = prev.tariffs.map((row, i) => (i === index ? { ...row, ...patchRow } : { ...row }));
      return { ...prev, tariffs: normalizeTariffs(draft) };
    });
  };

  const addTariffInterval = () => {
    setSettings((prev) => {
      if (prev.tariffs.length >= MAX_TARIFF_INTERVALS) return prev;
      const last = prev.tariffs[prev.tariffs.length - 1];
      const fromDays = last ? last.toDays + 1 : 1;
      return { ...prev, tariffs: normalizeTariffs([...prev.tariffs, { fromDays, toDays: fromDays }]) };
    });
  };

  const removeTariffInterval = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      tariffs: normalizeTariffs(prev.tariffs.filter((_, i) => i !== index)),
    }));
  };

  const dayEntries = useMemo(
    () =>
      (Object.keys(WORKING_DAY_LABELS) as Array<keyof typeof WORKING_DAY_LABELS>).map((key) => ({
        key,
        label: pi.days[key],
      })),
    [pi.days],
  );

  const queueDeliveryCountryAdd = (iso2: string) => {
    if (!iso2) return;
    setCountryNotice("");
    if (committedCountries.includes(iso2) && !pendingCountryRemoves.includes(iso2)) {
      setCountryNotice(pi.alreadyInList);
      return;
    }
    if (pendingCountryAdds.includes(iso2)) return;
    setPendingCountryRemoves((prev) => prev.filter((c) => c !== iso2));
    setPendingCountryAdds((prev) => [...prev, iso2]);
  };

  const queueDeliveryCountryRemove = (iso2: string) => {
    setCountryNotice("");
    if (pendingCountryAdds.includes(iso2)) {
      setPendingCountryAdds((prev) => prev.filter((c) => c !== iso2));
      return;
    }
    setPendingCountryRemoves((prev) => (prev.includes(iso2) ? prev : [...prev, iso2]));
  };

  type CountryLocationOption = {
    id: string;
    label: string;
    countryIso2: string;
    iata: string;
    isActive: boolean;
  };

  const locationsForCountry = (iso2: string): CountryLocationOption[] => {
    const want = iso2.toUpperCase();
    return activeDeliveryLocations
      .filter((loc) => loc.isActive && (loc.countryIso2 || "").toUpperCase() === want)
      .map((loc) => ({
        id: loc.id,
        label: loc.label,
        countryIso2: want,
        iata: loc.iata || loc.airportId,
        isActive: true,
      }));
  };

  const selectedLocationIds = settings.deliveryLocationIds ?? [];

  const isLocationSelected = (loc: CountryLocationOption, selected: string[]) => {
    const selectedSet = new Set(selected);
    if (selectedSet.has(loc.id)) return true;
    const code = normalizeLocationCode(loc.iata);
    return selected.some((id) => {
      if (locationCodesEqual(id, code)) return true;
      const known = activeDeliveryLocations.find((l) => l.id === id);
      return known ? locationCodesEqual(known.iata || known.airportId || "", code) : false;
    });
  };

  const toggleDeliveryLocation = (locationId: string, countryIso2?: string) => {
    setSettings((prev) => {
      const list = prev.deliveryLocationIds ?? [];
      const locs = countryIso2 ? locationsForCountry(countryIso2) : [];
      const target = locs.find((l) => l.id === locationId) || {
        id: locationId,
        iata: locationId,
        label: locationId,
        countryIso2: countryIso2 || "",
        isActive: true,
      };
      const selected = isLocationSelected(target, list);
      const next = selected
        ? list.filter((id) => {
            if (id === target.id) return false;
            if (locationCodesEqual(id, target.iata)) return false;
            const known = activeDeliveryLocations.find((l) => l.id === id);
            if (known && locationCodesEqual(known.iata || known.airportId || "", target.iata)) {
              return false;
            }
            return true;
          })
        : [...list, target.id];
      return { ...prev, deliveryLocationIds: next };
    });
    const iso = (countryIso2 || "").toUpperCase();
    if (iso) {
      setInvalidLocationCountries((prev) => {
        if (!prev.has(iso)) return prev;
        const next = new Set(prev);
        next.delete(iso);
        return next;
      });
    }
    setInvalidFields((prev) => {
      if (!prev.has("deliveryCountries")) return prev;
      const next = new Set(prev);
      next.delete("deliveryCountries");
      return next;
    });
    setCountryNotice("");
  };

  const pruneLocationsForCountries = (countryIso2s: string[], locationIds: string[]) => {
    const allowed = new Set(countryIso2s.map((c) => c.toUpperCase()));
    return locationIds.filter((id) =>
      [...allowed].some((iso) => {
        const locs = locationsForCountry(iso);
        return locs.some(
          (l) =>
            l.id === id ||
            locationCodesEqual(l.iata, id) ||
            (() => {
              const known = activeDeliveryLocations.find((x) => x.id === id);
              return known ? locationCodesEqual(known.iata || known.airportId || "", l.iata) : false;
            })(),
        );
      }),
    );
  };

  const countryHasSelectedLocation = (iso2: string, locationIds: string[]) => {
    const locs = locationsForCountry(iso2);
    if (!locs.length) return false;
    return locs.some((l) => isLocationSelected(l, locationIds));
  };

  const saveDeliveryCountries = () => {
    const next = [
      ...committedCountries.filter((iso) => !pendingCountryRemoves.includes(iso)),
      ...pendingCountryAdds,
    ];
    const unique = [...new Set(next.map((c) => c.toUpperCase()))];
    if (!unique.length) {
      setCountryNotice(pi.countriesNeedOne);
      return;
    }

    const missing = new Set(
      unique.filter((iso) => !countryHasSelectedLocation(iso, selectedLocationIds)),
    );
    if (missing.size) {
      setInvalidLocationCountries(missing);
      setCountryNotice(pi.countriesNeedLocation);
      const first = [...missing][0];
      const el = document.querySelector(`[data-country-locations="${first}"]`);
      if (el instanceof HTMLElement) {
        const top = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
      return;
    }

    const nextLocationIds = pruneLocationsForCountries(unique, selectedLocationIds);
    setInvalidLocationCountries(new Set());
    patch({ deliveryCountryIso2s: unique, deliveryLocationIds: nextLocationIds });
    setPendingCountryAdds([]);
    setPendingCountryRemoves([]);
    setCountryNotice(pi.countriesSavedLocal);
  };

  const onLogoFile = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    setError("");
    try {
      const url = await uploadLogoFile(file);
      patch({ logoUrl: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : pi.logoUploadFailed);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const onContractFile = async (file: File | undefined) => {
    if (!file) return;
    setContractUploading(true);
    setError("");
    try {
      const url = await uploadPartnerFile(file);
      patch(
        normalizeContractSelection({
          contractUrl: url,
          partnerContractActive: false,
          useSiteContract: true,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : pi.contractUploadFailed);
    } finally {
      setContractUploading(false);
      if (contractInputRef.current) contractInputRef.current.value = "";
    }
  };

  const setPartnerContractActive = (active: boolean) => {
    if (!settings.contractUrl.trim()) return;
    patch(
      normalizeContractSelection({
        contractUrl: settings.contractUrl,
        partnerContractActive: active,
        useSiteContract: !active,
      }),
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      // Commit pending country edits first — same required-field flow as the rest of the form
      const draftCountries = [
        ...committedCountries.filter((iso) => !pendingCountryRemoves.includes(iso)),
        ...pendingCountryAdds,
      ];
      const uniqueCountries = [...new Set(draftCountries.map((c) => c.toUpperCase()))];
      if (!uniqueCountries.length) {
        setInvalidFields(new Set(["deliveryCountries"]));
        setInvalidLocationCountries(new Set());
        scrollToFirstInvalid(new Set(["deliveryCountries"]));
        throw new Error(pi.countriesNeedOne);
      }
      const locMissing = new Set(
        uniqueCountries.filter((iso) => !countryHasSelectedLocation(iso, selectedLocationIds)),
      );
      if (locMissing.size || countriesDirty) {
        if (locMissing.size) {
          setInvalidLocationCountries(locMissing);
          setInvalidFields((prev) => new Set([...prev, "deliveryCountries"]));
          setCountryNotice(pi.countriesNeedLocation);
          scrollToFirstInvalid(new Set(["deliveryCountries"]));
          throw new Error(pi.countriesNeedLocation);
        }
        const nextLocationIds = pruneLocationsForCountries(uniqueCountries, selectedLocationIds);
        patch({ deliveryCountryIso2s: uniqueCountries, deliveryLocationIds: nextLocationIds });
        setPendingCountryAdds([]);
        setPendingCountryRemoves([]);
        setCountryNotice("");
        setInvalidLocationCountries(new Set());
      }

      const settingsForSave: PartnerCompanySettings = {
        ...settings,
        ...normalizeContractSelection({
          contractUrl: settings.contractUrl ?? "",
          partnerContractActive: Boolean(settings.partnerContractActive),
          useSiteContract: Boolean(settings.useSiteContract),
        }),
        deliveryCountryIso2s: uniqueCountries,
        deliveryLocationIds: pruneLocationsForCountries(
          uniqueCountries,
          settings.deliveryLocationIds ?? selectedLocationIds,
        ),
      };

      const missing = (() => {
        const m = new Set<string>();
        if (!settingsForSave.logoUrl.trim()) m.add("logoUrl");
        if (!settingsForSave.title.trim()) m.add("title");
        if (!settingsForSave.firstName.trim()) m.add("firstName");
        if (!settingsForSave.lastName.trim()) m.add("lastName");
        if (!officeCountryIso2.trim()) m.add("country");
        if (!settingsForSave.centralOffice.trim() && !officeCities[0]?.name) m.add("centralOffice");
        if (!settingsForSave.address.trim()) m.add("address");
        if (!(settingsForSave.clientLanguages?.length > 0)) m.add("clientLanguages");
        if (!(settingsForSave.deliveryCountryIso2s?.length > 0)) m.add("deliveryCountries");
        if (!settingsForSave.primaryPhone.trim() || !looksLikePhone(settingsForSave.primaryPhone)) {
          m.add("primaryPhone");
        }
        if (
          !settingsForSave.secondaryPhone.trim() ||
          !looksLikePhone(settingsForSave.secondaryPhone)
        ) {
          m.add("secondaryPhone");
        }
        if (!settingsForSave.email.trim() || !looksLikeEmail(settingsForSave.email)) m.add("email");
        if (settingsForSave.website.trim() && !looksLikeWebsite(settingsForSave.website)) {
          m.add("website");
        }
        if (!(settingsForSave.primaryMessengers?.length > 0)) m.add("primaryMessengers");
        if (!(settingsForSave.secondaryMessengers?.length > 0)) m.add("secondaryMessengers");
        return m;
      })();
      if (missing.size) {
        setInvalidFields(missing);
        scrollToFirstInvalid(missing);
        throw new Error(common.requiredFields);
      }
      setInvalidFields(new Set());
      setInvalidLocationCountries(new Set());
      const changingPassword = Boolean(newPassword.trim() || confirmPassword.trim());
      if (changingPassword) {
        if (newPassword !== confirmPassword) {
          setError(pi.passwordMismatch);
          return;
        }
        if (newPassword.trim().length < 6) {
          setError(pi.passwordTooShort);
          return;
        }
        if (!oldPassword.trim()) {
          setError(pi.passwordMismatch);
          return;
        }
      }
      const payload: PartnerCompanySettings = {
        ...settingsForSave,
        primaryMessengers: settingsForSave.primaryMessengers ?? [],
        secondaryMessengers: settingsForSave.secondaryMessengers ?? [],
        website: settingsForSave.website.trim(),
        centralOffice:
          settingsForSave.centralOffice.trim() ||
          officeCities.find((c) => c.name === settingsForSave.centralOffice)?.name ||
          officeCities[0]?.name ||
          settingsForSave.centralOffice,
        country: settingsForSave.country || officeCountryIso2,
      };
      const res = await fetch("/api/partners/company-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: payload,
          ...(changingPassword
            ? { oldPassword, newPassword, confirmPassword }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = String(data.error || pi.saveFailed);
        const detail = typeof data.detail === "string" ? data.detail : "";
        const highlight = collectInvalidFields();
        if (/country|countries|operating|location|locked/i.test(errMsg)) highlight.add("deliveryCountries");
        if (/email/i.test(errMsg)) highlight.add("email");
        if (/phone/i.test(errMsg)) {
          highlight.add("primaryPhone");
          highlight.add("secondaryPhone");
        }
        if (/messenger/i.test(errMsg)) {
          highlight.add("primaryMessengers");
          highlight.add("secondaryMessengers");
        }
        if (/title|name|brand/i.test(errMsg)) {
          highlight.add("title");
          highlight.add("firstName");
          highlight.add("lastName");
        }
        if (/address/i.test(errMsg)) highlight.add("address");
        if (/language/i.test(errMsg)) highlight.add("clientLanguages");
        if (/website/i.test(errMsg)) highlight.add("website");
        if (/logo/i.test(errMsg)) highlight.add("logoUrl");
        if (highlight.size) {
          setInvalidFields(highlight);
          scrollToFirstInvalid(highlight);
        }
        const friendly =
          /failed to save|could not/i.test(errMsg) ? pi.saveFailed : errMsg;
        throw new Error(detail && /failed to save/i.test(errMsg) ? `${friendly} (${detail})` : friendly);
      }
      if (data.settings) {
        setSettings({
          ...data.settings,
          tariffs: normalizeTariffIntervals(data.settings.tariffs ?? [], MAX_TARIFF_INTERVALS),
        });
      }
      setPendingCountryAdds([]);
      setPendingCountryRemoves([]);
      setCountryNotice("");
      setInvalidFields(new Set());
      if (data.moderation) {
        setPartnerStatus(String(data.moderation.partnerStatus || partnerStatus));
        setPendingRemoderation(Boolean(data.moderation.pendingRemoderation));
      }
      if (data.passwordChanged) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage(String(data.message || "Password updated"));
      } else {
        setMessage(
          data.moderation?.pendingRemoderation
            ? pi.savedRemoderation
            : data.remoderation
              ? pi.savedForAdminReview
              : pi.saved,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : pi.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const runAdminAction = async (action: "FINAL_APPROVE" | "REJECT") => {
    if (!adminReview) return;
    if (action === "REJECT" && !adminNote.trim()) {
      setError(
        locale === "ka"
          ? "უარყოფისთვის საჭიროა კომენტარი პარტნიორისთვის"
          : locale === "ru"
            ? "Для отклонения нужен комментарий для партнёра"
            : "A comment for the partner is required to reject",
      );
      setRejectModalOpen(true);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(adminReview.partnerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: adminNote.trim() || undefined,
          rejectionNote: adminNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      setRejectModalOpen(false);
      setMessage(
        String(
          data.message ||
            (action === "REJECT"
              ? locale === "ka"
                ? "ცვლილებები უარყოფილია — პარტნიორს გაეგზავნა შეტყობინება"
                : "Remoderation rejected"
              : locale === "ka"
                ? "პროფილი დამტკიცებულია"
                : "Profile approved"),
        ),
      );
      router.push(adminReview.backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CREATE_AUTO_BACKDROP_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f4b]/55 via-[#1A3B5D]/35 to-[#0b1f4b]/25" />
      </div>

      <header
        className={cn(
          "sticky z-40 border-b backdrop-blur-md",
          isAdminReview ? "top-0" : "top-10",
        )}
        style={{
          backgroundColor: pendingRemoderation ? HEADER_BAND_REMOD : HEADER_BAND,
          borderColor: pendingRemoderation ? HEADER_BORDER_REMOD : HEADER_BORDER,
          color: pendingRemoderation ? HEADER_TEXT_REMOD : HEADER_TEXT,
        }}
      >
        {isAdminReview && adminReview ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/10 px-3 py-2 sm:px-5">
            <Link
              href={adminReview.backHref}
              className="rounded bg-white/50 px-2 py-0.5 text-xs font-bold"
            >
              {adminReview.backLabel}
            </Link>
            <p className="text-sm font-extrabold">
              {locale === "ka"
                ? "პროფილის მოდერაცია"
                : locale === "ru"
                  ? "Модерация профиля"
                  : "Profile remodeation"}
              {partnerCode ? (
                <span className="ms-2 font-mono text-xs opacity-80">{partnerCode}</span>
              ) : null}
            </p>
          </div>
        ) : null}
        <nav
          className="flex gap-0.5 overflow-x-auto px-2 py-0.5 text-[11px] font-semibold sm:px-4 lg:px-6"
          aria-label={dictionary.calendar.personalInfo}
        >
          {navSections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={cn(
                "shrink-0 rounded px-2 py-0.5 whitespace-nowrap",
                sectionHasInvalid(s.id) || sectionHasChanges(s.id)
                  ? "bg-red-100 text-red-800 ring-1 ring-red-400 underline decoration-2 underline-offset-2"
                  : active === s.id
                    ? "underline decoration-2 underline-offset-2"
                    : "opacity-65 hover:bg-black/5 hover:opacity-100",
              )}
              style={
                sectionHasInvalid(s.id) || sectionHasChanges(s.id)
                  ? undefined
                  : active === s.id
                    ? { backgroundColor: "rgba(40,167,69,0.14)" }
                    : undefined
              }
            >
              {sectionNavLabel(s.id)}
            </button>
          ))}
        </nav>
      </header>

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-[1200px] flex-1 space-y-5 px-3 py-5 sm:px-5 lg:px-8",
          isAdminReview ? "pb-44" : "pb-28",
          isAdminReview && "pointer-events-none select-none [&_a]:pointer-events-auto [&_button]:pointer-events-none",
        )}
      >
        <Section
          id="main-information"
          title={pi.sections.main}
          trailing={partnerCode || undefined}
        >
          {!isAdminReview ? <PartnerTelegramVerifyBanner variant="card" className="mb-3" /> : null}
          {!isAdminReview && lastAdminNote && !pendingRemoderation ? (
            <div
              role="status"
              className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950"
            >
              <p className="font-extrabold">
                {locale === "ka"
                  ? "პროფილის განახლება უარყოფილია"
                  : locale === "ru"
                    ? "Обновление профиля отклонено"
                    : "Profile update rejected"}
              </p>
              <p className="mt-1 leading-relaxed whitespace-pre-wrap">{lastAdminNote}</p>
              <button
                type="button"
                className="mt-2 text-xs font-bold text-red-800 underline"
                onClick={() => setLastAdminNote(null)}
              >
                {locale === "ka" ? "დახურვა" : locale === "ru" ? "Закрыть" : "Dismiss"}
              </button>
            </div>
          ) : null}
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-700">{pi.mainInfo}</p>
              <div data-field="logoUrl" className={wrapChanged("logoUrl")}>
                <Field
                  label={pi.logo}
                  required
                  invalid={invalidFields.has("logoUrl")}
                  error={fieldError("logoUrl")}
                  changed={isChanged("logoUrl")}
                  previous={fieldChange("logoUrl")?.from}
                >
                  <div
                    className={cn(
                      "w-[120px] rounded-none border border-dashed bg-white p-2",
                      invalidFields.has("logoUrl") || isChanged("logoUrl")
                        ? "border-red-500 bg-red-50"
                        : "border-slate-300",
                    )}
                  >
                  {settings.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logoUrl}
                      alt=""
                      className="mb-2 h-[96px] w-[96px] rounded-none object-cover bg-slate-50"
                    />
                  ) : (
                    <div className="mb-2 flex h-[96px] w-[96px] items-center justify-center rounded-none border border-dashed border-slate-200 bg-slate-50">
                      <p className="px-1 text-center text-[10px] leading-snug text-slate-400">
                        {pi.logoHint}
                      </p>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => void onLogoFile(e.target.files?.[0])}
                  />
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1 rounded-none border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {logoUploading ? "…" : settings.logoUrl ? common.replace : common.upload}
                    </button>
                    {settings.logoUrl ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-red-700"
                        onClick={() => patch({ logoUrl: "" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {common.delete}
                      </button>
                    ) : null}
                  </div>
                </div>
              </Field>
              </div>
              <div data-field="title" className={wrapChanged("title")}>
                <Field
                  label={pi.brandName}
                  required
                  invalid={invalidFields.has("title")}
                  error={fieldError("title")}
                  changed={isChanged("title")}
                  previous={fieldChange("title")?.from}
                >
                  <input
                    className={fieldClass("title")}
                    value={settings.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    onBlur={() => validateFieldLive("title")}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div data-field="firstName" className={wrapChanged("firstName")}>
                  <Field
                    label={pi.firstName}
                    required
                    invalid={invalidFields.has("firstName")}
                    error={fieldError("firstName")}
                    changed={isChanged("firstName")}
                    previous={fieldChange("firstName")?.from}
                  >
                    <input
                      className={fieldClass("firstName")}
                      value={settings.firstName}
                      onChange={(e) => patch({ firstName: e.target.value })}
                      onBlur={() => validateFieldLive("firstName")}
                      autoComplete="given-name"
                    />
                  </Field>
                </div>
                <div data-field="lastName" className={wrapChanged("lastName")}>
                  <Field
                    label={pi.lastName}
                    required
                    invalid={invalidFields.has("lastName")}
                    error={fieldError("lastName")}
                    changed={isChanged("lastName")}
                    previous={fieldChange("lastName")?.from}
                  >
                    <input
                      className={fieldClass("lastName")}
                      value={settings.lastName}
                      onChange={(e) => patch({ lastName: e.target.value })}
                      onBlur={() => validateFieldLive("lastName")}
                      autoComplete="family-name"
                    />
                  </Field>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div data-field="country" className={wrapChanged("country")}>
                  <Field
                    label={pi.country}
                    required
                    invalid={invalidFields.has("country")}
                    error={fieldError("country")}
                    changed={isChanged("country")}
                    previous={fieldChange("country")?.from}
                  >
                    <select
                      className={fieldClass("country")}
                      value={officeCountryIso2}
                      onChange={(e) => onOfficeCountryChange(e.target.value)}
                    >
                      {officeCountryOptions.map((c) => (
                        <option key={c.iso2} value={c.iso2}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div data-field="centralOffice" className={wrapChanged("centralOffice")}>
                  <Field
                    label={pi.centralOffice}
                    required
                    invalid={invalidFields.has("centralOffice")}
                    error={fieldError("centralOffice")}
                    changed={isChanged("centralOffice")}
                    previous={fieldChange("centralOffice")?.from}
                  >
                    <select
                      className={fieldClass("centralOffice")}
                      value={
                        officeCities.some((c) => c.name === settings.centralOffice)
                          ? settings.centralOffice
                          : officeCities[0]?.name ?? ""
                      }
                      onChange={(e) => patch({ centralOffice: e.target.value })}
                    >
                      {officeCities.length ? (
                        officeCities.map((c) => (
                          <option key={c.slug} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      ) : (
                        <option value="">{pi.noLocations}</option>
                      )}
                    </select>
                  </Field>
                </div>
              </div>
              <div data-field="address" className={wrapChanged("address")}>
                <Field
                  label={pi.address}
                  required
                  invalid={invalidFields.has("address")}
                  error={fieldError("address")}
                  changed={isChanged("address")}
                  previous={fieldChange("address")?.from}
                >
                  <input
                    className={fieldClass("address")}
                    value={settings.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    onBlur={() => validateFieldLive("address")}
                  />
                </Field>
              </div>
              <div data-field="clientLanguages" className={wrapChanged("clientLanguages")}>
                <p
                  className={cn(
                    "mb-1.5 text-sm font-semibold",
                    invalidFields.has("clientLanguages") || isChanged("clientLanguages")
                      ? "text-red-700"
                      : "text-[#3a4553]",
                  )}
                >
                  {pi.clientLanguages} <span className="text-[#e11d48]">*</span>
                </p>
                <div
                  className={cn(
                    "flex flex-wrap gap-2 rounded-md p-2",
                    invalidFields.has("clientLanguages") && "border border-red-500 bg-red-50",
                  )}
                >
                  {LOCALES.map((code) => {
                    const on = (settings.clientLanguages ?? []).includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleClientLanguage(code)}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-xs font-semibold",
                          on
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {LOCALE_LABELS[code]}
                      </button>
                    );
                  })}
                </div>
                {invalidFields.has("clientLanguages") ? (
                  <p className="mt-1 text-xs font-semibold text-red-700">{fieldError("clientLanguages")}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-4">
              {pendingRemoderation ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {pi.remodeation}
                </p>
              ) : null}
              <div
                data-field="deliveryCountries"
                className={cn(
                  wrapChanged("deliveryCountries"),
                  isChanged("deliveryCountryIso2s") && wrapChanged("deliveryCountryIso2s"),
                  isChanged("deliveryLocationIds") && wrapChanged("deliveryLocationIds"),
                )}
              >
                <p
                  className={cn(
                    "mb-1.5 text-sm font-semibold",
                    invalidFields.has("deliveryCountries") ||
                      isChanged("deliveryCountries") ||
                      isChanged("deliveryCountryIso2s") ||
                      isChanged("deliveryLocationIds")
                      ? "text-red-700"
                      : "text-[#3a4553]",
                  )}
                >
                  {pi.deliveryCountries} <span className="text-[#e11d48]">*</span>
                </p>
                {pi.deliveryHelp ? (
                  <p className="mb-2 text-[11px] text-slate-500">{pi.deliveryHelp}</p>
                ) : null}
                {locationsLoadError ? (
                  <p className="mb-2 text-xs font-semibold text-red-700">{locationsLoadError}</p>
                ) : null}
                <div
                  className={cn(
                    "relative",
                    invalidFields.has("deliveryCountries") && "rounded-lg border border-red-500 bg-red-50 p-2",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={cn(inputClass, "min-w-[200px] flex-1")}
                      value=""
                      onChange={(e) => {
                        queueDeliveryCountryAdd(e.target.value);
                        e.target.value = "";
                      }}
                    >
                      <option value="">{pi.selectCountry}</option>
                      {countryOptions
                        .filter(
                          (c) =>
                            !visibleCommitted.includes(c.iso2) && !pendingCountryAdds.includes(c.iso2),
                        )
                        .map((c) => (
                          <option key={c.iso2} value={c.iso2}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!countriesDirty}
                      onClick={saveDeliveryCountries}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2.5 text-xs font-bold text-white disabled:opacity-45"
                      style={{ backgroundColor: ACCENT }}
                    >
                      <Check className="h-3.5 w-3.5" /> {common.save}
                    </button>
                  </div>
                </div>
                {pendingCountryAdds.length ? (
                  <ul className="mt-2 space-y-2">
                    {pendingCountryAdds.map((iso2) => {
                      const locs = locationsForCountry(iso2);
                      return (
                        <li
                          key={`pending-${iso2}`}
                          className="rounded-md border border-dashed border-emerald-300 bg-emerald-50/70 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                              <CountryFlag iso2={iso2} />
                              {worldCountryName(iso2)}
                              <span className="text-xs font-medium text-emerald-700/80">{pi.pendingSave}</span>
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-700"
                              onClick={() => queueDeliveryCountryRemove(iso2)}
                            >
                              {common.cancel}
                            </button>
                          </div>
                          <div className="mt-2 space-y-1.5" data-country-locations={iso2}>
                            <select
                              className={cn(
                                inputClass,
                                "text-xs",
                                invalidLocationCountries.has(iso2) && inputErrorClass,
                              )}
                              disabled={locs.filter((l) => l.isActive).length === 0}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) toggleDeliveryLocation(e.target.value, iso2);
                                e.target.value = "";
                              }}
                            >
                              <option value="">
                                {locs.some((l) => l.isActive) ? pi.selectLocation : pi.noLocations}
                              </option>
                              {locs
                                .filter(
                                  (loc) =>
                                    loc.isActive && !isLocationSelected(loc, selectedLocationIds),
                                )
                                .map((loc) => (
                                  <option key={loc.id} value={loc.id}>
                                    {loc.label}
                                  </option>
                                ))}
                            </select>
                            {invalidLocationCountries.has(iso2) ? (
                              <p className="text-[11px] font-semibold text-red-700">
                                {pi.locationRequired}
                              </p>
                            ) : null}
                            <ul className="space-y-1">
                              {locs
                                .filter((loc) => isLocationSelected(loc, selectedLocationIds))
                                .map((loc) => (
                                  <li
                                    key={loc.id}
                                    className="flex items-center justify-between gap-2 rounded border border-emerald-200 bg-white px-2 py-1.5 text-xs"
                                  >
                                    <span className="font-semibold text-slate-800">{loc.label}</span>
                                    <button
                                      type="button"
                                      className="font-semibold text-red-700"
                                      onClick={() => toggleDeliveryLocation(loc.id, iso2)}
                                    >
                                      {common.remove}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {countryNotice ? (
                  <p className="mt-1.5 text-xs font-semibold text-slate-700">{countryNotice}</p>
                ) : null}
                {invalidFields.has("deliveryCountries") ? (
                  <p className="mt-1.5 text-xs font-semibold text-red-700">{fieldError("deliveryCountries")}</p>
                ) : null}
                <ul className="mt-3 space-y-2">
                  {visibleCommitted.map((iso2) => {
                    const locs = locationsForCountry(iso2);
                    return (
                      <li key={iso2} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <CountryFlag iso2={iso2} />
                            {worldCountryName(iso2)}
                            <span className="text-xs font-medium text-slate-400">({iso2})</span>
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"
                            onClick={() => queueDeliveryCountryRemove(iso2)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {common.remove}
                          </button>
                        </div>
                        <div className="mt-2 space-y-1.5" data-country-locations={iso2}>
                          <select
                            className={cn(
                              inputClass,
                              "text-xs",
                              invalidLocationCountries.has(iso2) && inputErrorClass,
                            )}
                            disabled={locs.filter((l) => l.isActive).length === 0}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) toggleDeliveryLocation(e.target.value, iso2);
                              e.target.value = "";
                            }}
                          >
                            <option value="">
                              {locs.some((l) => l.isActive) ? pi.selectLocation : pi.noLocations}
                            </option>
                            {locs
                              .filter(
                                (loc) =>
                                  loc.isActive && !isLocationSelected(loc, selectedLocationIds),
                              )
                              .map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {loc.label}
                                </option>
                              ))}
                          </select>
                          {invalidLocationCountries.has(iso2) ? (
                            <p className="text-[11px] font-semibold text-red-700">
                              {pi.locationRequired}
                            </p>
                          ) : null}
                          <ul className="space-y-1">
                            {locs
                              .filter((loc) => isLocationSelected(loc, selectedLocationIds))
                              .map((loc) => (
                                <li
                                  key={loc.id}
                                  className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs"
                                >
                                  <span className="font-semibold text-slate-800">{loc.label}</span>
                                  <button
                                    type="button"
                                    className="font-semibold text-red-700"
                                    onClick={() => toggleDeliveryLocation(loc.id, iso2)}
                                  >
                                    {common.remove}
                                  </button>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                  {pendingCountryRemoves.map((iso2) => (
                    <li
                      key={`remove-${iso2}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-dashed border-red-200 bg-red-50/60 px-3 py-2 opacity-80"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-900 line-through">
                        <CountryFlag iso2={iso2} />
                        {worldCountryName(iso2)}
                        <span className="text-xs font-medium no-underline">{pi.pendingRemove}</span>
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-700"
                        onClick={() =>
                          setPendingCountryRemoves((prev) => prev.filter((c) => c !== iso2))
                        }
                      >
                        {common.cancel}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div data-field="primaryPhone" className={wrapChanged("primaryPhone")}>
                <Field
                  label={pi.primaryPhone}
                  required
                  invalid={invalidFields.has("primaryPhone") || invalidFields.has("primaryMessengers")}
                  error={
                    invalidFields.has("primaryPhone")
                      ? fieldError("primaryPhone")
                      : invalidFields.has("primaryMessengers")
                        ? fieldError("primaryMessengers")
                        : undefined
                  }
                  changed={isChanged("primaryPhone") || isChanged("primaryMessengers")}
                  previous={fieldChange("primaryPhone")?.from || fieldChange("primaryMessengers")?.from}
                >
                  <div className="flex items-start gap-2">
                    <input
                      className={cn(fieldClass("primaryPhone"), "min-w-0 flex-1")}
                      value={settings.primaryPhone}
                      onChange={(e) => patch({ primaryPhone: e.target.value })}
                      onBlur={() => validateFieldLive("primaryPhone")}
                    />
                    <div data-field="primaryMessengers">
                      <PhoneMessengerIcons
                        selected={settings.primaryMessengers ?? []}
                        invalid={invalidFields.has("primaryMessengers")}
                        labels={{
                          WHATSAPP: "WhatsApp",
                          TELEGRAM: "Telegram",
                          VIBER: "Viber",
                        }}
                        onChange={(primaryMessengers: PartnerSocialPlatform[]) => {
                          patch({ primaryMessengers });
                          markFieldInvalid("primaryMessengers", primaryMessengers.length === 0);
                        }}
                      />
                    </div>
                  </div>
                </Field>
                <p className="mt-1 text-[11px] text-slate-500">{pi.messengersHint}</p>
              </div>
              <div data-field="secondaryPhone" className={wrapChanged("secondaryPhone")}>
                <Field
                  label={pi.secondPhone}
                  required
                  invalid={invalidFields.has("secondaryPhone") || invalidFields.has("secondaryMessengers")}
                  error={
                    invalidFields.has("secondaryPhone")
                      ? fieldError("secondaryPhone")
                      : invalidFields.has("secondaryMessengers")
                        ? fieldError("secondaryMessengers")
                        : undefined
                  }
                  changed={isChanged("secondaryPhone") || isChanged("secondaryMessengers")}
                  previous={fieldChange("secondaryPhone")?.from || fieldChange("secondaryMessengers")?.from}
                >
                  <div className="flex items-start gap-2">
                    <input
                      className={cn(fieldClass("secondaryPhone"), "min-w-0 flex-1")}
                      value={settings.secondaryPhone}
                      onChange={(e) => patch({ secondaryPhone: e.target.value })}
                      onBlur={() => validateFieldLive("secondaryPhone")}
                    />
                    <div data-field="secondaryMessengers">
                      <PhoneMessengerIcons
                        selected={settings.secondaryMessengers ?? []}
                        invalid={invalidFields.has("secondaryMessengers")}
                        labels={{
                          WHATSAPP: "WhatsApp",
                          TELEGRAM: "Telegram",
                          VIBER: "Viber",
                        }}
                        onChange={(secondaryMessengers: PartnerSocialPlatform[]) => {
                          patch({ secondaryMessengers });
                          markFieldInvalid("secondaryMessengers", secondaryMessengers.length === 0);
                        }}
                      />
                    </div>
                  </div>
                </Field>
                <p className="mt-1 text-[11px] text-slate-500">{pi.messengersHint}</p>
              </div>
              <div data-field="email" className={wrapChanged("email")}>
                <Field
                  label={pi.email}
                  required
                  invalid={invalidFields.has("email")}
                  error={fieldError("email")}
                  changed={isChanged("email")}
                  previous={fieldChange("email")?.from}
                >
                  <input
                    className={fieldClass("email")}
                    type="email"
                    value={settings.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    onBlur={() => validateFieldLive("email")}
                  />
                </Field>
              </div>
              <div data-field="website" className={wrapChanged("website")}>
                <Field
                  label={pi.website}
                  invalid={invalidFields.has("website")}
                  error={fieldError("website")}
                  changed={isChanged("website")}
                  previous={fieldChange("website")?.from}
                >
                  <input
                    className={fieldClass("website")}
                    value={settings.website}
                    onChange={(e) => patch({ website: e.target.value })}
                    onBlur={() => validateFieldLive("website")}
                  />
                </Field>
              </div>
            </div>
          </div>
        </Section>

        <Section id="work-days" title={pi.sections.workDays}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div data-field="workingDays" className={wrapChanged("workingDays")}>
              <p
                className={cn(
                  "mb-3 text-sm font-bold",
                  isChanged("workingDays") ? "text-red-700" : "text-slate-700",
                )}
              >
                {pi.workingDays}
              </p>
              {isChanged("workingDays") && fieldChange("workingDays") ? (
                <p className="mb-2 text-xs font-semibold text-red-700">შეიცვალა სამუშაო საათები</p>
              ) : null}
              <div className="space-y-3">
                {dayEntries.map(({ key, label }) => {
                  const day = settings.workingDays[key] ?? { enabled: true, start: "09:00", end: "21:00" };
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={day.enabled} onChange={(e) => setWorkingDay(key, { enabled: e.target.checked })} />
                        {label}
                      </label>
                      {day.enabled ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <input className={inputClass} type="time" value={day.start} onChange={(e) => setWorkingDay(key, { start: e.target.value })} />
                          <input className={inputClass} type="time" value={day.end} onChange={(e) => setWorkingDay(key, { end: e.target.value })} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-5">
              <div data-field="pricingCurrency" className={wrapChanged("pricingCurrency")}>
                <p
                  className={cn(
                    "mb-2 text-sm font-bold",
                    isChanged("pricingCurrency") ? "text-red-700" : "text-slate-700",
                  )}
                >
                  {pi.pricingCurrency}
                </p>
                <Field
                  label={common.currency}
                  changed={isChanged("pricingCurrency")}
                  previous={fieldChange("pricingCurrency")?.from}
                >
                  <select
                    className={cn(inputClass, isChanged("pricingCurrency") && inputErrorClass)}
                    value={settings.pricingCurrency}
                    onChange={(e) => onPricingCurrencyChange(e.target.value as PartnerPricingCurrency)}
                    disabled={isAdminReview}
                  >
                    {PARTNER_PRICING_CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {PARTNER_PRICING_CURRENCY_LABELS[code]}
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="mt-1.5 text-xs text-slate-500">
                  {pi.currencyHelp}
                </p>
              </div>
              <div data-field="prepMinutes" className={wrapChanged("prepMinutes")}>
                <p className="mb-2 text-sm font-bold text-slate-700">{pi.prepTime}</p>
                <Field
                  label={pi.prepMinutes}
                  changed={isChanged("prepMinutes")}
                  previous={fieldChange("prepMinutes")?.from}
                >
                  <input
                    className={cn(inputClass, isChanged("prepMinutes") && inputErrorClass)}
                    inputMode="numeric"
                    value={settings.prepMinutes}
                    onChange={(e) => patch({ prepMinutes: Number(e.target.value) || 0 })}
                    readOnly={isAdminReview}
                  />
                </Field>
              </div>
              <div data-field="publicHolidays" className={wrapChanged("publicHolidays")}>
                <p className="mb-1 text-sm font-bold text-slate-700">{pi.publicHolidays}</p>
                <p className="mb-3 text-xs text-slate-500">
                  {pi.publicHolidaysHelp}
                </p>
                <ul className="mb-2 space-y-1 text-sm">
                  {settings.publicHolidays.map((d) => (
                    <li key={d} className="flex items-center justify-between rounded-md border bg-white px-3 py-1.5">
                      <span>{d}</span>
                      {!isAdminReview ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700"
                          onClick={() => patch({ publicHolidays: settings.publicHolidays.filter((x) => x !== d) })}
                        >
                          {common.remove}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {!isAdminReview ? (
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm font-bold"
                    style={{ borderColor: ACCENT, color: ACCENT }}
                    onClick={() => {
                      const v = window.prompt(pi.holidayPrompt);
                      if (v?.trim()) patch({ publicHolidays: [...settings.publicHolidays, v.trim()] });
                    }}
                  >
                    {pi.addDate}
                  </button>
                ) : null}
              </div>
              <label
                data-field="offHoursService"
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold",
                  wrapChanged("offHoursService"),
                )}
              >
                <input
                  type="checkbox"
                  checked={settings.offHoursService}
                  onChange={(e) => patch({ offHoursService: e.target.checked })}
                  disabled={isAdminReview}
                />
                {pi.offHoursService}
              </label>
              {settings.offHoursService ? (
                <div data-field="offHoursPrice" className={wrapChanged("offHoursPrice")}>
                  <Field
                    label={`${pi.offHoursPrice} (${settings.pricingCurrency})`}
                    changed={isChanged("offHoursPrice")}
                    previous={fieldChange("offHoursPrice")?.from}
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        {moneySymbol}
                      </span>
                      <input
                        className={cn(inputClass, "ps-7", isChanged("offHoursPrice") && inputErrorClass)}
                        inputMode="decimal"
                        value={settings.offHoursPrice}
                        onChange={(e) => patch({ offHoursPrice: e.target.value })}
                        readOnly={isAdminReview}
                      />
                    </div>
                  </Field>
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <Section id="payment-deposit" title={pi.sections.payment}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div
              data-field="rentPaymentMethods"
              className={cn(wrapChanged("rentPaymentMethods"), wrapChanged("requireCreditCard"))}
            >
              <p
                className={cn(
                  "mb-3 text-sm font-bold",
                  isChanged("rentPaymentMethods") || isChanged("requireCreditCard")
                    ? "text-red-700"
                    : "text-slate-700",
                )}
              >
                {pi.paymentMethods}
              </p>
              <div className="space-y-2">
                {RENT_PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={settings.rentPaymentMethods.includes(opt)} onChange={() => toggleList("rentPaymentMethods", opt)} />
                    {opt}
                  </label>
                ))}
              </div>
              <label className="mt-4 flex items-start gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settings.requireCreditCard}
                  onChange={(e) => patch({ requireCreditCard: e.target.checked })}
                />
                <span>
                  {pi.requireCard}
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {pi.requireCardHelp}
                  </span>
                </span>
              </label>
            </div>
            <div
              data-field="depositMethods"
              className={cn(wrapChanged("depositMethods"), wrapChanged("cashDepositRefundDays"))}
            >
              <p
                className={cn(
                  "mb-3 text-sm font-bold",
                  isChanged("depositMethods") || isChanged("cashDepositRefundDays")
                    ? "text-red-700"
                    : "text-slate-700",
                )}
              >
                {pi.depositMethods}
              </p>
              <div className="space-y-2">
                {DEPOSIT_METHOD_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={settings.depositMethods.includes(opt)} onChange={() => toggleList("depositMethods", opt)} />
                    {opt}
                  </label>
                ))}
              </div>
              {settings.depositMethods.includes("Cash") ? (
                <div className="mt-3">
                  <Field label={pi.cashRefundDays}>
                    <input
                      className={cn(inputClass, "w-28")}
                      value={settings.cashDepositRefundDays}
                      onChange={(e) => patch({ cashDepositRefundDays: Number(e.target.value) || 0 })}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <Section id="tariff" title={pi.sections.tariff}>
          <div
            data-field="tariffs"
            className={cn(wrapChanged("tariffs"), wrapChanged("seasonalPricing"))}
          >
          <p className="mb-4 text-sm text-slate-600">
            {pi.tariffHelp}
          </p>
          {isChanged("tariffs") || isChanged("seasonalPricing") ? (
            <p className="mb-3 text-xs font-semibold text-red-700">ტარიფები / სეზონური ფასები შეიცვალა</p>
          ) : null}
          <div className="space-y-3">
            {settings.tariffs.map((t, index) => {
              const minTo = t.fromDays;
              return (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-500">{pi.fromDays}</span>
                  <input
                    className={cn(inputClass, "w-24 bg-slate-50 text-slate-700")}
                    type="number"
                    readOnly
                    tabIndex={-1}
                    value={t.fromDays}
                    title={index === 0 ? "1" : undefined}
                  />
                  <span className="text-sm text-slate-500">{pi.toDays}</span>
                  <input
                    className={cn(inputClass, "w-24")}
                    type="number"
                    min={minTo}
                    value={t.toDays}
                    onChange={(e) => updateTariff(index, { toDays: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"
                    onClick={() => removeTariffInterval(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500">
              {dictionary.createCar.daysPlus.replace(
                "{n}",
                String(tariffPlusFromDays(settings.tariffs)),
              )}
            </div>
            {settings.tariffs.length < MAX_TARIFF_INTERVALS ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-white"
                style={{ backgroundColor: ACCENT }}
                onClick={addTariffInterval}
              >
                <Plus className="h-4 w-4" /> {pi.addInterval}
              </button>
            ) : null}
          </div>
          </div>
        </Section>

        <Section id="contract" title={pi.sections.contract}>
          <div className="rounded-lg border border-[#d5dde6] bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-[#2a3340]">{pi.contractFile}</p>
            <p className="mb-4 text-sm text-slate-600">{pi.contractHelp}</p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={contractInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => void onContractFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={contractUploading}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => contractInputRef.current?.click()}
              >
                {contractUploading ? "…" : settings.contractUrl ? common.replace : common.upload}
              </button>
              {settings.contractUrl ? (
                <>
                  <a
                    href={settings.contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-sky-700 underline hover:text-sky-900"
                  >
                    {settings.contractUrl.split("/").pop() || pi.contractFile}
                  </a>
                  <button
                    type="button"
                    className="text-sm font-semibold text-red-600 hover:underline"
                    onClick={() =>
                      patch(
                        normalizeContractSelection({
                          contractUrl: "",
                          partnerContractActive: false,
                          useSiteContract: true,
                        }),
                      )
                    }
                  >
                    {pi.contractRemove}
                  </button>
                </>
              ) : (
                <span className="text-sm text-slate-500">{pi.contractHint}</span>
              )}
            </div>
            {settings.contractUrl ? (
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={settings.partnerContractActive}
                  onChange={(e) => setPartnerContractActive(e.target.checked)}
                />
                <span>
                  {settings.partnerContractActive ? pi.ownContractActive : pi.activateOwnContract}
                </span>
              </label>
            ) : null}
          </div>
        </Section>

        {!isAdminReview ? (
          <Section id="password-service" title={pi.sections.password}>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-3">
                <Field label={pi.oldPassword}>
                  <div className="relative">
                    <input
                      className={cn(inputClass, "pe-10")}
                      type={showOldPassword ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowOldPassword((open) => !open)}
                      aria-label={
                        showOldPassword
                          ? locale === "ka"
                            ? "პაროლის დამალვა"
                            : locale === "ru"
                              ? "Скрыть пароль"
                              : "Hide password"
                          : locale === "ka"
                            ? "პაროლის ჩვენება"
                            : locale === "ru"
                              ? "Показать пароль"
                              : "Show password"
                      }
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label={pi.newPassword}>
                  <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </Field>
                <Field label={pi.confirmPassword}>
                  <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </Field>
              </div>
              <div>
                <p className="text-sm text-slate-600">
                  {pi.stopServiceHelp}
                </p>
                <button type="button" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-700 hover:underline">
                  {pi.stopService}
                </button>
              </div>
            </div>
          </Section>
        ) : null}
      </div>

      <footer
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8",
          isAdminReview && "pointer-events-auto",
        )}
        style={{
          backgroundColor: pendingRemoderation ? HEADER_BAND_REMOD : HEADER_BAND,
          borderColor: pendingRemoderation ? HEADER_BORDER_REMOD : HEADER_BORDER,
          color: pendingRemoderation ? HEADER_TEXT_REMOD : HEADER_TEXT,
        }}
      >
        {isAdminReview && adminReview ? (
          <div className="mx-auto max-w-[1200px] space-y-3">
            <label className="block text-xs font-bold opacity-80">
              {locale === "ka"
                ? "კომენტარი პარტნიორისთვის"
                : locale === "ru"
                  ? "Комментарий партнёру"
                  : "Comment for partner"}
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder={
                locale === "ka"
                  ? "დაწერეთ კომენტარი ან უარყოფის მიზეზი…"
                  : locale === "ru"
                    ? "Напишите комментарий или причину отклонения…"
                    : "Write a comment or rejection reason…"
              }
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void runAdminAction("FINAL_APPROVE")}
                className="rounded-md bg-amber-400 px-4 py-2 text-sm font-extrabold text-amber-950 disabled:opacity-60"
              >
                {locale === "ka" ? "დამტკიცება" : locale === "ru" ? "Одобрить" : "Approve"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRejectModalOpen(true)}
                className="rounded-md border border-red-400 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-800 disabled:opacity-60"
              >
                {locale === "ka" ? "უარყოფა" : locale === "ru" ? "Отклонить" : "Reject"}
              </button>
              <Link
                href={adminReview.backHref}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                {adminReview.backLabel}
              </Link>
              {error ? <span className="text-sm font-semibold text-red-700">{error}</span> : null}
              {message ? <span className="text-sm font-semibold text-emerald-800">{message}</span> : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              <Check className="h-4 w-4" />
              {saving ? common.saving : common.save}
            </button>
            {error ? <span className="text-sm font-semibold text-red-700">{error}</span> : null}
            {message ? <span className="text-sm font-semibold text-emerald-800">{message}</span> : null}
          </div>
        )}
      </footer>

      {isAdminReview && rejectModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reject-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 id="admin-reject-title" className="text-lg font-extrabold text-[#0b1f4b]">
              {locale === "ka"
                ? "უარყოფის შეტყობინება"
                : locale === "ru"
                  ? "Сообщение об отклонении"
                  : "Rejection message"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "ka"
                ? "მიუთითეთ, რის გამო არ მოხდა პროფილის განახლება. შეტყობინება გაეგზავნება პარტნიორს."
                : locale === "ru"
                  ? "Укажите причину отклонения обновления профиля. Сообщение будет отправлено партнёру."
                  : "Explain why the profile update was denied. The partner will receive this message."}
            </p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
            {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !adminNote.trim()}
                onClick={() => void runAdminAction("REJECT")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {locale === "ka" ? "გაგზავნა და უარყოფა" : locale === "ru" ? "Отправить и отклонить" : "Send & reject"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRejectModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                {common.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
