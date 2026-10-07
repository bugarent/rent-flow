"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, FileText, Trash2, UploadCloud } from "lucide-react";
import { CREATE_AUTO_BACKDROP_URL, MIN_PUBLIC_PHOTOS } from "@/lib/brand";
import { isStudioCoverUrl } from "@/lib/cars/studio-cover-url";
import { PARTNER_BASE } from "@/lib/routes";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import { isMandatoryExtra, isMandatoryFreeExtra } from "@/lib/extras/pricing";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import {
  buildExtraSelections,
  type PartnerExtraSelection,
} from "@/components/partner/partner-extras-fields";
import {
  buildDeliverySelections,
  type PartnerDeliverySelection,
} from "@/components/partner/partner-delivery-fields";
import {
  PartnerPickupDropoffSection,
  buildPlaceRowsForLocations,
  pickupPlacesToDeliveryPayload,
  type PickupPlaceRow,
} from "@/components/partner/partner-pickup-dropoff-section";
import { isSyntheticDeliveryId } from "@/lib/delivery/pricing";
import { parseCarDetails } from "@/lib/cars/car-details";
import { diffCarAgainstPublished, fieldChangesMapFromRecord } from "@/lib/cars/car-published-diff";
import {
  insuranceExpiryReasonLabel,
  isInsuranceDateExpired,
  isInsuranceExpiryReason,
} from "@/lib/cars/insurance-expiry-reason";
import type { PublishedCarSnapshot } from "@/lib/server/car-published-store";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { usePartnerMoneyOptional } from "@/components/providers/partner-money-context";
import { cn, formatMoney } from "@/lib/utils";
import { compressImageForUpload } from "@/lib/files/compress-image";
import { CAR_COLORS, carColorLabel } from "@/lib/catalog/car-colors";
import { CAR_MAKES_MODELS } from "@/lib/catalog/car-models";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
  sanitizeRegistrationInput,
} from "@/lib/cars/registration-number";
import {
  DEFAULT_PARTNER_PRICING_CURRENCY,
  type PartnerPricingCurrency,
  type TariffInterval,
  normalizeTariffIntervals,
  tariffPlusFromDays,
} from "@/lib/partners/company-settings";
import {
  partnerAmountToEur,
  partnerCurrencySymbol,
  eurToPartnerAmount,
} from "@/lib/partners/pricing-currency";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import {
  buildCreateAutoSeasonRows,
  emptyRates,
  emptySeasonalPricing,
  defaultNewSeasonPeriod,
  FIXED_BASE_SEASON,
  normalizeMd,
  type CarSeasonRates,
  type PartnerSeasonalPricing,
} from "@/lib/partners/seasonal-pricing";
import type { PartnerCreateCarCopy } from "@/lib/i18n/partner-ui";
import { isAllowedInsuranceFile, insuranceFileName, isPdfUrl } from "@/lib/files/document-url";
import {
  PartnerCarPhotoGallery,
  filledPhotoCount,
  photosForSave,
} from "@/components/partner/partner-car-photo-gallery";
import { PartnerImageLightbox } from "@/components/partner/partner-image-lightbox";
import { DateInput } from "@/components/ui/date-input";

function mdToDateInput(md: string): string {
  const n = normalizeMd(md) || "01-01";
  const [mm, dd] = n.split("-");
  return `2026-${mm}-${dd}`;
}

function dateInputToMd(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return "";
  return normalizeMd(`${m[2]}-${m[3]}`);
}

function partnerMoney(
  amount: string | number | null | undefined,
  currency: PartnerPricingCurrency,
  rates: FxRates,
): string {
  if (amount == null || amount === "") return "";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return eurToPartnerAmount(n, currency, rates);
}

function ratesToPartner(
  rates: Record<string, string | number> | undefined,
  currency: PartnerPricingCurrency,
  fx: FxRates,
): CarSeasonRates {
  return {
    d1_3: partnerMoney(rates?.d1_3, currency, fx),
    d4_5: partnerMoney(rates?.d4_5, currency, fx),
    d6_30: partnerMoney(rates?.d6_30, currency, fx),
    d31: partnerMoney(rates?.d31, currency, fx),
  };
}

const SECTION_IDS = [
  "main-info",
  "pickup-dropoff",
  "pricing",
  "mileage",
  "insurance",
  "extras",
  "specs",
  "music",
  "photo",
  "certificate",
] as const;

type CreateCarSectionId = (typeof SECTION_IDS)[number];

const SECTION_COPY_KEY: Record<CreateCarSectionId, keyof PartnerCreateCarCopy["sections"]> = {
  "main-info": "mainInfo",
  "pickup-dropoff": "pickup",
  pricing: "pricing",
  mileage: "mileage",
  insurance: "insurance",
  extras: "extras",
  specs: "specs",
  music: "music",
  photo: "photo",
  certificate: "certificate",
};

const MUSIC_OPTIONS = [
  "Audio-CD",
  "AUX",
  "Bluetooth",
  "Carplay / Android Auto",
  "MP3",
  "Radio",
  "USB",
  "Video-DVD",
] as const;

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 1 - i);

type PartnerCarCategoryOption = { id: string; slug: string; name: string };

type DeliveryAdjustment = {
  label: string;
  requested: number;
  saved: number;
  max: number;
};

function SectionCard({
  id,
  title,
  children,
  invalid,
  changed,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  invalid?: boolean;
  changed?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 overflow-visible rounded-md border bg-white shadow-[0_1px_2px_rgba(26,0,64,0.04)]",
        changed || invalid ? "border-red-500 ring-2 ring-red-200" : "border-[#d5dde6]",
      )}
    >
      <header
        className={cn(
          "rounded-t-md border-b px-3 py-1.5 text-[12px] font-bold tracking-wide sm:px-4",
          changed
            ? "border-red-200 bg-red-100 text-red-900"
            : "border-[#cfd8e3] bg-[#d9e2e8] text-[#2a3340]",
        )}
      >
        {title}
        {changed ? " · შეიცვალა" : ""}
      </header>
      <div className={cn("px-3 py-2.5 sm:px-4 sm:py-3", changed ? "bg-red-50/50" : "bg-[#fbfcfd]")}>
        {children}
      </div>
    </section>
  );
}

const HEADER_BORDER = "#8fbf9a";
const HEADER_TEXT = "#143322";
const HEADER_BAND = "rgba(168, 210, 178, 0.94)";
const HEADER_BAND_ALERT = "rgba(254, 202, 202, 0.97)";
const HEADER_BORDER_ALERT = "#b91c1c";
const HEADER_TEXT_ALERT = "#7f1d1d";
const ACCENT_GREEN = "#28a745";

const CONTENT_MAX = "lg:max-w-[calc(100%-7cm)]";

const inputClass =
  "w-full rounded-md border border-[#c5ced8] bg-white px-2.5 py-1.5 text-xs text-[#1f2937] outline-none transition placeholder:text-[#9aa3af] focus:border-[#5b4a8a] focus:ring-1 focus:ring-[#5b4a8a]/20";

function Field({
  label,
  required,
  children,
  hint,
  invalid,
  changed,
  previous,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
  invalid?: boolean;
  changed?: boolean;
  previous?: string;
  className?: string;
}) {
  return (
    <label className={cn("block text-xs", changed && "rounded-md border-2 border-red-500 bg-red-50 p-1.5", className)}>
      <span
        className={cn(
          "mb-0.5 block text-[11px] font-semibold leading-tight",
          changed || invalid ? "text-red-700" : "text-[#3a4553]",
        )}
      >
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
        {changed ? <span className="ms-1 font-bold">· შეიცვალა</span> : null}
      </span>
      <div
        className={
          invalid || changed
            ? "[&_input]:border-red-500 [&_input]:ring-1 [&_input]:ring-red-200 [&_select]:border-red-500"
            : undefined
        }
      >
        {children}
      </div>
      {changed && previous ? (
        <span className="mt-0.5 block text-[10px] font-semibold text-red-700">
          იყო: <span className="line-through">{previous}</span>
        </span>
      ) : null}
      {hint ? <span className="mt-0.5 block text-[10px] leading-snug text-[#6b7785]">{hint}</span> : null}
    </label>
  );
}

export type AdminListingReviewConfig = {
  backHref: string;
  backLabel: string;
};

function MoneyInput({
  value,
  onChange,
  symbol,
  invalid,
  placeholder = "0",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  symbol: string;
  invalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={cn(
          inputClass,
          "pe-8",
          invalid && "border-red-500 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode="decimal"
        disabled={disabled}
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
        {symbol}
      </span>
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        className={cn(inputClass, "pe-8")}
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
          const parts = raw.split(".");
          const next =
            parts.length <= 1 ? raw : `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
          const n = Number(next);
          if (next !== "" && Number.isFinite(n) && n > 100) {
            onChange("100");
            return;
          }
          onChange(next);
        }}
        placeholder="0"
        inputMode="decimal"
        disabled={disabled}
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
        %
      </span>
    </div>
  );
}

async function uploadFile(file: File, options?: { original?: boolean }): Promise<{ url: string; styled: boolean }> {
  const payload = options?.original ? file : await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", payload);
  const res = await fetch("/api/partners/uploads", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return { url: String(data.url), styled: Boolean(data.styled) };
}

/** Form slots for saved photos; old auto-generated studio covers are dropped so the first real photo is the cover. */
function photoSlotsFromSaved(urls: string[]) {
  const own = urls.map((url) => String(url || "").trim()).filter((url) => url && !isStudioCoverUrl(url));
  return Array.from({ length: MIN_PUBLIC_PHOTOS }, (_, index) => own[index] || "");
}

const NO_DELIVERY_CATALOG: DeliveryLocationView[] = [];
const NO_EXTRAS_CATALOG: ExtraServicePricing[] = [];

export function PartnerCreateCarForm({
  initialDeliveryCatalog = NO_DELIVERY_CATALOG,
  initialExtrasCatalog = NO_EXTRAS_CATALOG,
  carId,
  adminReview = null,
}: {
  initialDeliveryCatalog?: DeliveryLocationView[];
  initialExtrasCatalog?: ExtraServicePricing[];
  /** When set, form loads this listing and saves via PATCH (Update). */
  carId?: string;
  /** Admin remodeation: read-only partner form with red change highlights. */
  adminReview?: AdminListingReviewConfig | null;
}) {
  const router = useRouter();
  const { dictionary, locale } = usePartnerLocale();
  const moneyCtx = usePartnerMoneyOptional();
  const cc = dictionary.createCar;
  const common = dictionary.common;
  const isAdminReview = Boolean(adminReview);
  const isEdit = Boolean(carId);
  const sectionLabel = (id: CreateCarSectionId) => cc.sections[SECTION_COPY_KEY[id]];
  const [activeSection, setActiveSection] = useState<string>("main-info");
  const [error, setError] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(isEdit);
  const [serverCaps, setServerCaps] = useState<DeliveryAdjustment[] | null>(null);
  const [listingStatus, setListingStatus] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [fieldChanges, setFieldChanges] = useState<Map<string, { previous: string }>>(new Map());
  const [adminNote, setAdminNote] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");

  const isChanged = (key: string) => fieldChanges.has(key);
  const changePrev = (key: string) => fieldChanges.get(key)?.previous;
  const isNewListing = isAdminReview && listingStatus === "PENDING";
  const isRemoderation = isAdminReview && listingStatus === "PENDING_REMODERATION";
  const awaitingAdminModeration = isNewListing || isRemoderation;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [color, setColor] = useState("");
  if (color === "Other") setColor("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<PartnerCarCategoryOption[]>([]);
  const [licenseCat, setLicenseCat] = useState("B");
  const [minDriverAge, setMinDriverAge] = useState("18");
  const [minLicenseYears, setMinLicenseYears] = useState("0");
  const [seasonRates, setSeasonRates] = useState<CarSeasonRates[]>([]);
  const [seasonalPricing, setSeasonalPricing] = useState<PartnerSeasonalPricing>(emptySeasonalPricing());
  const [mileageLimit, setMileageLimit] = useState(false);
  const [mileageKm, setMileageKm] = useState("");
  const [deposit, setDeposit] = useState("0");
  const [franchise, setFranchise] = useState("0");
  const [franchiseEnabled, setFranchiseEnabled] = useState(false);
  const [useSeasonalPricing, setUseSeasonalPricing] = useState(false);
  const [seasonSaving, setSeasonSaving] = useState(false);
  const [seasonSaved, setSeasonSaved] = useState(false);
  const [tariffIntervals, setTariffIntervals] = useState<TariffInterval[]>([
    { fromDays: 1, toDays: 3 },
    { fromDays: 4, toDays: 5 },
    { fromDays: 6, toDays: 30 },
  ]);
  const [tariffPrices, setTariffPrices] = useState<string[]>(["", "", "", ""]);
  const [cardRequired, setCardRequired] = useState(false);
  const [seats, setSeats] = useState("5");
  const [doors, setDoors] = useState("4");
  const [ac, setAc] = useState("Air Conditioning");
  const [interior, setInterior] = useState("Fabric");
  const [windows, setWindows] = useState("none");
  const [airbags, setAirbags] = useState("0");
  const [steering, setSteering] = useState("left");
  const [cruise, setCruise] = useState(false);
  const [rearCam, setRearCam] = useState(false);
  const [parkingAssist, setParkingAssist] = useState(false);
  const [fuel, setFuel] = useState("PETROL");
  const [engineVolume, setEngineVolume] = useState("");
  const [consumption, setConsumption] = useState("");
  const [transmission, setTransmission] = useState("AUTOMATIC");
  const [drive, setDrive] = useState("");
  const [abs, setAbs] = useState(false);
  const [ebd, setEbd] = useState(false);
  const [esp, setEsp] = useState(false);
  const [music, setMusic] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>(() =>
    Array.from({ length: MIN_PUBLIC_PHOTOS }, () => ""),
  );
  const [passportFront, setPassportFront] = useState("");
  const [passportBack, setPassportBack] = useState("");
  const [insuranceUrl, setInsuranceUrl] = useState("");
  const [insuranceExpiresAt, setInsuranceExpiresAt] = useState("");
  const insuranceExpiredReview =
    awaitingAdminModeration &&
    (isInsuranceExpiryReason(moderationReason) ||
      isChanged("insuranceExpiresAt") ||
      isInsuranceDateExpired(insuranceExpiresAt));
  const [uploading, setUploading] = useState(false);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [extrasCatalog, setExtrasCatalog] = useState<ExtraServicePricing[]>(initialExtrasCatalog);
  const [extraSelections, setExtraSelections] = useState<PartnerExtraSelection[]>(() =>
    buildExtraSelections(initialExtrasCatalog),
  );
  const [deliveryCatalog, setDeliveryCatalog] = useState<DeliveryLocationView[]>(initialDeliveryCatalog);
  const [locationsReady, setLocationsReady] = useState(initialDeliveryCatalog.length > 0);
  const [deliverySelections, setDeliverySelections] = useState<PartnerDeliverySelection[]>(() =>
    buildDeliverySelections(initialDeliveryCatalog).map((row) => ({
      ...row,
      enabled: false,
      priceEur: row.priceEur || "0",
    })),
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [pickupPlaces, setPickupPlaces] = useState<PickupPlaceRow[]>([]);
  const [pricingCurrency, setPricingCurrency] = useState<PartnerPricingCurrency>(
    DEFAULT_PARTNER_PRICING_CURRENCY,
  );
  const [fxRates, setFxRates] = useState<FxRates>(DEFAULT_FX_RATES);

  const moneySymbol = partnerCurrencySymbol(pricingCurrency);
  const toEur = (amount: string | number | null | undefined) =>
    partnerAmountToEur(amount, pricingCurrency, fxRates);
  const fromEurLabel = (amountEur: number) => formatMoney(amountEur, pricingCurrency, fxRates);

  const fxStamp = moneyCtx
    ? `${moneyCtx.fxRates.eurUsd}|${moneyCtx.fxRates.eurGbp}|${moneyCtx.fxRates.eurGel}|${moneyCtx.fxRates.eurRub}`
    : "";
  const [fxStampSeen, setFxStampSeen] = useState("");
  if (moneyCtx && fxStamp !== fxStampSeen) {
    setFxStampSeen(fxStamp);
    setFxRates(moneyCtx.fxRates);
  }

  const insuranceRef = useRef<HTMLInputElement>(null);
  const passportFrontRef = useRef<HTMLInputElement>(null);
  const passportBackRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        /** Admin remodeation: skip partner-only APIs (they hang/fail when DB is offline). */
        if (isAdminReview && carId) {
          const nextCurrency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY;
          const nextRates: FxRates = DEFAULT_FX_RATES;
          setPricingCurrency(nextCurrency);
          setFxRates(nextRates);

          const [extrasRes, categoriesRes, carRes, delRes] = await Promise.all([
            fetch("/api/extras").catch(() => null),
            fetch("/api/partners/car-categories").catch(() => null),
            fetch(`/api/cars/${encodeURIComponent(carId)}`, {
              cache: "no-store",
              signal: AbortSignal.timeout(20_000),
            }),
            fetch("/api/admin/delivery", { cache: "no-store" }).catch(() => null),
          ]);
          if (cancelled) return;

          const categoriesData = categoriesRes?.ok ? await categoriesRes.json().catch(() => []) : [];
          if (Array.isArray(categoriesData)) {
            setCategoryOptions(
              categoriesData
                .map((row: { id?: string; slug?: string; name?: string }) => ({
                  id: String(row.id || row.slug || ""),
                  slug: String(row.slug || ""),
                  name: String(row.name || row.slug || ""),
                }))
                .filter((row: PartnerCarCategoryOption) => row.slug),
            );
          }

          const extras = extrasRes?.ok ? await extrasRes.json().catch(() => []) : [];
          const car = await carRes.json().catch(() => ({}));
          if (!carRes.ok) {
            throw new Error(typeof car.error === "string" ? car.error : cc.errUpdateFailed);
          }

          const details = parseCarDetails(car.description);
          setListingStatus(String(car.status || ""));
          setModerationReason(String((car as { hiddenReason?: string | null }).hiddenReason || ""));
          const snapshot = (car.publishedSnapshot || null) as PublishedCarSnapshot | null;
          const photoUrls = Array.isArray(car.photos)
            ? car.photos
                .map((p: { url?: string } | string) =>
                  typeof p === "string" ? p : String(p?.url || ""),
                )
                .filter(Boolean)
            : [];
          const serverChanges =
            car.fieldChanges && typeof car.fieldChanges === "object"
              ? fieldChangesMapFromRecord(car.fieldChanges as Record<string, { previous: string }>)
              : null;
          const computed = diffCarAgainstPublished({
            live: {
              make: car.make,
              model: car.model,
              year: car.year,
              registrationNumber: car.registrationNumber,
              seats: car.seats,
              doors: car.doors,
              fuelType: car.fuelType,
              transmission: car.transmission,
              dailyRateEur: car.dailyRateEur,
              description: car.description,
              photoUrls,
              passportFrontUrl: car.passport?.frontUrl || "",
              passportBackUrl: car.passport?.backUrl || "",
              insuranceUrl: car.insuranceUrl || car.passport?.insuranceUrl || "",
            },
            details,
            snapshot,
          });
          setFieldChanges(
            serverChanges && serverChanges.size > 0 ? serverChanges : computed,
          );

          setMake(String(car.make || ""));
          setModel(String(car.model || ""));
          setYear(String(car.year || new Date().getFullYear()));
          setPlate(
            sanitizeRegistrationInput(String(details?.plate || car.registrationNumber || "")),
          );
          setColor(String(details?.color || ""));
          const savedSlug = String(car.categorySlug || "").trim();
          const savedBody = String(details?.bodyType || "").trim();
          setCategorySlug(savedSlug || savedBody);
          setLicenseCat(String(details?.licenseCat || "B"));
          setMinDriverAge(String(details?.minDriverAge ?? "18"));
          setMinLicenseYears(String(details?.minLicenseYears ?? "0"));
          setSeats(String(car.seats ?? 5));
          setDoors(String(car.doors ?? 4));
          setTransmission(String(car.transmission || "AUTOMATIC"));
          setFuel(String(car.fuelType || "PETROL"));
          setMileageLimit(Boolean(details?.mileageLimit));
          setMileageKm(String(details?.mileageKm ?? ""));
          setDeposit(partnerMoney(details?.deposit, nextCurrency, nextRates) || "0");
          {
            const raw = Number(details?.franchise);
            if (!Number.isFinite(raw) || raw <= 0) setFranchise("0");
            else if (raw <= 100) setFranchise(String(raw));
            else {
              const depEur = Number(details?.deposit);
              if (Number.isFinite(depEur) && depEur > 0) {
                setFranchise(String(Math.min(100, Math.round((raw / depEur) * 10000) / 100)));
              } else setFranchise("0");
            }
          }
          setFranchiseEnabled(details?.franchiseEnabled === true);
          setUseSeasonalPricing(Boolean(details?.useSeasonalPricing));
          setCardRequired(Boolean(details?.cardRequired));
          setAc(String(details?.ac || "Air Conditioning"));
          setInterior(String(details?.interior || "Fabric"));
          setWindows(String(details?.windows || "none"));
          setAirbags(String(details?.airbags ?? "0"));
          setSteering(String(details?.steering || "left"));
          setCruise(Boolean(details?.cruise));
          setRearCam(Boolean(details?.rearCam));
          setParkingAssist(Boolean(details?.parkingAssist));
          setEngineVolume(String(details?.engineVolume || ""));
          setConsumption(String(details?.consumption || ""));
          setDrive(String(details?.drive || ""));
          setAbs(Boolean(details?.abs));
          setEbd(Boolean(details?.ebd));
          setEsp(Boolean(details?.esp));
          setMusic(Array.isArray(details?.music) ? details.music.map(String) : []);
          setPhotos(photoSlotsFromSaved(photoUrls));
          setPassportFront(String(car.passport?.frontUrl || ""));
          setPassportBack(String(car.passport?.backUrl || ""));
          setInsuranceUrl(String(car.insuranceUrl || car.passport?.insuranceUrl || ""));
          setInsuranceExpiresAt(
            String(
              (car as { insuranceExpiresAt?: string }).insuranceExpiresAt ||
                (car.passport as { insuranceExpiresAt?: string } | null | undefined)
                  ?.insuranceExpiresAt ||
                "",
            ).slice(0, 10),
          );

          const tiers = Array.isArray(details?.pricingTiers) ? details.pricingTiers : [];
          if (tiers.length) {
            setTariffPrices(
              Array.from({ length: Math.max(tiers.length, 1) }, (_, i) =>
                partnerMoney(tiers[i]?.priceEur, nextCurrency, nextRates),
              ),
            );
          }

          const carExtras = Array.isArray(car.extras) ? car.extras : [];
          if (Array.isArray(extras) && extras.length) {
            const carExtraIds = new Set(
              carExtras.map((e: { extraServiceId: string }) => e.extraServiceId),
            );
            const filtered = extras.filter(
              (service: ExtraServicePricing) =>
                isMandatoryExtra(service) || carExtraIds.has(service.id),
            );
            setExtrasCatalog(filtered);
            setExtraSelections(
              buildExtraSelections(
                filtered,
                filtered.map((service: ExtraServicePricing) => {
                  const fromCar = carExtras.find(
                    (e: { extraServiceId: string; priceEur?: number; forbidden?: boolean }) =>
                      e.extraServiceId === service.id,
                  );
                  return {
                    extraServiceId: service.id,
                    priceEur: Number(fromCar?.priceEur ?? service.defaultPriceEur ?? 0),
                    forbidden: Boolean(fromCar?.forbidden),
                  };
                }),
              ).map((row) => ({
                ...row,
                enabled:
                  Boolean(row.forbidden) ||
                  carExtraIds.has(row.extraServiceId) ||
                  Boolean(filtered.find((s) => s.id === row.extraServiceId && isMandatoryExtra(s))),
              })),
            );
          }

          const adminDel = delRes?.ok ? await delRes.json().catch(() => null) : null;
          let deliveryList: DeliveryLocationView[] = Array.isArray(adminDel?.locations)
            ? (adminDel.locations as DeliveryLocationView[])
            : Array.isArray(adminDel)
              ? (adminDel as DeliveryLocationView[])
              : [];

          const carDeliveries = Array.isArray(car.deliveryPrices) ? car.deliveryPrices : [];
          // Fallback: build catalog entries from the listing's saved delivery rows
          // so admin review still shows pick-up places when global catalog is empty.
          if (!deliveryList.length && carDeliveries.length) {
            const fromCar: DeliveryLocationView[] = [];
            for (const row of carDeliveries) {
              const id = String(row?.deliveryLocationId || "");
              if (!id) continue;
              const loc = row?.deliveryLocation;
              const iata = String(loc?.airport?.iata || "").toUpperCase();
              const iso2 = String(loc?.airport?.city?.country?.iso2 || "").toUpperCase();
              fromCar.push({
                id,
                airportId: String(loc?.airport?.id || id),
                iata: iata || id.slice(0, 3).toUpperCase(),
                label: iata || id,
                country: iso2 || "",
                kind: "airport",
                countryIso2: iso2 || "XX",
                maxDeliveryPriceEur: Number(row?.priceEur) || 0,
                isActive: loc?.isActive !== false,
                sortOrder: 0,
              });
            }
            deliveryList = fromCar;
          }
          if (deliveryList.length) setDeliveryCatalog(deliveryList);

          const selectedIds = carDeliveries
            .map((d: { deliveryLocationId?: string }) => String(d.deliveryLocationId || ""))
            .filter(Boolean);
          const detailPlaces = Array.isArray(details?.pickupPlaces)
            ? (details.pickupPlaces as Array<{
                deliveryLocationId?: string;
                priceEur?: number | string;
                placeLabel?: string;
                placeKind?: string;
                cityLabel?: string;
                cityKey?: string;
                enabled?: boolean;
              }>)
            : [];
          for (const p of detailPlaces) {
            const id = String(p.deliveryLocationId || "");
            if (id && !selectedIds.includes(id) && !isSyntheticDeliveryId(id)) selectedIds.push(id);
          }
          setSelectedLocationIds(selectedIds);
          const placeRows = buildPlaceRowsForLocations(deliveryList, selectedIds, []).map((row) => {
            const fromCar = carDeliveries.find(
              (d: { deliveryLocationId: string; priceEur?: number }) =>
                d.deliveryLocationId === row.deliveryLocationId,
            );
            const fromDetail = detailPlaces.find(
              (p) => String(p.deliveryLocationId || "") === row.deliveryLocationId,
            );
            const priceSrc = fromCar?.priceEur ?? fromDetail?.priceEur;
            return {
              ...row,
              enabled: true,
              priceEur: partnerMoney(priceSrc, nextCurrency, nextRates) || row.priceEur || "0",
            };
          });
          for (const p of detailPlaces) {
            const id = String(p.deliveryLocationId || "");
            if (!id || !isSyntheticDeliveryId(id)) continue;
            if (placeRows.some((r) => r.deliveryLocationId === id)) continue;
            placeRows.push({
              id,
              cityKey: String(p.cityKey || id),
              cityLabel: String(p.cityLabel || p.placeLabel || ""),
              placeKind: (p.placeKind as PickupPlaceRow["placeKind"]) || "office",
              placeLabel: String(p.placeLabel || ""),
              deliveryLocationId: id,
              enabled: p.enabled !== false,
              priceEur: partnerMoney(p.priceEur, nextCurrency, nextRates) || "0",
              freeAfterDays: "0",
              travelHours: "0",
              travelMinutes: "0",
            });
          }
          setPickupPlaces(placeRows);
          return;
        }

        const [extrasRes, prefsRes, meRes, categoriesRes] = await Promise.all([
          fetch("/api/extras"),
          fetch("/api/partners/extras-prefs"),
          fetch("/api/partners/me"),
          fetch("/api/partners/car-categories"),
        ]);
        const extras = await extrasRes.json();
        const prefsData = prefsRes.ok ? await prefsRes.json() : null;
        const me = await meRes.json();
        const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
        if (cancelled) return;

        if (Array.isArray(categoriesData)) {
          setCategoryOptions(
            categoriesData
              .map((row: { id?: string; slug?: string; name?: string }) => ({
                id: String(row.id || row.slug || ""),
                slug: String(row.slug || ""),
                name: String(row.name || row.slug || ""),
              }))
              .filter((row: PartnerCarCategoryOption) => row.slug),
          );
        }

        let nextCurrency: PartnerPricingCurrency = DEFAULT_PARTNER_PRICING_CURRENCY;
        let nextRates: FxRates = DEFAULT_FX_RATES;
        if (meRes.ok) {
          if (me.pricingCurrency === "USD" || me.pricingCurrency === "EUR" || me.pricingCurrency === "GEL") {
            nextCurrency = me.pricingCurrency;
            setPricingCurrency(nextCurrency);
          }
          if (me.fxRates && typeof me.fxRates === "object") {
            nextRates = {
              eurUsd: Number(me.fxRates.eurUsd) || DEFAULT_FX_RATES.eurUsd,
              eurGbp: Number(me.fxRates.eurGbp) || DEFAULT_FX_RATES.eurGbp,
              eurGel: Number(me.fxRates.eurGel) || DEFAULT_FX_RATES.eurGel,
              eurRub: Number(me.fxRates.eurRub) || DEFAULT_FX_RATES.eurRub,
            };
            setFxRates(nextRates);
          }
        }

        if (extrasRes.ok && Array.isArray(extras)) {
          type PrefItem = {
            service?: { id?: string };
            enabled?: boolean;
            forbidden?: boolean;
            priceEur?: number;
          };
          const prefItems: PrefItem[] = Array.isArray(prefsData?.items) ? prefsData.items : [];
          const prefById = new Map<string, PrefItem>(
            prefItems.map((item) => [String(item.service?.id || ""), item]),
          );
          const hasPrefs = prefItems.length > 0;
          const filtered = extras.filter((service: ExtraServicePricing) => {
            if (isMandatoryExtra(service)) return true;
            if (!hasPrefs) return false;
            const pref = prefById.get(service.id);
            return Boolean(pref?.enabled || pref?.forbidden);
          });
          const existingPrices = filtered.map((service: ExtraServicePricing) => {
            const pref = prefById.get(service.id);
            const price =
              pref?.forbidden
                ? 0
                : pref?.priceEur != null
                  ? Number(pref.priceEur)
                  : Number(service.defaultPriceEur ?? service.minPriceEur ?? 0);
            return {
              extraServiceId: service.id,
              priceEur: price,
              forbidden: Boolean(pref?.forbidden),
            };
          });
          setExtrasCatalog(filtered);
          setExtraSelections(
            buildExtraSelections(filtered, existingPrices).map((row) => ({
              ...row,
              priceEur:
                row.forbidden || !row.priceEur || row.priceEur === "0"
                  ? row.priceEur
                  : eurToPartnerAmount(row.priceEur, nextCurrency, nextRates),
            })),
          );
        }
        if (meRes.ok && Array.isArray(me.deliveryCatalog) && me.deliveryCatalog.length) {
          const delivery = (me.deliveryCatalog as DeliveryLocationView[]).map((loc) => {
            const airport = Array.isArray(me.airports)
              ? me.airports.find(
                  (a: { iata?: string; label?: string }) =>
                    String(a.iata || "").toUpperCase() === loc.iata.toUpperCase(),
                )
              : null;
            const cityFromAirport = airport?.label
              ? String(airport.label).split("(")[0]?.trim()
              : undefined;
            return {
              ...loc,
              cityName: loc.cityName || cityFromAirport,
            };
          });
          setDeliveryCatalog(delivery);
          setDeliverySelections(
            buildDeliverySelections(delivery).map((row) => ({
              ...row,
              enabled: false,
              priceEur: row.priceEur || "0",
            })),
          );
        }
        if (meRes.ok) {
          const pricing =
            me.seasonalPricing && typeof me.seasonalPricing === "object"
              ? (me.seasonalPricing as PartnerSeasonalPricing)
              : emptySeasonalPricing();
          setSeasonalPricing(pricing);
          const meta = buildCreateAutoSeasonRows(pricing);
          setSeasonRates((prev) => meta.map((_, i) => prev[i] ?? emptyRates()));
          if (Array.isArray(me.tariffs) && me.tariffs.length) {
            const intervals = normalizeTariffIntervals(me.tariffs as TariffInterval[]);
            setTariffIntervals(intervals);
            setTariffPrices((prev) =>
              Array.from({ length: intervals.length + 1 }, (_, i) => prev[i] ?? ""),
            );
          }
        }

        if (carId) {
          const carRes = await fetch(`/api/cars/${carId}`, { cache: "no-store" });
          const car = await carRes.json();
          if (!carRes.ok) throw new Error(typeof car.error === "string" ? car.error : cc.errUpdateFailed);
          if (cancelled) return;

          const details = parseCarDetails(car.description);
          setListingStatus(String(car.status || ""));
          setModerationReason(String((car as { hiddenReason?: string | null }).hiddenReason || ""));
          const snapshot = (car.publishedSnapshot || null) as PublishedCarSnapshot | null;
          const photoUrls = Array.isArray(car.photos)
            ? car.photos
                .map((p: { url?: string } | string) =>
                  typeof p === "string" ? p : String(p?.url || ""),
                )
                .filter(Boolean)
            : [];
          if (isAdminReview) {
            const serverChanges =
              car.fieldChanges && typeof car.fieldChanges === "object"
                ? fieldChangesMapFromRecord(car.fieldChanges as Record<string, { previous: string }>)
                : null;
            const computed = diffCarAgainstPublished({
              live: {
                make: car.make,
                model: car.model,
                year: car.year,
                registrationNumber: car.registrationNumber,
                seats: car.seats,
                doors: car.doors,
                fuelType: car.fuelType,
                transmission: car.transmission,
                dailyRateEur: car.dailyRateEur,
                description: car.description,
                photoUrls,
                passportFrontUrl: car.passport?.frontUrl || "",
                passportBackUrl: car.passport?.backUrl || "",
                insuranceUrl: car.insuranceUrl || car.passport?.insuranceUrl || "",
              },
              details,
              snapshot,
            });
            setFieldChanges(
              serverChanges && serverChanges.size > 0 ? serverChanges : computed,
            );
          }
          setMake(String(car.make || ""));
          setModel(String(car.model || ""));
          setYear(String(car.year || new Date().getFullYear()));
          setPlate(
            sanitizeRegistrationInput(
              String(details?.plate || car.registrationNumber || ""),
            ),
          );
          setColor(String(details?.color || ""));
          const savedSlug = String(car.categorySlug || "").trim();
          const savedBody = String(details?.bodyType || "").trim();
          setCategorySlug(savedSlug || savedBody);
          setLicenseCat(String(details?.licenseCat || "B"));
          setMinDriverAge(String(details?.minDriverAge ?? "18"));
          setMinLicenseYears(String(details?.minLicenseYears ?? "0"));
          setSeats(String(car.seats ?? 5));
          setDoors(String(car.doors ?? 4));
          setTransmission(String(car.transmission || "AUTOMATIC"));
          setFuel(String(car.fuelType || "PETROL"));
          setMileageLimit(Boolean(details?.mileageLimit));
          setMileageKm(String(details?.mileageKm ?? ""));
          setDeposit(partnerMoney(details?.deposit, nextCurrency, nextRates) || "0");
          {
            const raw = Number(details?.franchise);
            if (!Number.isFinite(raw) || raw <= 0) {
              setFranchise("0");
            } else if (raw <= 100) {
              setFranchise(String(raw));
            } else {
              const depEur = Number(details?.deposit);
              if (Number.isFinite(depEur) && depEur > 0) {
                setFranchise(String(Math.min(100, Math.round((raw / depEur) * 10000) / 100)));
              } else {
                setFranchise("0");
              }
            }
          }
          setFranchiseEnabled(details?.franchiseEnabled === true);
          setUseSeasonalPricing(Boolean(details?.useSeasonalPricing));
          setCardRequired(Boolean(details?.cardRequired));
          setAc(String(details?.ac || "Air Conditioning"));
          setInterior(String(details?.interior || "Fabric"));
          setWindows(String(details?.windows || "none"));
          setAirbags(String(details?.airbags ?? "0"));
          setSteering(String(details?.steering || "left"));
          setCruise(Boolean(details?.cruise));
          setRearCam(Boolean(details?.rearCam));
          setParkingAssist(Boolean(details?.parkingAssist));
          setEngineVolume(String(details?.engineVolume || ""));
          setConsumption(String(details?.consumption || ""));
          setDrive(String(details?.drive || ""));
          setAbs(Boolean(details?.abs));
          setEbd(Boolean(details?.ebd));
          setEsp(Boolean(details?.esp));
          setMusic(Array.isArray(details?.music) ? details.music.map(String) : []);

          setPhotos(photoSlotsFromSaved(photoUrls));
          setPassportFront(String(car.passport?.frontUrl || ""));
          setPassportBack(String(car.passport?.backUrl || ""));
          setInsuranceUrl(String(car.insuranceUrl || car.passport?.insuranceUrl || ""));
          setInsuranceExpiresAt(
            String(
              (car as { insuranceExpiresAt?: string }).insuranceExpiresAt ||
                (car.passport as { insuranceExpiresAt?: string } | null | undefined)
                  ?.insuranceExpiresAt ||
                "",
            ).slice(0, 10),
          );

          const tiers = Array.isArray(details?.pricingTiers) ? details.pricingTiers : [];
          if (tiers.length) {
            setTariffPrices(
              Array.from({ length: Math.max(tiers.length, 1) }, (_, i) =>
                partnerMoney(tiers[i]?.priceEur, nextCurrency, nextRates),
              ),
            );
          }

          const seasonRows = Array.isArray(details?.seasons) ? details.seasons : [];
          if (seasonRows.length) {
            setSeasonRates(
              seasonRows.map((row) =>
                ratesToPartner(
                  (row.rates as Record<string, string | number> | undefined) || undefined,
                  nextCurrency,
                  nextRates,
                ),
              ),
            );
          } else if (details?.rates) {
            setSeasonRates([
              ratesToPartner(details.rates as Record<string, string | number>, nextCurrency, nextRates),
            ]);
          }

          const carExtras = Array.isArray(car.extras) ? car.extras : [];
          if (extrasRes.ok && Array.isArray(extras)) {
            type PrefItem = {
              service?: { id?: string };
              enabled?: boolean;
              forbidden?: boolean;
              priceEur?: number;
            };
            const prefItems: PrefItem[] = Array.isArray(prefsData?.items) ? prefsData.items : [];
            const prefById = new Map<string, PrefItem>(
              prefItems.map((item) => [String(item.service?.id || ""), item]),
            );
            const hasPrefs = prefItems.length > 0;
            const carExtraIds = new Set(carExtras.map((e: { extraServiceId: string }) => e.extraServiceId));
            const filtered = extras.filter((service: ExtraServicePricing) => {
              if (isMandatoryExtra(service)) return true;
              if (carExtraIds.has(service.id)) return true;
              if (!hasPrefs) return false;
              const pref = prefById.get(service.id);
              return Boolean(pref?.enabled || pref?.forbidden);
            });
            const existingPrices = filtered.map((service: ExtraServicePricing) => {
              const fromCar = carExtras.find(
                (e: { extraServiceId: string; priceEur?: number; forbidden?: boolean }) =>
                  e.extraServiceId === service.id,
              );
              const pref = prefById.get(service.id);
              const forbidden = Boolean(fromCar?.forbidden || pref?.forbidden);
              const price = forbidden
                ? 0
                : fromCar?.priceEur != null
                  ? Number(fromCar.priceEur)
                  : pref?.priceEur != null
                    ? Number(pref.priceEur)
                    : Number(service.defaultPriceEur ?? service.minPriceEur ?? 0);
              return { extraServiceId: service.id, priceEur: price, forbidden };
            });
            setExtrasCatalog(filtered);
            setExtraSelections(
              buildExtraSelections(filtered, existingPrices).map((row) => {
                const service = filtered.find((s) => s.id === row.extraServiceId);
                return {
                  ...row,
                  enabled:
                    (service ? isMandatoryExtra(service) : false) ||
                    Boolean(row.forbidden) ||
                    carExtraIds.has(row.extraServiceId),
                  priceEur:
                    row.forbidden || !row.priceEur || row.priceEur === "0"
                      ? row.priceEur
                      : eurToPartnerAmount(row.priceEur, nextCurrency, nextRates),
                };
              }),
            );
          }

          let deliveryList =
            meRes.ok && Array.isArray(me.deliveryCatalog) && me.deliveryCatalog.length
              ? (me.deliveryCatalog as DeliveryLocationView[])
              : initialDeliveryCatalog;
          if (isAdminReview && !deliveryList.length) {
            try {
              const adminDelRes = await fetch("/api/admin/delivery", { cache: "no-store" });
              const adminDel = adminDelRes.ok ? await adminDelRes.json() : null;
              if (Array.isArray(adminDel?.locations)) {
                deliveryList = adminDel.locations as DeliveryLocationView[];
                setDeliveryCatalog(deliveryList);
              } else if (Array.isArray(adminDel)) {
                deliveryList = adminDel as DeliveryLocationView[];
                setDeliveryCatalog(deliveryList);
              }
            } catch {
              /* optional */
            }
          }
          const carDeliveries = Array.isArray(car.deliveryPrices) ? car.deliveryPrices : [];
          const selectedIds = carDeliveries
            .map((d: { deliveryLocationId?: string }) => String(d.deliveryLocationId || ""))
            .filter(Boolean);
          const detailPlaces = Array.isArray(details?.pickupPlaces)
            ? (details.pickupPlaces as Array<{
                deliveryLocationId?: string;
                priceEur?: number | string;
                placeLabel?: string;
                placeKind?: string;
                cityLabel?: string;
                cityKey?: string;
                enabled?: boolean;
              }>)
            : [];
          for (const p of detailPlaces) {
            const id = String(p.deliveryLocationId || "");
            if (id && !selectedIds.includes(id) && !isSyntheticDeliveryId(id)) selectedIds.push(id);
          }
          setSelectedLocationIds(selectedIds);
          const placeRows = buildPlaceRowsForLocations(deliveryList, selectedIds, []).map((row) => {
            const fromCar = carDeliveries.find(
              (d: { deliveryLocationId: string; priceEur?: number }) =>
                d.deliveryLocationId === row.deliveryLocationId,
            );
            const fromDetail = detailPlaces.find(
              (p) => String(p.deliveryLocationId || "") === row.deliveryLocationId,
            );
            const priceSrc = fromCar?.priceEur ?? fromDetail?.priceEur;
            return {
              ...row,
              enabled: true,
              priceEur: partnerMoney(priceSrc, nextCurrency, nextRates) || row.priceEur || "0",
            };
          });
          for (const p of detailPlaces) {
            const id = String(p.deliveryLocationId || "");
            if (!id || !isSyntheticDeliveryId(id)) continue;
            if (placeRows.some((r) => r.deliveryLocationId === id)) continue;
            placeRows.push({
              id,
              cityKey: String(p.cityKey || id),
              cityLabel: String(p.cityLabel || p.placeLabel || ""),
              placeKind: (p.placeKind as PickupPlaceRow["placeKind"]) || "office",
              placeLabel: String(p.placeLabel || ""),
              deliveryLocationId: id,
              enabled: p.enabled !== false,
              priceEur: partnerMoney(p.priceEur, nextCurrency, nextRates) || "0",
              freeAfterDays: "0",
              travelHours: "0",
              travelMinutes: "0",
            });
          }
          setPickupPlaces(placeRows);
          setDeliverySelections(
            buildDeliverySelections(
              deliveryList,
              carDeliveries.map((d: { deliveryLocationId: string; priceEur?: number; freeAfterDays?: number }) => ({
                deliveryLocationId: d.deliveryLocationId,
                priceEur: Number(d.priceEur ?? 0),
                freeAfterDays: d.freeAfterDays,
              })),
            ).map((row) => ({
              ...row,
              enabled: selectedIds.includes(row.deliveryLocationId),
              priceEur:
                !row.priceEur || row.priceEur === "0"
                  ? row.priceEur || "0"
                  : eurToPartnerAmount(row.priceEur, nextCurrency, nextRates),
            })),
          );
        }
      } catch (err) {
        if (!cancelled && carId) {
          setError(err instanceof Error ? err.message : cc.errUpdateFailed);
        }
      } finally {
        // Always clear boot UI — partner APIs can hang when DB is offline; admin path must not stick.
        // A cancelled run must not flag locations as ready while the live run is still loading them.
        if (!cancelled) {
          setLocationsReady(true);
          setBooting(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carId, cc.errUpdateFailed, initialDeliveryCatalog, isAdminReview]);

  useEffect(() => {
    const nodes = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.4, 0.7] },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  const seasonMeta = useMemo(() => buildCreateAutoSeasonRows(seasonalPricing), [seasonalPricing]);
  const seasonStamp = seasonMeta.map((row) => `${row.index}:${row.from}:${row.to}`).join("|");
  const [seasonStampSeen, setSeasonStampSeen] = useState<string | null>(null);
  if (seasonStamp !== seasonStampSeen) {
    setSeasonStampSeen(seasonStamp);
    setSeasonRates((prev) => seasonMeta.map((_, i) => prev[i] ?? emptyRates()));
  }

  const dailyRate = useMemo(() => {
    const fromTariffs = tariffPrices
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (fromTariffs[0]) return fromTariffs[0];
    for (const row of seasonRates) {
      const values = [row.d1_3, row.d4_5, row.d6_30, row.d31]
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (values[0]) return values[0];
    }
    return 0;
  }, [tariffPrices, seasonRates]);

  const setSeasonRateField = (rowIndex: number, key: keyof CarSeasonRates, value: string) => {
    setSeasonRates((prev) => {
      const next = prev.map((row) => ({ ...row }));
      while (next.length <= rowIndex) next.push(emptyRates());
      next[rowIndex] = { ...next[rowIndex], [key]: value };
      return next;
    });
  };

  const persistSeasonalPricing = (next: PartnerSeasonalPricing) => {
    setSeasonalPricing(next);
    return fetch("/api/partners/seasonal-pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => undefined);
  };

  const addSeasonRow = () => {
    const period = defaultNewSeasonPeriod(seasonalPricing.seasons);
    setSeasonalPricing({
      ...seasonalPricing,
      base: seasonalPricing.base || { ...FIXED_BASE_SEASON },
      seasons: [...seasonalPricing.seasons, period],
    });
    setSeasonSaved(false);
  };

  const removeSeasonRow = (rowIndex: number) => {
    const nextSeasons = seasonalPricing.seasons.filter((_, i) => i !== rowIndex);
    const next: PartnerSeasonalPricing = {
      enabled: seasonalPricing.enabled,
      base: seasonalPricing.base || { ...FIXED_BASE_SEASON },
      seasons: nextSeasons,
    };
    void persistSeasonalPricing(next);
    if (nextSeasons.length === 0) setUseSeasonalPricing(false);
    setSeasonSaved(false);
  };

  const updateSeasonPeriod = (rowIndex: number, field: "from" | "to", md: string) => {
    if (!md) return;
    setSeasonalPricing((prev) => ({
      ...prev,
      seasons: prev.seasons.map((s, i) => (i === rowIndex ? { ...s, [field]: md } : s)),
    }));
    setSeasonSaved(false);
  };

  const saveSeasonPeriods = async () => {
    setSeasonSaving(true);
    setSeasonSaved(false);
    try {
      await persistSeasonalPricing({
        ...seasonalPricing,
        base: seasonalPricing.base || { ...FIXED_BASE_SEASON },
        seasons: seasonalPricing.seasons,
      });
      setSeasonSaved(true);
    } finally {
      setSeasonSaving(false);
    }
  };

  const brandOptions = useMemo(
    () => [...CAR_MAKES_MODELS].map((m) => m.make).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const modelOptions = useMemo(() => {
    const entry = CAR_MAKES_MODELS.find((m) => m.make === make);
    return entry?.models ?? [];
  }, [make]);

  const onBrandChange = (nextMake: string) => {
    setMake(nextMake);
    setModel("");
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 160;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    setActiveSection(id);
  };

  const showError = (message: string, sectionId?: string, fields?: string[]) => {
    setError(message);
    setInvalidFields(new Set(fields || []));
    if (sectionId) scrollTo(sectionId);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fieldInvalid = (key: string) => invalidFields.has(key);

  const toggleMusic = (item: string) => {
    setMusic((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const onGalleryFiles = async (
    files: File[],
    _startIndex: number,
  ): Promise<{ urls: string[]; coverUrl?: string }> => {
    if (!files.length) return { urls: [] };
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push((await uploadFile(file, { original: true })).url);
      }
      return { urls };
    } catch (err) {
      showError(err instanceof Error ? err.message : common.uploadFailed, "photo");
      return { urls: [] };
    } finally {
      setUploading(false);
    }
  };

  const onPassportSide = async (side: "front" | "back", files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = (await uploadFile(file)).url;
      if (side === "front") setPassportFront(url);
      else setPassportBack(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : common.uploadFailed, "certificate");
    } finally {
      setUploading(false);
      if (side === "front" && passportFrontRef.current) passportFrontRef.current.value = "";
      if (side === "back" && passportBackRef.current) passportBackRef.current.value = "";
    }
  };

  const onInsuranceFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!isAllowedInsuranceFile(file)) {
      showError(cc.certFormats, "certificate");
      return;
    }
    setUploading(true);
    setError("");
    try {
      setInsuranceUrl((await uploadFile(file)).url);
      setInvalidFields((prev) => {
        if (!prev.has("insurance-file")) return prev;
        const next = new Set(prev);
        next.delete("insurance-file");
        return next;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : common.uploadFailed, "certificate");
    } finally {
      setUploading(false);
      if (insuranceRef.current) insuranceRef.current.value = "";
    }
  };

  const save = async (mode: "sales" | "internal" | "update") => {
    setError("");
    setInvalidFields(new Set());
    const forSale = mode === "sales" || mode === "update";
    const fields: string[] = [];
    let firstSection = "";
    const mark = (section: string, keys: string[]) => {
      if (!firstSection) firstSection = section;
      for (const key of keys) {
        if (!fields.includes(key)) fields.push(key);
      }
    };

    if (!make.trim()) mark("main-info", ["make"]);
    if (!model.trim()) mark("main-info", ["model"]);
    if (forSale && !color.trim()) mark("main-info", ["color"]);
    if (forSale && !categorySlug.trim()) mark("main-info", ["bodyType"]);
    const plateNormalized = normalizeRegistrationNumber(plate);
    if (forSale && !plateNormalized) mark("main-info", ["plate"]);
    else if (plateNormalized && !isValidRegistrationNumber(plateNormalized)) mark("main-info", ["plate"]);

    const pickupPayload = pickupPlacesToDeliveryPayload(pickupPlaces);
    const hasPickup =
      pickupPayload.length > 0 || deliverySelections.some((d) => d.enabled);
    if (forSale && !hasPickup) mark("pickup-dropoff", ["pickup"]);

    if (!dailyRate) {
      const tariffKeys = [
        ...tariffPrices.map((_, index) => `tariff-${index}`),
        `tariff-${tariffIntervals.length}`,
      ];
      mark("pricing", ["season-price", ...tariffKeys]);
    }

    if (forSale && !engineVolume.trim()) mark("specs", ["engineVolume"]);
    if (forSale && !consumption.trim()) mark("specs", ["consumption"]);
    if (forSale && !drive.trim()) mark("specs", ["drive"]);

    if (forSale && filledPhotoCount(photos) < MIN_PUBLIC_PHOTOS) mark("photo", ["photos"]);
    if (forSale && !passportFront) mark("certificate", ["passport-front", "passport"]);
    if (forSale && !passportBack) mark("certificate", ["passport-back", "passport"]);
    if (forSale && !insuranceUrl) mark("certificate", ["insurance-file"]);
    if (forSale && !insuranceExpiresAt.trim()) mark("certificate", ["insurance-expires"]);

    if (fields.length) {
      const uniqueGroups = new Set(
        fields.map((key) => {
          if (key === "make" || key === "model") return "brand";
          if (key === "color" || key === "bodyType") return "body";
          if (key.startsWith("tariff-") || key === "season-price") return "price";
          if (key.startsWith("passport")) return "passport";
          if (key === "insurance-file") return "insurance-file";
          if (key === "insurance-expires") return "insurance-expires";
          return key;
        }),
      );
      let message = common.requiredFields;
      if (uniqueGroups.size === 1) {
        if (uniqueGroups.has("brand")) message = cc.errBrandModel;
        else if (uniqueGroups.has("body")) message = cc.errColorBody;
        else if (uniqueGroups.has("plate") && plateNormalized) message = cc.errPlateFormat;
        else if (uniqueGroups.has("plate")) message = cc.errPlateRequired;
        else if (uniqueGroups.has("price")) message = cc.errDailyPrice;
        else if (uniqueGroups.has("photos")) message = cc.errPhotos.replace("{n}", String(MIN_PUBLIC_PHOTOS));
        else if (uniqueGroups.has("passport")) message = cc.errCertificate;
        else if (uniqueGroups.has("insurance-file")) message = cc.errInsurance;
        else if (uniqueGroups.has("insurance-expires")) message = cc.errInsuranceExpiresAt;
        else if (uniqueGroups.has("pickup") && locationsReady && !deliveryCatalog.length) {
          message = cc.errNoAirports;
        } else if (uniqueGroups.has("pickup")) message = cc.errPickup;
      } else if (
        uniqueGroups.has("passport") ||
        uniqueGroups.has("insurance-file") ||
        uniqueGroups.has("insurance-expires")
      ) {
        message = cc.errCertificateInsurance;
      }
      showError(message, firstSection, fields);
      return;
    }

    let nextDeliveries = deliverySelections;
    if (pickupPayload.length) {
      nextDeliveries = deliveryCatalog.map((loc) => {
        const hit = pickupPayload.find((p) => p.deliveryLocationId === loc.id);
        return {
          deliveryLocationId: loc.id,
          enabled: Boolean(hit),
          priceEur: hit ? String(hit.priceEur) : "0",
          freeAfterDays: hit ? String(hit.freeAfterDays ?? 0) : "0",
          travelTimeMinutes: hit ? String(hit.travelTimeMinutes ?? 0) : "0",
        };
      });
      // Ensure selected pickup ids are marked enabled even if catalog map missed a row.
      for (const p of pickupPayload) {
        if (!nextDeliveries.some((d) => d.deliveryLocationId === p.deliveryLocationId)) {
          nextDeliveries = [
            ...nextDeliveries,
            {
              deliveryLocationId: p.deliveryLocationId,
              enabled: true,
              priceEur: String(p.priceEur ?? 0),
              freeAfterDays: "0",
              travelTimeMinutes: "0",
            },
          ];
        }
      }
      setDeliverySelections(nextDeliveries);
    }

    setLoading(true);
    try {
      if (seasonalPricing.seasons.length) {
        void persistSeasonalPricing({
          ...seasonalPricing,
          enabled: useSeasonalPricing,
          seasons: seasonalPricing.seasons,
        });
      }
      const convertSeasonRates = (row: CarSeasonRates): CarSeasonRates => ({
        d1_3: String(toEur(row.d1_3)),
        d4_5: String(toEur(row.d4_5)),
        d6_30: String(toEur(row.d6_30)),
        d31: String(toEur(row.d31)),
      });
      const selectedCategory =
        categoryOptions.find((c) => c.slug === categorySlug) ||
        categoryOptions.find((c) => c.name === categorySlug);
      const details = {
        plate: plateNormalized || plate,
        color,
        bodyType: selectedCategory?.name || categorySlug,
        categorySlug: selectedCategory?.slug || categorySlug.trim() || undefined,
        licenseCat,
        minDriverAge: Math.max(18, Math.min(70, Number(minDriverAge) || 18)),
        minLicenseYears: Math.max(0, Math.min(10, Number(minLicenseYears) || 0)),
        season: {
          from: seasonMeta[0]?.from ?? "01-01",
          to: seasonMeta[0]?.to ?? "12-31",
        },
        rates: convertSeasonRates(seasonRates[0] ?? emptyRates()),
        seasons: seasonMeta.map((meta, i) => ({
          index: meta.index,
          from: meta.from,
          to: meta.to,
          rates: convertSeasonRates(seasonRates[i] ?? emptyRates()),
        })),
        pickupPlaces: pickupPayload.map((p) => ({
          ...p,
          priceEur: toEur(p.priceEur),
        })),
        mileageLimit,
        mileageKm,
        deposit: String(toEur(deposit)),
        franchise: franchiseEnabled
          ? String(Math.min(100, Math.max(0, Number(franchise) || 0)))
          : "0",
        franchiseEnabled,
        useSeasonalPricing,
        pricingCurrency,
        pricingTiers: [
          ...tariffIntervals.map((t, i) => ({
            fromDays: t.fromDays,
            toDays: t.toDays,
            priceEur: String(toEur(tariffPrices[i] ?? "")),
          })),
          {
            fromDays: tariffPlusFromDays(tariffIntervals),
            toDays: 9999,
            priceEur: String(toEur(tariffPrices[tariffIntervals.length] ?? "")),
          },
        ],
        cardRequired,
        ac,
        interior,
        roof: "",
        windows,
        airbags,
        steering,
        cruise,
        rearCam,
        parkingAssist,
        engineVolume,
        engineHp: "",
        tank: "",
        consumption,
        drive,
        abs,
        ebd,
        esp,
        music,
      };
      const description = `<!--car-details:${JSON.stringify(details)}-->`;
      const extras = extraSelections
        .filter((row) => {
          const service = extrasCatalog.find((s) => s.id === row.extraServiceId);
          if (service && isMandatoryExtra(service)) return true;
          if (row.forbidden) return true;
          return Boolean(row.enabled);
        })
        .map((row) => {
          const service = extrasCatalog.find((s) => s.id === row.extraServiceId);
          const mandatoryFree = service ? isMandatoryFreeExtra(service) : false;
          const forbidden = !(service && isMandatoryExtra(service)) && Boolean(row.forbidden);
          return {
            extraServiceId: row.extraServiceId,
            enabled: true,
            forbidden,
            priceEur: mandatoryFree || forbidden ? 0 : row.priceEur === "" ? null : toEur(row.priceEur),
          };
        });
      const deliveryPrices = (
        pickupPayload.length
          ? pickupPayload.map((p) => ({
              deliveryLocationId: p.deliveryLocationId,
              enabled: true,
              priceEur: String(p.priceEur ?? 0),
              freeAfterDays: "0",
              travelTimeMinutes: "0",
            }))
          : nextDeliveries.filter((row) => row.enabled && !isSyntheticDeliveryId(row.deliveryLocationId))
      ).map((row) => ({
        deliveryLocationId: row.deliveryLocationId,
        enabled: true,
        priceEur: row.priceEur === "" ? null : toEur(row.priceEur),
        freeAfterDays: 0,
        travelTimeMinutes: 0,
      }));
      // Also include synthetic places metadata in description only; airport rows persist to DB.
      const syntheticPlaces = pickupPayload.filter((p) => isSyntheticDeliveryId(p.deliveryLocationId));
      if (syntheticPlaces.length) {
        // already in details.pickupPlaces
      }

      const res = await fetch(isEdit && carId ? `/api/cars/${carId}` : "/api/cars", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: make.trim(),
          model: model.trim(),
          year: Number(year),
          title: `${make.trim()} ${model.trim()} ${year}`.trim(),
          description,
          dailyRateEur: toEur(dailyRate),
          seats: Number(seats) || 5,
          doors: Number(doors) || 4,
          transmission,
          fuelType: fuel,
          photos: photosForSave(photos),
          passportFrontUrl: passportFront || undefined,
          passportBackUrl: passportBack || undefined,
          insuranceUrl: insuranceUrl || undefined,
          insuranceExpiresAt: insuranceExpiresAt.trim() || undefined,
          extras,
          deliveryPrices,
          registrationNumber: plateNormalized || undefined,
          categorySlug: categorySlug.trim() || null,
          ...(isEdit
            ? {}
            : { status: mode === "internal" ? "DRAFT" : "PENDING" }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiErr =
          typeof data.error === "string"
            ? data.error
            : isEdit
              ? cc.errUpdateFailed
              : cc.errCreateFailed;
        const code = typeof data.code === "string" ? data.code : "";
        if (code === "PLATE_TAKEN" || /registration|plate/i.test(apiErr)) {
          showError(code === "PLATE_TAKEN" ? cc.errPlateTaken : apiErr, "main-info", ["plate"]);
        } else if (/photo/i.test(apiErr)) {
          showError(apiErr, "photo", ["photos"]);
        } else if (/passport|certificate/i.test(apiErr)) {
          showError(apiErr, "certificate", ["passport"]);
        } else if (/insurance/i.test(apiErr)) {
          showError(apiErr, "certificate", ["insurance-file"]);
        } else if (/delivery|airport|NO_DELIVERY/i.test(apiErr) || code === "NO_DELIVERY") {
          showError(cc.errDeliveryPlace, "pickup-dropoff", ["pickup"]);
        } else if (/partner profile/i.test(apiErr)) {
          showError(apiErr, "main-info");
        } else if (code === "DB_OFFLINE" || /database unavailable/i.test(apiErr)) {
          showError(common.dbOffline);
        } else {
          showError(
            apiErr === "Failed to create car listing" || apiErr === "Failed to update listing"
              ? isEdit
                ? cc.errUpdateFailed
                : cc.errCreateFailed
              : apiErr,
          );
        }
        setLoading(false);
        return;
      }
      const adjustments = Array.isArray(data.deliveryAdjustments) ? data.deliveryAdjustments : [];
      if (adjustments.length > 0) {
        setServerCaps(adjustments);
        setLoading(false);
        return;
      }
      router.push(PARTNER_BASE);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : isEdit ? cc.errUpdateFailed : cc.errCreateFailed);
      setLoading(false);
    }
  };

  const extraLabel = (service: ExtraServicePricing) => knownText(locale, service.name || service.slug);

  const deleteListing = async () => {
    if (!carId || deleting) return;
    const confirmMsg =
      dictionary.common.delete === "წაშლა"
        ? "ნამდვილად წავშალოთ ეს განცხადება? მოქმედება შეუქცევადია."
        : dictionary.common.delete === "Удалить"
          ? "Удалить это объявление? Действие необратимо."
          : "Delete this listing permanently? This cannot be undone.";
    if (!window.confirm(confirmMsg)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/cars/${carId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : common.saveFailed);
      router.push(PARTNER_BASE);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : common.saveFailed);
      setDeleting(false);
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-sm font-medium text-slate-600">
        {locale === "ka" ? "იტვირთება…" : locale === "ru" ? "Загрузка…" : "Loading…"}
      </div>
    );
  }

  const runAdminAction = async (status: "APPROVED" | "REJECTED") => {
    if (!adminReview || !carId) return;
    if (status === "REJECTED" && !adminNote.trim()) {
      setError(
        locale === "ka"
          ? "უარყოფისთვის საჭიროა კომენტარი"
          : locale === "ru"
            ? "Для отклонения нужен комментарий"
            : "A comment is required to reject",
      );
      setRejectModalOpen(true);
      return;
    }
    setAdminBusy(true);
    setError("");
    setAdminMessage("");
    try {
      const res = await fetch(`/api/cars/${encodeURIComponent(carId)}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" ? { rejectionNote: adminNote.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setRejectModalOpen(false);
      setAdminMessage(
        status === "APPROVED"
          ? locale === "ka"
            ? "განცხადება დამტკიცებულია"
            : "Listing approved"
          : locale === "ka"
            ? "განცხადება უარყოფილია — პარტნიორს გაეგზავნა შეტყობინება"
            : "Listing rejected",
      );
      router.push(adminReview.backHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAdminBusy(false);
    }
  };

  const mainInfoChanged =
    isChanged("make") ||
    isChanged("model") ||
    isChanged("color") ||
    isChanged("bodyType") ||
    isChanged("categorySlug") ||
    isChanged("registration") ||
    isChanged("year") ||
    isChanged("licenseCat") ||
    isChanged("minDriverAge") ||
    isChanged("minLicenseYears");

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CREATE_AUTO_BACKDROP_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f4b]/55 via-[#1A3B5D]/35 to-[#0b1f4b]/25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(24,120,196,0.18),_transparent_60%)]" />
      </div>

      <header
        className={cn("sticky z-40 border-b backdrop-blur-md", isAdminReview ? "top-0" : "top-12")}
        style={{
          backgroundColor: awaitingAdminModeration ? HEADER_BAND_ALERT : HEADER_BAND,
          borderColor: awaitingAdminModeration ? HEADER_BORDER_ALERT : HEADER_BORDER,
          color: awaitingAdminModeration ? HEADER_TEXT_ALERT : HEADER_TEXT,
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
              {locale === "ka" ? "განცხადების მოდერაცია" : "Listing moderation"}
            </p>
            {isNewListing ? (
              <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                {locale === "ka" ? "ახალი განცხადება" : locale === "ru" ? "Новое объявление" : "New listing"}
                {fieldChanges.size > 0 ? ` · ${fieldChanges.size}` : ""}
              </span>
            ) : isRemoderation ? (
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
                {locale === "ka"
                  ? "კორექტირება"
                  : locale === "ru"
                    ? "Корректировка"
                    : "Correction"}
                {fieldChanges.size > 0 ? ` · ${fieldChanges.size}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
        <nav
          className={cn(
            "mx-auto flex w-full gap-0.5 overflow-x-auto px-2 py-0.5 text-[11px] font-semibold sm:px-4 lg:px-6",
            CONTENT_MAX,
          )}
          aria-label={dictionary.calendar.addCar}
        >
          {SECTION_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className={cn(
                "shrink-0 rounded px-2 py-1 whitespace-nowrap",
                activeSection === id
                  ? "underline decoration-2 underline-offset-2"
                  : "opacity-65 hover:bg-black/5 hover:opacity-100",
              )}
              style={
                activeSection === id
                  ? {
                      backgroundColor: awaitingAdminModeration
                        ? "rgba(185, 28, 28, 0.12)"
                        : "rgba(40,167,69,0.14)",
                      color: awaitingAdminModeration ? HEADER_TEXT_ALERT : HEADER_TEXT,
                    }
                  : undefined
              }
            >
              {sectionLabel(id)}
            </button>
          ))}
        </nav>
      </header>

      <div
        className={cn(
          "relative z-10 mx-auto w-full flex-1 px-2 py-2 sm:px-3",
          isAdminReview ? "pb-44 pointer-events-none select-none [&_a]:pointer-events-auto" : "pb-28",
          CONTENT_MAX,
        )}
      >
        <div
          className={cn(
            "space-y-2.5 rounded-xl border px-3 py-3 shadow-[0_12px_40px_rgba(11,31,75,0.18)] backdrop-blur-sm sm:px-4 lg:px-5 lg:py-4",
            awaitingAdminModeration
              ? "border-red-500 bg-red-50"
              : "border-white/50 bg-white/95",
          )}
        >
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div> : null}
        {awaitingAdminModeration ? (
          <div className="rounded-lg border border-red-600 bg-red-100 px-4 py-3 text-sm font-extrabold text-red-950">
            {insuranceExpiredReview
              ? insuranceExpiryReasonLabel(locale)
              : isNewListing
                ? fieldChanges.size > 0
                  ? locale === "ka"
                    ? `ახალი განცხადება — პარტნიორმა განაახლა ${fieldChanges.size} ველი. გაწითლებული ადგილები მონიშნავს ცვლილებებს.`
                    : locale === "ru"
                      ? `Новое объявление — партнёр обновил ${fieldChanges.size} пол(ей). Красным отмечены изменения.`
                      : `New listing — the partner updated ${fieldChanges.size} field(s). Red highlights show what changed.`
                  : locale === "ka"
                    ? "ეს არის ახალი განცხადება — პარტნიორი პირველად აგზავნის მოდერაციაზე."
                    : locale === "ru"
                      ? "Это новое объявление — партнёр отправляет его на модерацию впервые."
                      : "This is a new listing — the partner is submitting it for moderation for the first time."
                : fieldChanges.size > 0
                  ? locale === "ka"
                    ? `კორექტირება ძველ განცხადებაში — ${fieldChanges.size} ველი შეცვლილია. გაწითლებული ადგილები მონიშნავს ცვლილებებს.`
                    : locale === "ru"
                      ? `Корректировка существующего объявления — изменено полей: ${fieldChanges.size}. Красным отмечены изменения.`
                      : `Correction to an existing listing — ${fieldChanges.size} field(s) changed. Red highlights show what the partner updated.`
                  : locale === "ka"
                    ? "განცხადება გაგზავნილია მოდერაციაზე."
                    : locale === "ru"
                      ? "Объявление отправлено на модерацию."
                      : "This listing was sent for moderation."}
          </div>
        ) : null}

        <SectionCard
          id="main-info"
          title={cc.sections.mainInfo}
          changed={mainInfoChanged}
          invalid={
            fieldInvalid("make") ||
            fieldInvalid("model") ||
            fieldInvalid("color") ||
            fieldInvalid("bodyType") ||
            fieldInvalid("plate")
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label={cc.brand}
              required
              className="order-1"
              invalid={fieldInvalid("make")}
              changed={isChanged("make")}
              previous={changePrev("make")}
            >
              <select
                className={cn(inputClass, fieldInvalid("make") && "border-red-500 ring-2 ring-red-200")}
                value={make}
                onChange={(e) => onBrandChange(e.target.value)}
                required
                disabled={isAdminReview}
              >
                <option value="">{cc.selectBrand}</option>
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={cc.bodyColor}
              required
              className="order-3 sm:order-2"
              invalid={fieldInvalid("color")}
              changed={isChanged("color")}
              previous={changePrev("color")}
            >
              <select
                className={cn(
                  inputClass,
                  "text-base sm:text-xs",
                  fieldInvalid("color") && "border-red-500 ring-2 ring-red-200",
                )}
                value={color}
                onChange={(e) => setColor(e.target.value)}
                required
                disabled={isAdminReview}
              >
                <option value="">{common.select}</option>
                {CAR_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {carColorLabel(locale, c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={cc.model}
              required
              className="order-2 sm:order-3"
              invalid={fieldInvalid("model")}
              changed={isChanged("model")}
              previous={changePrev("model")}
            >
              <select
                className={cn(inputClass, fieldInvalid("model") && "border-red-500 ring-2 ring-red-200")}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                disabled={!make || isAdminReview}
              >
                <option value="">{make ? cc.selectModel : cc.selectModelFirst}</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={cc.bodyType}
              required
              className="order-4"
              invalid={fieldInvalid("bodyType")}
              changed={isChanged("bodyType") || isChanged("categorySlug")}
              previous={changePrev("bodyType") || changePrev("categorySlug")}
            >
              <select
                className={cn(inputClass, fieldInvalid("bodyType") && "border-red-500 ring-2 ring-red-200")}
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                required
                disabled={isAdminReview}
              >
                <option value="">{common.select}</option>
                {categoryOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {categorySlug &&
                !categoryOptions.some((c) => c.slug === categorySlug || c.name === categorySlug) ? (
                  <option value={categorySlug}>{categorySlug}</option>
                ) : null}
              </select>
            </Field>
            <div className="order-5 grid min-w-0 grid-cols-2 gap-2">
              <Field
                label={cc.registration}
                required
                invalid={fieldInvalid("plate")}
                changed={isChanged("registration")}
                previous={changePrev("registration")}
              >
                <input
                  className={cn(inputClass, fieldInvalid("plate") && "border-red-500 ring-2 ring-red-200")}
                  value={plate}
                  onChange={(e) => setPlate(sanitizeRegistrationInput(e.target.value))}
                  placeholder="AA123BB"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  lang="en"
                  required
                  readOnly={isAdminReview}
                />
              </Field>
              <Field
                label={cc.year}
                required
                invalid={fieldInvalid("year")}
                changed={isChanged("year")}
                previous={changePrev("year")}
              >
                <select
                  className={cn(inputClass, fieldInvalid("year") && "border-red-500 ring-2 ring-red-200")}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={isAdminReview}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={cc.licenseCat}
              className="order-6"
              changed={isChanged("licenseCat")}
              previous={changePrev("licenseCat")}
            >
              <select
                className={inputClass}
                value={licenseCat}
                onChange={(e) => setLicenseCat(e.target.value)}
                disabled={isAdminReview}
              >
                {["A", "B", "C", "D"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <div className="order-7 grid gap-3 sm:grid-cols-2">
              <Field
                label={cc.minDriverAge}
                changed={isChanged("minDriverAge")}
                previous={changePrev("minDriverAge")}
              >
                <select
                  className={inputClass}
                  value={minDriverAge}
                  onChange={(e) => setMinDriverAge(e.target.value)}
                  disabled={isAdminReview}
                >
                  {Array.from({ length: 53 }, (_, i) => String(i + 18)).map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={cc.minLicenseYears}
                changed={isChanged("minLicenseYears")}
                previous={changePrev("minLicenseYears")}
              >
                <select
                  className={inputClass}
                  value={minLicenseYears}
                  onChange={(e) => setMinLicenseYears(e.target.value)}
                  disabled={isAdminReview}
                >
                  {Array.from({ length: 11 }, (_, i) => String(i)).map((years) => (
                    <option key={years} value={years}>
                      {years === "10" ? "10+" : years}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="pickup-dropoff"
          title={cc.sections.pickup}
          invalid={fieldInvalid("pickup")}
          changed={isChanged("pickupPlaces")}
        >
          <PartnerPickupDropoffSection
            catalog={deliveryCatalog}
            catalogReady={locationsReady}
            selectedLocationIds={selectedLocationIds}
            onSelectedLocationIdsChange={setSelectedLocationIds}
            places={pickupPlaces}
            onPlacesChange={setPickupPlaces}
            invalid={fieldInvalid("pickup")}
          />
        </SectionCard>

        <SectionCard
          id="pricing"
          title={cc.sections.pricing}
          invalid={fieldInvalid("season-price") || fieldInvalid("tariff-0")}
          changed={
            isChanged("pricingTiers") ||
            isChanged("dailyRateEur") ||
            isChanged("deposit") ||
            [...fieldChanges.keys()].some((k) => k.startsWith("tier:"))
          }
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${tariffIntervals.length + 1}, minmax(0, 1fr))`,
            }}
          >
            {tariffIntervals.map((tier, index) => (
              <Field
                key={`${tier.fromDays}-${tier.toDays}-${index}`}
                label={
                  index === 0
                    ? `${cc.dailyPrice} / ${tier.fromDays}–${tier.toDays} ${cc.daysRange}`
                    : `${tier.fromDays}–${tier.toDays} ${cc.daysRange}`
                }
                required={index === 0}
                invalid={fieldInvalid(`tariff-${index}`)}
              >
                <MoneyInput
                  symbol={moneySymbol}
                  value={tariffPrices[index] ?? ""}
                  invalid={fieldInvalid(`tariff-${index}`)}
                  onChange={(v) =>
                    setTariffPrices((prev) => {
                      const next = [...prev];
                      while (next.length <= index) next.push("");
                      next[index] = v;
                      return next;
                    })
                  }
                />
              </Field>
            ))}
            <Field
              label={cc.daysPlus.replace("{n}", String(tariffPlusFromDays(tariffIntervals)))}
              invalid={fieldInvalid(`tariff-${tariffIntervals.length}`)}
            >
              <MoneyInput
                symbol={moneySymbol}
                value={tariffPrices[tariffIntervals.length] ?? ""}
                invalid={fieldInvalid(`tariff-${tariffIntervals.length}`)}
                onChange={(v) =>
                  setTariffPrices((prev) => {
                    const next = [...prev];
                    while (next.length <= tariffIntervals.length) next.push("");
                    next[tariffIntervals.length] = v;
                    return next;
                  })
                }
              />
            </Field>
          </div>

          <div id="price" className="mt-8 scroll-mt-40">
            <p className="mb-1.5 text-xs font-bold text-[#2a3340]">{cc.sections.price}</p>
            {seasonMeta.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#d5dde6]">
                <table className="w-full min-w-[640px] text-left text-[11px]">
                  <thead className="bg-[#e8f5ec] text-xs uppercase text-slate-600">
                    <tr>
                      <th className="p-2">{cc.seasonCol}</th>
                      <th className="p-2">{cc.periodCol}</th>
                      <th className="p-2">1–3 {cc.daysRange}</th>
                      <th className="p-2">4–5 {cc.daysRange}</th>
                      <th className="p-2">6–30 {cc.daysRange}</th>
                      <th className="p-2">31+</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {seasonMeta.map((meta, rowIndex) => {
                      const rates = seasonRates[rowIndex] ?? emptyRates();
                      const keys: (keyof CarSeasonRates)[] = ["d1_3", "d4_5", "d6_30", "d31"];
                      return (
                        <tr key={`season-${rowIndex}`} className="border-t border-slate-200 bg-white">
                          <td className="p-2 font-semibold">#{meta.index}</td>
                          <td className="p-2 whitespace-nowrap text-slate-700">
                            <div className="flex flex-wrap items-center gap-1">
                              <DateInput
                                type="date"
                                className={cn(inputClass, "w-[9.5rem] px-2 py-1.5 text-xs")}
                                value={mdToDateInput(meta.from)}
                                onChange={(e) =>
                                  updateSeasonPeriod(rowIndex, "from", dateInputToMd(e.target.value))
                                }
                              />
                              <span className="text-slate-400">–</span>
                              <DateInput
                                type="date"
                                className={cn(inputClass, "w-[9.5rem] px-2 py-1.5 text-xs")}
                                value={mdToDateInput(meta.to)}
                                onChange={(e) =>
                                  updateSeasonPeriod(rowIndex, "to", dateInputToMd(e.target.value))
                                }
                              />
                            </div>
                          </td>
                          {keys.map((key) => (
                            <td key={key} className="p-2">
                              <MoneyInput
                                symbol={moneySymbol}
                                value={rates[key]}
                                invalid={fieldInvalid("season-price") && rowIndex === 0 && key === "d1_3"}
                                onChange={(v) => setSeasonRateField(rowIndex, key, v)}
                              />
                            </td>
                          ))}
                          <td className="p-2">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={seasonSaving}
                                className="rounded-md px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                                style={{ backgroundColor: ACCENT_GREEN }}
                                onClick={() => void saveSeasonPeriods()}
                              >
                                {seasonSaving ? common.saving : common.save}
                              </button>
                              <button
                                type="button"
                                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                                onClick={() => removeSeasonRow(rowIndex)}
                              >
                                {common.delete}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
            {seasonSaved ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">{cc.seasonSaved}</p>
            ) : null}
            <div className={cn("flex flex-wrap items-center justify-between gap-2", seasonMeta.length ? "mt-1.5" : "")}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={useSeasonalPricing}
                  disabled={!seasonMeta.length}
                  onClick={() => {
                    if (!seasonMeta.length) return;
                    setUseSeasonalPricing((v) => !v);
                  }}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full transition",
                    !seasonMeta.length
                      ? "cursor-not-allowed bg-slate-200"
                      : useSeasonalPricing
                        ? "bg-[#28a745]"
                        : "bg-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                      useSeasonalPricing && seasonMeta.length ? "start-5" : "start-0.5",
                    )}
                  />
                </button>
                <div>
                  <span className="text-[11px] font-bold text-slate-800">{cc.seasonalPricing}</span>
                  <p className="text-xs text-slate-500">{cc.seasonalHelp}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addSeasonRow}
                className="rounded border border-[#28a745] bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100"
              >
                {cc.addSeason}
              </button>
            </div>
            {useSeasonalPricing && seasonMeta.length ? (
              <p className="mt-2 text-xs text-slate-500">{cc.seasonalActive}</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard id="mileage" title={cc.sections.mileage}>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={mileageLimit} onChange={(e) => setMileageLimit(e.target.checked)} />
            {cc.mileageLimit}
          </label>
          {mileageLimit ? (
            <div className="mt-3 max-w-xs">
              <Field label={cc.kmPerDay}>
                <input className={inputClass} value={mileageKm} onChange={(e) => setMileageKm(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard id="insurance" title={cc.sections.insurance}>
          <div className="mb-1 grid gap-2 sm:grid-cols-2">
            <Field label={`${cc.deposit}`} invalid={fieldInvalid("deposit")}>
              <MoneyInput
                symbol={moneySymbol}
                value={deposit}
                onChange={setDeposit}
                invalid={fieldInvalid("deposit")}
              />
            </Field>
            <div>
              <Field label={cc.franchise}>
                <PercentInput
                  value={franchiseEnabled ? franchise : "0"}
                  onChange={setFranchise}
                  disabled={!franchiseEnabled}
                />
              </Field>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={franchiseEnabled}
                  onClick={() => {
                    setFranchiseEnabled((v) => {
                      const next = !v;
                      if (!next) setFranchise("0");
                      return next;
                    });
                  }}
                  className={cn(
                    "relative h-6 w-10 shrink-0 rounded-full transition",
                    franchiseEnabled ? "bg-[#28a745]" : "bg-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                      franchiseEnabled ? "start-4" : "start-0.5",
                    )}
                  />
                </button>
                <span className="text-[10px] font-semibold text-slate-500">
                  {franchiseEnabled ? cc.enabled : "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{cc.franchiseHelp}</p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
            <input type="checkbox" checked={cardRequired} onChange={(e) => setCardRequired(e.target.checked)} />
            {cc.cardRequired}
          </label>
        </SectionCard>

        <SectionCard id="extras" title={cc.sections.extras}>
          {extrasCatalog.length === 0 ? (
            <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
              {cc.extrasEmpty}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {[...extrasCatalog]
                .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
                .map((service) => {
                const row = extraSelections.find((s) => s.extraServiceId === service.id);
                const mandatory = isMandatoryExtra(service);
                const forbidden = !mandatory && Boolean(row?.forbidden);
                const enabled = mandatory || (!forbidden && Boolean(row?.enabled));
                const off = !mandatory && !forbidden && !Boolean(row?.enabled);
                const priceNum = Number(row?.priceEur);
                const isFree =
                  isMandatoryFreeExtra(service) ||
                  forbidden ||
                  !Number.isFinite(priceNum) ||
                  priceNum <= 0;
                const setOffer = (next: "on" | "forbidden" | "off") => {
                  setExtraSelections((prev) =>
                    prev.map((p) =>
                      p.extraServiceId === service.id
                        ? {
                            ...p,
                            enabled: next === "on" || next === "forbidden",
                            forbidden: next === "forbidden",
                            priceEur: next === "forbidden" ? "0" : p.priceEur,
                          }
                        : p,
                    ),
                  );
                };
                return (
                  <div
                    key={service.id}
                    className={cn(
                      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded border bg-white px-2 py-1 text-xs shadow-sm",
                      forbidden
                        ? "border-red-400 bg-red-50/70 ring-1 ring-red-200"
                        : enabled
                          ? "border-[#60d1a6] bg-[#bbf2d5]/70 ring-1 ring-[#60d1a6]/40"
                          : "border-slate-300 bg-slate-50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold leading-tight text-slate-900">
                        {extraLabel(service)}
                      </p>
                      {mandatory ? (
                        <p className="truncate text-[9px] font-bold leading-tight text-emerald-800">
                          {cc.mandatory}
                        </p>
                      ) : null}
                      <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-slate-600">
                        {cc.extrasPricePerDay}:{" "}
                        {forbidden || off ? (
                          <span className="font-bold text-slate-400">—</span>
                        ) : isFree ? (
                          <span className="font-bold text-emerald-800">{cc.free}</span>
                        ) : (
                          <span className="font-bold text-[#0b1f4b]">
                            {Number(row?.priceEur || 0).toFixed(2)}
                            {moneySymbol}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {mandatory ? (
                        <span className="rounded border border-emerald-500 bg-emerald-600 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                          {cc.mandatory}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setOffer("on")}
                            className={cn(
                              "rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                              enabled && !forbidden
                                ? "border-[#28a745] bg-[#28a745] text-white"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
                            )}
                          >
                            {cc.enabled}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOffer("forbidden")}
                            className={cn(
                              "rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                              forbidden
                                ? "border-red-500 bg-red-600 text-white"
                                : "border-red-200 text-red-600 hover:bg-red-50",
                            )}
                          >
                            {cc.forbidden}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOffer("off")}
                            className={cn(
                              "rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                              off
                                ? "border-slate-600 bg-slate-600 text-white"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            {cc.disabled}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="specs"
          title={cc.sections.specs}
          invalid={
            fieldInvalid("engineVolume") ||
            fieldInvalid("consumption") ||
            fieldInvalid("drive")
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{cc.general}</p>
              <Field label={cc.seats}>
                <select className={inputClass} value={seats} onChange={(e) => setSeats(e.target.value)}>
                  {[2, 4, 5, 6, 7, 8, 9].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={cc.doors}>
                <select className={inputClass} value={doors} onChange={(e) => setDoors(e.target.value)}>
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={cc.airConditioning}>
                <select className={inputClass} value={ac} onChange={(e) => setAc(e.target.value)}>
                  {["Air Conditioning", "Climate Control", "None"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={cc.interior}>
                <select className={inputClass} value={interior} onChange={(e) => setInterior(e.target.value)}>
                  {["Fabric", "Leather", "Combined"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={cc.poweredWindows}>
                <select className={inputClass} value={windows} onChange={(e) => setWindows(e.target.value)}>
                  {["none", "front", "all"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={cc.airbags}>
                <select className={inputClass} value={airbags} onChange={(e) => setAirbags(e.target.value)}>
                  {["0", "2", "4", "6", "8+"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label={cc.steeringSide}>
                <select className={inputClass} value={steering} onChange={(e) => setSteering(e.target.value)}>
                  {["left", "right"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <div className="space-y-0.5 pt-0.5">
                {[
                  [cc.cruiseControl, cruise, setCruise],
                  [cc.rearViewCamera, rearCam, setRearCam],
                  [cc.parkingAssist, parkingAssist, setParkingAssist],
                ].map(([label, val, setVal]) => (
                  <label key={label as string} className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={val as boolean}
                      onChange={(e) => (setVal as (v: boolean) => void)(e.target.checked)}
                    />
                    {label as string}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{cc.engine}</p>
              <Field label={cc.fuel} required>
                <select className={inputClass} value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  {["PETROL", "DIESEL", "HYBRID", "ELECTRIC", "LPG"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={cc.engineVolume} required invalid={fieldInvalid("engineVolume")}>
                <input className={inputClass} value={engineVolume} onChange={(e) => setEngineVolume(e.target.value)} />
              </Field>
              <Field label={cc.fuelConsumption} required invalid={fieldInvalid("consumption")}>
                <input className={inputClass} value={consumption} onChange={(e) => setConsumption(e.target.value)} />
              </Field>
              <p className="pt-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{cc.chassis}</p>
              <Field label={cc.transmission} required>
                <select className={inputClass} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="AUTOMATIC">{cc.automatic}</option>
                  <option value="MANUAL">{cc.manual}</option>
                </select>
              </Field>
              <Field label={cc.drive} required invalid={fieldInvalid("drive")}>
                <select className={inputClass} value={drive} onChange={(e) => setDrive(e.target.value)}>
                  <option value="">{common.select}</option>
                  <option value="4x4">4x4</option>
                  <option value="2WD">2WD</option>
                </select>
              </Field>
              <div className="space-y-0.5 pt-0.5">
                {[
                  ["ABS", abs, setAbs],
                  ["EBD", ebd, setEbd],
                  ["ESP", esp, setEsp],
                ].map(([label, val, setVal]) => (
                  <label key={label as string} className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={val as boolean}
                      onChange={(e) => (setVal as (v: boolean) => void)(e.target.checked)}
                    />
                    {label as string}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="music" title={cc.sections.music}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MUSIC_OPTIONS.map((item) => (
              <label key={item} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <input type="checkbox" checked={music.includes(item)} onChange={() => toggleMusic(item)} />
                {item}
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          id="photo"
          title={cc.sections.photo}
          invalid={fieldInvalid("photos")}
          changed={isChanged("photos")}
        >
          <PartnerCarPhotoGallery
            photos={photos}
            onChange={setPhotos}
            uploading={uploading}
            onUploadFiles={onGalleryFiles}
            invalid={fieldInvalid("photos")}
            accentColor={ACCENT_GREEN}
            labels={{
              upload: cc.selectFiles,
              uploading: cc.uploading,
              remove: cc.removeFile,
              cover: cc.cover,
              coverHint: cc.coverHint,
              formats: cc.photoFormats.replace("{n}", String(MIN_PUBLIC_PHOTOS)),
            }}
          />
        </SectionCard>

        <SectionCard
          id="certificate"
          title={cc.sections.certificate}
          invalid={
            fieldInvalid("passport") ||
            fieldInvalid("passport-front") ||
            fieldInvalid("passport-back") ||
            fieldInvalid("insurance-file")
          }
          changed={
            isChanged("passport") ||
            isChanged("insurance") ||
            isChanged("insuranceExpiresAt") ||
            insuranceExpiredReview
          }
        >
          <p className="mb-1.5 text-xs text-slate-500">{cc.certPrivate}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div
              className={cn(
                "rounded-lg border bg-slate-50 p-3 text-center text-xs",
                fieldInvalid("passport-front") && "border-red-500 bg-red-50 ring-2 ring-red-200",
              )}
            >
              <p className="mb-0.5 text-[11px] font-semibold">{cc.front}</p>
              {passportFront ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={passportFront}
                    alt=""
                    className="mx-auto h-28 cursor-zoom-in rounded object-contain"
                    onClick={() => setDocPreview(passportFront)}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => passportFrontRef.current?.click()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-60"
                      style={{ backgroundColor: ACCENT_GREEN }}
                      title={cc.selectFront}
                    >
                      <UploadCloud className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassportFront("")}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700"
                    >
                      {cc.removeFile}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400">{cc.notUploaded}</p>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => passportFrontRef.current?.click()}
                    className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-60"
                    style={{ backgroundColor: ACCENT_GREEN }}
                    title={cc.selectFront}
                  >
                    <UploadCloud className="h-4 w-4" />
                  </button>
                </>
              )}
              <input
                ref={passportFrontRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => void onPassportSide("front", e.target.files)}
              />
            </div>
            <div
              className={cn(
                "rounded-lg border bg-slate-50 p-3 text-center text-xs",
                fieldInvalid("passport-back") && "border-red-500 bg-red-50 ring-2 ring-red-200",
              )}
            >
              <p className="mb-0.5 text-[11px] font-semibold">{cc.back}</p>
              {passportBack ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={passportBack}
                    alt=""
                    className="mx-auto h-28 cursor-zoom-in rounded object-contain"
                    onClick={() => setDocPreview(passportBack)}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => passportBackRef.current?.click()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-60"
                      style={{ backgroundColor: ACCENT_GREEN }}
                      title={cc.selectBack}
                    >
                      <UploadCloud className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPassportBack("")}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700"
                    >
                      {cc.removeFile}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-400">{cc.notUploaded}</p>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => passportBackRef.current?.click()}
                    className="mt-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-60"
                    style={{ backgroundColor: ACCENT_GREEN }}
                    title={cc.selectBack}
                  >
                    <UploadCloud className="h-4 w-4" />
                  </button>
                </>
              )}
              <input
                ref={passportBackRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => void onPassportSide("back", e.target.files)}
              />
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-semibold text-slate-800">
              {cc.insuranceUploadTitle}
              <span className="text-[#e11d48]"> *</span>
            </p>
            <div
              className={cn(
                "flex min-h-[80px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-slate-50 px-3 py-3 text-center",
                fieldInvalid("insurance-file")
                  ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                  : "border-slate-300",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onInsuranceFiles(e.dataTransfer.files);
              }}
            >
              {insuranceUrl ? (
                <>
                  {isPdfUrl(insuranceUrl) ? (
                    <a
                      href={insuranceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline"
                    >
                      <FileText className="h-8 w-8 text-slate-400" />
                      <span>
                        {cc.insurancePdfLabel}: {insuranceFileName(insuranceUrl)}
                      </span>
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={insuranceUrl}
                      alt=""
                      className="mx-auto h-28 cursor-zoom-in rounded object-contain"
                      onClick={() => setDocPreview(insuranceUrl)}
                    />
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => insuranceRef.current?.click()}
                      className="rounded px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                      style={{ backgroundColor: ACCENT_GREEN }}
                    >
                      {uploading ? cc.uploading : cc.selectFiles}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsuranceUrl("")}
                      className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700"
                    >
                      {cc.removeFile}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="mb-1.5 h-6 w-6 text-slate-400" />
                  <p className="text-xs text-slate-600">{cc.dragCert}</p>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => insuranceRef.current?.click()}
                    className="mt-1 rounded px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                    style={{ backgroundColor: ACCENT_GREEN }}
                  >
                    {uploading ? cc.uploading : cc.selectFiles}
                  </button>
                </>
              )}
              <p className="mt-2 text-xs text-slate-500">{cc.certFormats}</p>
              <input
                ref={insuranceRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,.pdf"
                className="hidden"
                onChange={(e) => void onInsuranceFiles(e.target.files)}
              />
            </div>
            <div className="mt-3">
              <label
                className={cn(
                  "mb-1 block text-[11px] font-semibold",
                  insuranceExpiredReview || isChanged("insuranceExpiresAt")
                    ? "text-red-700"
                    : "text-slate-800",
                )}
              >
                {cc.insuranceExpiresAtLabel}
                <span className="text-[#e11d48]"> *</span>
                {insuranceExpiredReview ? (
                  <span className="ms-1 font-extrabold">· {insuranceExpiryReasonLabel(locale)}</span>
                ) : null}
              </label>
              <DateInput
                type="date"
                value={insuranceExpiresAt}
                disabled={isAdminReview}
                onChange={(e) => setInsuranceExpiresAt(e.target.value)}
                className={cn(
                  "w-full max-w-xs rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200",
                  fieldInvalid("insurance-expires") || insuranceExpiredReview || isChanged("insuranceExpiresAt")
                    ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                    : "border-slate-300",
                )}
              />
              <p className="mt-1 text-[11px] leading-snug text-slate-500">{cc.insuranceExpiresAtHelp}</p>
            </div>
          </div>
        </SectionCard>
        </div>
      </div>

      <footer
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6 lg:px-8",
          isAdminReview && "pointer-events-auto",
        )}
        style={{
          backgroundColor: awaitingAdminModeration ? HEADER_BAND_ALERT : HEADER_BAND,
          borderColor: awaitingAdminModeration ? HEADER_BORDER_ALERT : HEADER_BORDER,
          color: awaitingAdminModeration ? HEADER_TEXT_ALERT : HEADER_TEXT,
        }}
      >
        <div className={cn("mx-auto w-full", CONTENT_MAX)}>
          {error ? (
            <div className="mb-2 rounded-md bg-red-500/95 px-3 py-2 text-sm font-semibold text-white">{error}</div>
          ) : null}
          {adminMessage ? (
            <div className="mb-2 rounded-md bg-emerald-600/95 px-3 py-2 text-sm font-semibold text-white">
              {adminMessage}
            </div>
          ) : null}
          {isAdminReview && adminReview ? (
            <div className="space-y-2">
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm"
                placeholder={
                  locale === "ka"
                    ? "კომენტარი პარტნიორისთვის (უარყოფისას სავალდებულო)…"
                    : "Comment for partner (required when rejecting)…"
                }
              />
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => void runAdminAction("APPROVED")}
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-60 sm:px-4"
                >
                  {locale === "ka" ? "თანხმობა" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={adminBusy}
                  onClick={() => setRejectModalOpen(true)}
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-60 sm:px-4"
                >
                  {locale === "ka" ? "უარყოფა" : "Reject"}
                </button>
                <Link
                  href={adminReview.backHref}
                  className="inline-flex min-h-10 items-center justify-center min-w-0 break-words rounded-md border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-bold text-slate-700 sm:px-4"
                >
                  {adminReview.backLabel}
                </Link>
              </div>
            </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            {isEdit ? (
              <>
                <button
                  type="button"
                  disabled={loading || uploading || booting || deleting}
                  onClick={() => void save("update")}
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                  style={{ backgroundColor: ACCENT_GREEN }}
                >
                  <Check className="h-3.5 w-3.5" />
                  {loading ? common.saving : cc.update}
                </button>
                <button
                  type="button"
                  disabled={loading || uploading || booting || deleting}
                  onClick={() => void deleteListing()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-4 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? common.saving : common.delete}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading || uploading}
                  onClick={() => void save("sales")}
                  className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-60"
                  style={{ backgroundColor: ACCENT_GREEN }}
                >
                  <Check className="h-3.5 w-3.5" />
                  {loading ? common.saving : cc.saveSales}
                </button>
                <button
                  type="button"
                  disabled={loading || uploading}
                  onClick={() => void save("internal")}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-white/70 px-4 py-1.5 text-xs font-bold hover:bg-white disabled:opacity-60"
                  style={{ borderColor: HEADER_BORDER, color: HEADER_TEXT }}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {loading ? common.saving : cc.saveInternal}
                </button>
              </>
            )}
          </div>
          )}
        </div>
      </footer>

      {isAdminReview && rejectModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-extrabold text-[#0b1f4b]">
              {locale === "ka" ? "უარყოფის მიზეზი" : "Rejection reason"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {locale === "ka"
                ? "მიუთითეთ, რის გამო არ მოხდა განახლება. შეტყობინება გაეგზავნება პარტნიორს."
                : "Explain why the update was denied. The partner will see this message."}
            </p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              autoFocus
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={adminBusy || !adminNote.trim()}
                onClick={() => void runAdminAction("REJECTED")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {locale === "ka" ? "გაგზავნა და უარყოფა" : "Send & reject"}
              </button>
              <button
                type="button"
                disabled={adminBusy}
                onClick={() => setRejectModalOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                {common.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {serverCaps ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold">{cc.deliveryAdjusted}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {serverCaps.map((a) => (
                <li key={`${a.label}-${a.requested}`}>
                  <strong>{a.label}</strong>: {fromEurLabel(a.requested)} → {fromEurLabel(a.saved)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-sky-600 py-2.5 font-bold text-white"
              onClick={() => router.push(PARTNER_BASE)}
            >
              {cc.continue}
            </button>
          </div>
        </div>
      ) : null}

      <PartnerImageLightbox src={docPreview} onClose={() => setDocPreview(null)} />
    </div>
  );
}
