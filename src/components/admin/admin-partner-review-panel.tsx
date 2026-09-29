"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { PhoneMessengerIcons } from "@/components/partner/phone-messenger-icons";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  locationCodesEqual,
  normalizeLocationCode,
  searchPlacesForCountry,
} from "@/lib/catalog/search-places";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { PARTNER_SOCIAL_PLATFORMS, type PartnerSocialPlatform } from "@/lib/partner";
import {
  defaultCompanySettings,
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { ADMIN_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { ListingModerationActions } from "@/components/admin/listing-moderation-actions";

type CatalogLocation = {
  id: string;
  iata: string;
  airportId?: string;
  label: string;
  countryIso2: string;
};

type LocationOption = {
  id: string;
  label: string;
  countryIso2: string;
  iata: string;
};

function locationMatchesId(loc: CatalogLocation, id: string) {
  if (loc.id === id) return true;
  if (locationCodesEqual(loc.iata || "", id)) return true;
  if (locationCodesEqual(loc.airportId || "", id)) return true;
  return false;
}

function formatLocationChangeValue(raw: string | undefined, catalog: CatalogLocation[]): string {
  if (!raw || raw === "—") return raw || "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return raw;
  return ids
    .map((id) => {
      const hit = catalog.find((l) => locationMatchesId(l, id));
      if (hit?.label) return hit.label;
      return id.length > 12 && id.includes("-") ? `${id.slice(0, 8)}...` : id;
    })
    .join(", ");
}

function selectedLocationsForCountry(
  iso2: string,
  selectedIds: string[],
  catalog: CatalogLocation[],
): Array<{ id: string; label: string }> {
  const want = iso2.toUpperCase();
  const places = searchPlacesForCountry(want);
  const out: Array<{ id: string; label: string }> = [];
  const seen = new Set<string>();

  for (const place of places) {
    const existing = catalog.find(
      (loc) =>
        loc.countryIso2.toUpperCase() === want &&
        (locationCodesEqual(loc.iata || "", place.code) ||
          locationCodesEqual(loc.airportId || "", place.code)),
    );
    const option: CatalogLocation = existing || {
      id: place.code,
      iata: place.code,
      label: place.label,
      countryIso2: want,
    };
    const selected = selectedIds.some((id) => locationMatchesId(option, id));
    if (!selected) continue;
    const key = normalizeLocationCode(option.iata || option.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: option.id, label: option.label });
  }

  for (const id of selectedIds) {
    const known = catalog.find((loc) => locationMatchesId(loc, id));
    if (!known || known.countryIso2.toUpperCase() !== want) continue;
    const key = normalizeLocationCode(known.iata || known.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: known.id, label: known.label || known.id });
  }

  return out;
}

function locationsForCountry(iso2: string, catalog: CatalogLocation[]): LocationOption[] {
  const want = iso2.toUpperCase();
  const places = searchPlacesForCountry(want);
  return places.map((place) => {
    const existing = catalog.find(
      (loc) =>
        loc.countryIso2.toUpperCase() === want &&
        (locationCodesEqual(loc.iata || "", place.code) ||
          locationCodesEqual(loc.airportId || "", place.code)),
    );
    return {
      id: existing?.id || place.code,
      label: place.label,
      countryIso2: want,
      iata: place.code,
    };
  });
}

function isLocationSelected(
  loc: LocationOption,
  selected: string[],
  catalog: CatalogLocation[],
) {
  if (selected.includes(loc.id)) return true;
  const code = normalizeLocationCode(loc.iata);
  return selected.some((id) => {
    if (locationCodesEqual(id, code)) return true;
    const known = catalog.find((l) => l.id === id);
    return known ? locationCodesEqual(known.iata || known.airportId || "", code) : false;
  });
}

function MessengerReadOnly({ selected }: { selected: PartnerSocialPlatform[] }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {PARTNER_SOCIAL_PLATFORMS.map((platform) => {
        const active = selected.includes(platform.value);
        const color =
          platform.value === "WHATSAPP"
            ? "bg-[#25D366] text-white"
            : platform.value === "VIBER"
              ? "bg-[#7360F2] text-white"
              : "bg-[#2AABEE] text-white";
        return (
          <span
            key={platform.value}
            title={platform.label}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md text-[10px] font-bold",
              color,
              active ? "ring-2 ring-offset-1 ring-slate-900 opacity-100" : "opacity-35",
            )}
          >
            {platform.value === "WHATSAPP" ? "WA" : platform.value === "VIBER" ? "VB" : "TG"}
          </span>
        );
      })}
    </div>
  );
}

type Change = { field: string; from: string; to: string };
type PendingBatch = {
  id: string;
  at: string;
  summary: string;
  changes: Change[];
};

type CarRow = {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  status: string;
  photoUrl?: string | null;
  country?: string;
  bodyType?: string;
};

type Detail = {
  id: string;
  displayName: string;
  status: string;
  statusLabel?: string;
  partnerCode?: string | null;
  companyName?: string;
  email: string;
  phone: string;
  secondaryPhone?: string | null;
  personalId?: string;
  kind?: string;
  fleetSize?: number;
  logoUrl?: string | null;
  pendingProfileChanges?: PendingBatch[];
  countries?: Array<{ iso2: string; name: string }>;
  cars?: CarRow[];
  companySettings?: PartnerCompanySettings | null;
  loginEmail?: string;
  portalPassword?: string;
  hasUser?: boolean;
  banWarning?: string | null;
  ban?: {
    email?: string;
    phoneDisplay?: string;
    extraEmails?: string[];
    plates?: string[];
    notes?: string;
  } | null;
};

const inputClass =
  "w-full rounded-md border border-[#c5ced8] bg-white px-3 py-2.5 text-sm font-semibold text-[#1f2937] outline-none focus:border-slate-500";
const inputChangedClass = "border-red-500 bg-red-50 text-red-950";

function NestedWindow({
  title,
  changed,
  children,
  active,
  onSelect,
}: {
  title: string;
  changed?: boolean;
  children?: React.ReactNode;
  active?: boolean;
  onSelect?: () => void;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-white shadow-sm",
        changed ? "border-red-400 ring-2 ring-red-200" : "border-[#d5dde6]",
        active === false && "opacity-70",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between border-b px-5 py-3.5 text-[15px] font-bold tracking-wide",
          changed ? "border-red-200 bg-red-50 text-red-900" : "border-[#cfd8e3] bg-[#d9e2e8] text-[#2a3340]",
          onSelect && "cursor-pointer hover:brightness-[0.98]",
        )}
        onClick={onSelect}
        onKeyDown={
          onSelect
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect();
                }
              }
            : undefined
        }
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
      >
        <span>{title}</span>
        {changed ? <span className="text-[11px] font-extrabold uppercase tracking-wide">შეცვლილია</span> : null}
      </header>
      {children ? <div className="bg-[#fbfcfd] px-5 py-5 sm:px-7 sm:py-6">{children}</div> : null}
    </section>
  );
}

function ReadField({
  label,
  value,
  changed,
  previous,
  required,
}: {
  label: string;
  value: React.ReactNode;
  changed?: boolean;
  previous?: string;
  required?: boolean;
}) {
  return (
    <div className="block text-sm">
      <span className={cn("mb-1.5 block font-semibold", changed ? "text-red-700" : "text-[#3a4553]")}>
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      <div
        className={cn(
          "w-full rounded-md border px-3 py-2.5 text-sm font-semibold",
          changed ? "border-red-500 bg-red-50 text-red-950" : "border-[#c5ced8] bg-white text-[#1f2937]",
        )}
      >
        {value || "—"}
      </div>
      {changed && previous ? (
        <p className="mt-1 text-xs font-semibold text-red-700">
          იყო: <span className="line-through">{previous}</span>
        </p>
      ) : null}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  changed,
  previous,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  changed?: boolean;
  previous?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className={cn("mb-1.5 block font-semibold", changed ? "text-red-700" : "text-[#3a4553]")}>
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, changed && inputChangedClass)}
      />
      {changed && previous ? (
        <p className="mt-1 text-xs font-semibold text-red-700">
          იყო: <span className="line-through">{previous}</span>
        </p>
      ) : null}
    </label>
  );
}

function resolveSettingsFromDetail(detail: Detail | null): PartnerCompanySettings {
  if (!detail) {
    return defaultCompanySettings({ companyName: "", email: "", phone: "" });
  }
  if (detail.companySettings) {
    return parseCompanySettings(detail.companySettings, {
      companyName: detail.companyName || detail.displayName,
      email: detail.email,
      phone: detail.phone,
    });
  }
  return {
    ...defaultCompanySettings({
      companyName: detail.companyName || detail.displayName || "",
      email: detail.email || "",
      phone: detail.phone || "",
      secondaryPhone: detail.secondaryPhone || "",
      deliveryCountryIso2s: (detail.countries || []).map((c) => c.iso2),
    }),
    logoUrl: detail.logoUrl || "",
  };
}

export function AdminPartnerReviewPanel({
  partnerId,
  backHref,
  backLabel,
  editable = false,
  onBack,
}: {
  partnerId: string;
  backHref?: string;
  backLabel?: string;
  editable?: boolean;
  /** When set, back control closes this panel in-place instead of navigating. */
  onBack?: () => void;
}) {
  const router = useRouter();
  const { locale } = useAdminLocale();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState<PartnerCompanySettings | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"main" | "cars">("main");
  const [catalogLocations, setCatalogLocations] = useState<CatalogLocation[]>([]);
  const [addCountryIso2, setAddCountryIso2] = useState("");

  const labels = useMemo(() => {
    if (locale === "ka") {
      return {
        back: "← მოდერაცია",
        title: "პარტნიორის დეტალები",
        mainInfo: "ძირითადი ინფო",
        cars: "მანქანების ჩამონათვალი",
        brandName: "საფირმო სახელი",
        legalName: "იურიდიული სახელი",
        country: "ქვეყანა",
        centralOffice: "ცენტრალური ოფისის მდებარეობა",
        address: "ცენტრალური ოფისის მისამართი",
        languages: "კლიენტთან კომუნიკაციისთვის ხელმისაწვდომი ენები",
        deliveryCountries: "ოპერირების ქვეყნები",
        selectCountry: "აირჩიეთ ქვეყანა",
        selectLocation: "აირჩიეთ ლოკაცია",
        noLocations: "ლოკაციები არ არის",
        noCountries: "ოპერირების ქვეყანა არ არის მითითებული",
        addCountry: "დამატება",
        remove: "წაშლა",
        was: "იყო",
        primaryPhone: "ძირითადი მობილური ტელეფონის ნომერი",
        secondaryPhone: "მეორე ტელეფონი",
        email: "ელ. ფოსტა",
        website: "ვებსაიტი",
        logo: "ლოგო",
        upload: "ატვირთვა",
        replace: "შეცვლა",
        deleteLogo: "წაშლა",
        credentials: "შესვლის მონაცემები",
        login: "ლოგინი (ელ. ფოსტა)",
        password: "პაროლი",
        save: "შენახვა",
        agree: "თანხმობა",
        rejectBtn: "უარყოფა",
        close: "დახურვა",
        goBack: "უკან დაბრუნება",
        rejectedBadge: "უარყოფილი",
        primaryTitle: "პირველადი პარტნიორის დეტალები",
        noCars: "ამ პარტნიორს ჯერ არ აქვს ატვირთული მანქანა.",
        approve: "რემოდერაციის დამტკიცება",
        finalApprove: "საბოლოო დამტკიცება",
        reject: "უარყოფა",
        invite: "თანხმობა",
        note: "ადმინის შენიშვნა (არასავალდებულო)",
        loading: "იტვირთება…",
        notFound: "პარტნიორი ვერ მოიძებნა",
        saved: "პარტნიორის პარამეტრები შენახულია",
      };
    }
    if (locale === "ru") {
      return {
        back: "← Модерация",
        title: "Детали партнёра",
        mainInfo: "Основная инфо",
        cars: "Список автомобилей",
        brandName: "Фирменное название",
        legalName: "Юридическое название",
        country: "Страна",
        centralOffice: "Центральный офис",
        address: "Адрес центрального офиса",
        languages: "Языки общения с клиентами",
        deliveryCountries: "Страны операций",
        selectCountry: "Выберите страну",
        selectLocation: "Выберите локацию",
        noLocations: "Локации отсутствуют",
        noCountries: "Страны операций не указаны",
        addCountry: "Добавить",
        remove: "Удалить",
        was: "было",
        primaryPhone: "Основной мобильный",
        secondaryPhone: "Второй телефон",
        email: "Эл. почта",
        website: "Сайт",
        logo: "Логотип",
        upload: "Загрузить",
        replace: "Заменить",
        deleteLogo: "Удалить",
        credentials: "Данные входа",
        login: "Логин (эл. почта)",
        password: "Пароль",
        save: "Сохранить",
        agree: "Согласие",
        rejectBtn: "Отклонить",
        close: "Закрыть",
        goBack: "Назад",
        rejectedBadge: "Отклонён",
        primaryTitle: "Детали первичного партнёра",
        noCars: "У партнёра пока нет загруженных автомобилей.",
        approve: "Одобрить ремодерацию",
        finalApprove: "Финальное одобрение",
        reject: "Отклонить",
        invite: "Согласие",
        note: "Заметка админа (необязательно)",
        loading: "Загрузка…",
        notFound: "Партнёр не найден",
        saved: "Настройки партнёра сохранены",
      };
    }
    return {
      back: "← Moderation",
      title: "Partner details",
      mainInfo: "Basic info",
      cars: "Uploaded cars",
      brandName: "Brand name",
      legalName: "Legal name",
      country: "Country",
      centralOffice: "Central office location",
      address: "Central office address",
      languages: "Languages available for client communication",
      deliveryCountries: "Operating countries",
      selectCountry: "Select country",
      selectLocation: "Select location",
      noLocations: "No locations",
      noCountries: "No operating countries set",
      addCountry: "Add",
      remove: "Remove",
      was: "was",
      primaryPhone: "Primary mobile phone",
      secondaryPhone: "Secondary phone",
      email: "Email",
      website: "Website",
      logo: "Logo",
      upload: "Upload",
      replace: "Replace",
      deleteLogo: "Delete",
      credentials: "Login credentials",
      login: "Login (email)",
      password: "Password",
      save: "Save",
      noCars: "This partner has not uploaded any cars yet.",
      approve: "Approve remoderation",
      finalApprove: "Final approve",
      reject: "Reject",
      invite: "Approve",
      agree: "Approve",
      rejectBtn: "Reject",
      close: "Close",
      goBack: "Go back",
      rejectedBadge: "Rejected",
      primaryTitle: "Primary partner details",
      note: "Admin note (optional)",
      loading: "Loading…",
      notFound: "Partner not found",
      saved: "Partner settings saved",
    };
  }, [locale]);

  const resolvedBackHref = backHref ?? `${ADMIN_BASE}/moderation`;
  const resolvedBackLabel = backLabel ?? labels.back;

  const handleBack = () => {
    if (onBack) onBack();
    else router.push(resolvedBackHref);
  };

  const applyDetail = (data: Detail) => {
    setDetail(data);
    setDraft(resolveSettingsFromDetail(data));
    setLoginEmail(data.loginEmail || "");
    setPortalPassword(data.portalPassword || "");
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      applyDetail(data as Detail);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load");
      setDetail(null);
      setDraft(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/delivery", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const rows = Array.isArray(data.locations) ? data.locations : [];
        setCatalogLocations(
          rows.map((row: Partial<CatalogLocation>) => ({
            id: String(row.id || ""),
            iata: String(row.iata || row.airportId || ""),
            airportId: String(row.airportId || ""),
            label: String(row.label || row.iata || row.id || ""),
            countryIso2: String(row.countryIso2 || "").toUpperCase(),
          })),
        );
      } catch {
        /* catalog optional for labels */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changedFields = useMemo(() => {
    const map = new Map<string, Change>();
    for (const batch of detail?.pendingProfileChanges || []) {
      for (const ch of batch.changes || []) {
        map.set(ch.field, ch);
      }
    }
    return map;
  }, [detail]);

  const settings: PartnerCompanySettings = draft ?? resolveSettingsFromDetail(detail);

  const patchDraft = (partial: Partial<PartnerCompanySettings>) => {
    setDraft((prev) => ({ ...(prev ?? resolveSettingsFromDetail(detail)), ...partial }));
  };

  const mainChanged = useMemo(() => {
    const keys = [
      "title",
      "legalName",
      "address",
      "logoUrl",
      "email",
      "primaryPhone",
      "secondaryPhone",
      "website",
      "clientLanguages",
      "deliveryCountryIso2s",
      "deliveryLocationIds",
      "primaryMessengers",
      "secondaryMessengers",
      "country",
      "centralOffice",
    ];
    return keys.some((k) => changedFields.has(k));
  }, [changedFields]);

  const countryOptions = useMemo(
    () =>
      WORLD_COUNTRIES.filter((c) => searchPlacesForCountry(c.iso2).length > 0)
        .map((c) => ({
          iso2: c.iso2.toUpperCase(),
          name: c.name || worldCountryName(c.iso2),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [],
  );

  const toggleClientLanguage = (code: string) => {
    const list = settings.clientLanguages ?? [];
    const next = list.includes(code) ? list.filter((x) => x !== code) : [...list, code];
    patchDraft({ clientLanguages: next.length ? next : [code] });
  };

  const toggleDeliveryLocation = (locationId: string, countryIso2: string) => {
    const list = settings.deliveryLocationIds ?? [];
    const locs = locationsForCountry(countryIso2, catalogLocations);
    const target = locs.find((l) => l.id === locationId) || {
      id: locationId,
      iata: locationId,
      label: locationId,
      countryIso2,
    };
    const selected = isLocationSelected(target, list, catalogLocations);
    const next = selected
      ? list.filter((id) => {
          if (id === target.id) return false;
          if (locationCodesEqual(id, target.iata)) return false;
          const known = catalogLocations.find((l) => l.id === id);
          if (known && locationCodesEqual(known.iata || known.airportId || "", target.iata)) {
            return false;
          }
          return true;
        })
      : [...list, target.id];
    patchDraft({ deliveryLocationIds: next });
  };

  const addDeliveryCountry = (iso2: string) => {
    const want = iso2.toUpperCase();
    if (!want) return;
    const current = (settings.deliveryCountryIso2s || []).map((c) => c.toUpperCase());
    if (current.includes(want)) return;
    patchDraft({ deliveryCountryIso2s: [...current, want] });
    setAddCountryIso2("");
  };

  const removeDeliveryCountry = (iso2: string) => {
    const want = iso2.toUpperCase();
    const nextCountries = (settings.deliveryCountryIso2s || [])
      .map((c) => c.toUpperCase())
      .filter((c) => c !== want);
    const removedLocs = locationsForCountry(want, catalogLocations);
    const nextLocationIds = (settings.deliveryLocationIds || []).filter(
      (id) => !removedLocs.some((l) => isLocationSelected(l, [id], catalogLocations)),
    );
    patchDraft({ deliveryCountryIso2s: nextCountries, deliveryLocationIds: nextLocationIds });
  };

  const onLogoFile = async (file: File | undefined) => {
    if (!file || !editable) return;
    setLogoUploading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      patchDraft({ logoUrl: String(data.url || "") });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const saveSettings = async () => {
    if (!editable || !draft) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTINGS",
          settings: draft,
          loginEmail,
          portalPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage(data.message || labels.saved);
      router.refresh();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: string) => {
    setBusy(true);
    setMessage("");
    try {
      if (editable && draft && (action === "INVITE" || action === "FINAL_APPROVE" || action === "APPROVED")) {
        const saveRes = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_SETTINGS",
            settings: draft,
            loginEmail,
            portalPassword,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) throw new Error(saveData.error || "Save failed");
      }
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined, rejectionNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      setMessage(data.message || `Status → ${data.status}`);
      router.refresh();
      if (
        String(data.status) === "APPROVED" ||
        String(data.status) === "REJECTED" ||
        String(data.status) === "INVITED"
      ) {
        handleBack();
        return;
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="px-4 py-10 text-sm text-slate-500">{labels.loading}</p>;
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-red-700">{message || labels.notFound}</p>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-block text-sm font-bold text-sky-800 underline"
          >
            {resolvedBackLabel}
          </button>
        ) : (
          <Link href={resolvedBackHref} className="mt-4 inline-block text-sm font-bold text-sky-800 underline">
            {resolvedBackLabel}
          </Link>
        )}
      </div>
    );
  }

  const code = detail.partnerCode || detail.id;
  const ch = (field: string) => changedFields.get(field);
  const showCredentials = editable || Boolean(detail.loginEmail || detail.portalPassword);

  const status = detail.status;
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED" || status === "SUSPENDED";
  const pendingListings = (detail.cars || []).some(
    (car) => car.status === "PENDING" || car.status === "PENDING_REMODERATION",
  );
  const isPrimaryPartner =
    status === "PENDING" ||
    status === "INVITED" ||
    status === "PENDING_FINAL" ||
    status === "NEEDS_CORRECTION";
  const isAwaiting =
    isPrimaryPartner || status === "PENDING_REMODERATION";
  const canAgree =
    status === "PENDING" ||
    status === "INVITED" ||
    status === "PENDING_FINAL" ||
    status === "NEEDS_CORRECTION" ||
    status === "PENDING_REMODERATION";
  const agreeAction = status === "PENDING" ? "INVITE" : "FINAL_APPROVE";
  const pageTitle = isPrimaryPartner ? labels.primaryTitle : labels.title;
  const statusTheme = isRejected
    ? {
        bar: "bg-red-600",
        header: "border-red-300 bg-red-100",
        headerText: "text-red-950",
        navBorder: "border-red-300/60",
        tabActive: "bg-red-200/80 text-red-950",
        tabIdle: "text-red-900/70 hover:bg-red-50",
        badge: "bg-red-600 text-white",
        pageBg: "bg-red-50/40",
      }
    : isApproved
      ? {
          bar: "bg-[#28a745]",
          header: "border-[#8fbf9a] bg-[rgba(168,210,178,0.96)]",
          headerText: "text-[#143322]",
          navBorder: "border-[#8fbf9a]/50",
          tabActive: "bg-[rgba(40,167,69,0.18)] text-[#143322]",
          tabIdle: "text-[#143322]/70 hover:bg-black/5",
          badge: "bg-emerald-700 text-white",
          pageBg: "bg-[#eef2f7]",
        }
      : {
          bar: "bg-amber-400",
          header: "border-amber-300 bg-amber-100",
          headerText: "text-amber-950",
          navBorder: "border-amber-300/70",
          tabActive: "bg-amber-200/90 text-amber-950",
          tabIdle: "text-amber-900/70 hover:bg-amber-50",
          badge: "bg-amber-500 text-amber-950",
          pageBg: "bg-amber-50/30",
        };

  return (
    <div className={cn("relative isolate flex min-h-screen flex-col", statusTheme.pageBg)}>
      <div className={cn("h-1.5 w-full", statusTheme.bar)} aria-hidden />
      <header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-md",
          statusTheme.header,
        )}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 px-3 py-2 sm:px-5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={cn("rounded px-2 py-0.5 text-xs font-bold", statusTheme.headerText)}
              style={{ backgroundColor: "rgba(255,255,255,0.45)" }}
            >
              {resolvedBackLabel}
            </button>
          ) : (
            <Link
              href={resolvedBackHref}
              className={cn("rounded px-2 py-0.5 text-xs font-bold", statusTheme.headerText)}
              style={{ backgroundColor: "rgba(255,255,255,0.45)" }}
            >
              {resolvedBackLabel}
            </Link>
          )}
          <h1 className={cn("text-sm font-extrabold sm:text-base", statusTheme.headerText)}>
            {pageTitle}
            <span className="ms-2 font-mono text-xs font-bold opacity-80 sm:text-sm">{code}</span>
          </h1>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
              statusTheme.badge,
            )}
          >
            {isRejected ? labels.rejectedBadge : detail.statusLabel || detail.status}
          </span>
        </div>
        <nav
          className={cn(
            "mx-auto flex max-w-[1200px] gap-1 overflow-x-auto border-t px-3 py-1 sm:px-5",
            statusTheme.navBorder,
          )}
        >
          <button
            type="button"
            onClick={() => setTab("main")}
            className={cn(
              "shrink-0 rounded px-3 py-1.5 text-xs font-bold",
              tab === "main" ? statusTheme.tabActive + " underline decoration-2 underline-offset-2" : statusTheme.tabIdle,
              mainChanged && "text-red-800",
            )}
          >
            {labels.mainInfo}
          </button>
          <button
            type="button"
            onClick={() => setTab("cars")}
            className={cn(
              "shrink-0 rounded px-3 py-1.5 text-xs font-bold",
              tab === "cars" ? statusTheme.tabActive + " underline decoration-2 underline-offset-2" : statusTheme.tabIdle,
              pendingListings && "text-red-800",
            )}
          >
            {labels.cars}
            {(detail.cars?.length || 0) > 0 ? (
              <span className="ms-1 rounded-full bg-slate-700/80 px-1.5 py-0.5 text-[10px] text-white">
                {detail.cars?.length}
              </span>
            ) : null}
          </button>
        </nav>
      </header>

      {detail.banWarning ? (
        <div className="mx-auto mt-3 w-full max-w-[1200px] px-3 sm:px-5">
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950"
          >
            <p className="font-extrabold">დაბლოკილი კონტაქტი / მონაცემები</p>
            <p className="mt-1 leading-relaxed">{detail.banWarning}</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1200px] flex-1 space-y-5 px-3 py-5 pb-36 sm:px-5 lg:px-8">
        {message ? (
          <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
            {message}
          </p>
        ) : null}

        {tab === "main" ? (
          <NestedWindow title={labels.mainInfo} changed={mainChanged}>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div
                  className={cn(
                    "w-[120px] rounded-none border border-dashed bg-white p-2",
                    ch("logoUrl") ? "border-red-500 bg-red-50" : "border-slate-300",
                  )}
                >
                  <p className={cn("mb-1 text-xs font-semibold", ch("logoUrl") ? "text-red-700" : "text-[#3a4553]")}>
                    {labels.logo}
                  </p>
                  {settings.logoUrl || detail.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logoUrl || detail.logoUrl || ""}
                      alt=""
                      className="h-[96px] w-[96px] object-cover bg-slate-50"
                    />
                  ) : (
                    <div className="flex h-[96px] w-[96px] items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                      —
                    </div>
                  )}
                  {editable ? (
                    <div className="mt-2 flex flex-col gap-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void onLogoFile(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        disabled={logoUploading || busy}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 disabled:opacity-60"
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {logoUploading ? "…" : settings.logoUrl ? labels.replace : labels.upload}
                      </button>
                      {settings.logoUrl ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-800 disabled:opacity-60"
                          onClick={() => patchDraft({ logoUrl: "" })}
                        >
                          {labels.deleteLogo}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {ch("logoUrl") ? (
                    <p className="mt-1 text-[10px] font-semibold text-red-700">შეიცვალა</p>
                  ) : null}
                </div>

                {editable ? (
                  <EditField
                    label={labels.brandName}
                    required
                    value={settings.title || ""}
                    onChange={(title) => patchDraft({ title })}
                    changed={Boolean(ch("title"))}
                    previous={ch("title")?.from}
                  />
                ) : (
                  <ReadField
                    label={labels.brandName}
                    required
                    value={settings.title || detail.displayName}
                    changed={Boolean(ch("title"))}
                    previous={ch("title")?.from}
                  />
                )}
                {editable ? (
                  <EditField
                    label={labels.legalName}
                    required
                    value={settings.legalName || ""}
                    onChange={(legalName) => patchDraft({ legalName })}
                    changed={Boolean(ch("legalName"))}
                    previous={ch("legalName")?.from}
                  />
                ) : (
                  <ReadField
                    label={labels.legalName}
                    required
                    value={settings.legalName || detail.companyName}
                    changed={Boolean(ch("legalName"))}
                    previous={ch("legalName")?.from}
                  />
                )}
                {editable ? (
                  <EditField
                    label={labels.email}
                    required
                    type="email"
                    value={settings.email || ""}
                    onChange={(email) => patchDraft({ email })}
                    changed={Boolean(ch("email"))}
                    previous={ch("email")?.from}
                  />
                ) : (
                  <ReadField
                    label={labels.email}
                    required
                    value={settings.email || detail.email}
                    changed={Boolean(ch("email"))}
                    previous={ch("email")?.from}
                  />
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {editable ? (
                    <>
                      <EditField
                        label={labels.country}
                        required
                        value={settings.country || ""}
                        onChange={(country) => patchDraft({ country })}
                        changed={Boolean(ch("country"))}
                        previous={ch("country")?.from}
                      />
                      <EditField
                        label={labels.centralOffice}
                        required
                        value={settings.centralOffice || ""}
                        onChange={(centralOffice) => patchDraft({ centralOffice })}
                        changed={Boolean(ch("centralOffice"))}
                        previous={ch("centralOffice")?.from}
                      />
                    </>
                  ) : (
                    <>
                      <ReadField
                        label={labels.country}
                        required
                        value={settings.country || "—"}
                        changed={Boolean(ch("country"))}
                        previous={ch("country")?.from}
                      />
                      <ReadField
                        label={labels.centralOffice}
                        required
                        value={settings.centralOffice || "—"}
                        changed={Boolean(ch("centralOffice"))}
                        previous={ch("centralOffice")?.from}
                      />
                    </>
                  )}
                </div>
                {editable ? (
                  <EditField
                    label={labels.address}
                    required
                    value={settings.address || ""}
                    onChange={(address) => patchDraft({ address })}
                    changed={Boolean(ch("address"))}
                    previous={ch("address")?.from}
                  />
                ) : (
                  <ReadField
                    label={labels.address}
                    required
                    value={settings.address || "—"}
                    changed={Boolean(ch("address"))}
                    previous={ch("address")?.from}
                  />
                )}
                <div>
                  <p
                    className={cn(
                      "mb-1.5 text-sm font-semibold",
                      ch("clientLanguages") ? "text-red-700" : "text-[#3a4553]",
                    )}
                  >
                    {labels.languages} <span className="text-[#e11d48]">*</span>
                  </p>
                  <div
                    className={cn(
                      "flex flex-wrap gap-1.5 rounded-md p-1",
                      ch("clientLanguages") && "border border-red-400 bg-red-50",
                    )}
                  >
                    {editable
                      ? LOCALES.map((code) => {
                          const on = (settings.clientLanguages || []).includes(code);
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
                        })
                      : (settings.clientLanguages || []).length
                        ? (settings.clientLanguages || []).map((code) => (
                            <span
                              key={code}
                              className="rounded-md border border-emerald-600 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-900"
                            >
                              {LOCALE_LABELS[code as keyof typeof LOCALE_LABELS] || code}
                            </span>
                          ))
                        : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                  </div>
                  {ch("clientLanguages") ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      იყო: <span className="line-through">{ch("clientLanguages")?.from}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const countriesChanged = Boolean(ch("deliveryCountryIso2s"));
                  const locationsChanged = Boolean(ch("deliveryLocationIds"));
                  const sectionChanged = countriesChanged || locationsChanged;
                  const countryIso2s = (settings.deliveryCountryIso2s || []).map((c) => c.toUpperCase());
                  const selectedIds = settings.deliveryLocationIds || [];
                  return (
                    <div>
                      <p
                        className={cn(
                          "mb-1.5 text-sm font-semibold",
                          sectionChanged ? "text-red-700" : "text-[#3a4553]",
                        )}
                      >
                        {labels.deliveryCountries} <span className="text-[#e11d48]">*</span>
                      </p>
                      <div
                        className={cn(
                          "rounded-md",
                          sectionChanged && "border border-red-400 bg-red-50 p-2",
                        )}
                      >
                        {editable ? (
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <select
                              className={cn(inputClass, "min-w-[200px] flex-1")}
                              value={addCountryIso2}
                              onChange={(e) => setAddCountryIso2(e.target.value)}
                            >
                              <option value="">{labels.selectCountry}</option>
                              {countryOptions
                                .filter((c) => !countryIso2s.includes(c.iso2))
                                .map((c) => (
                                  <option key={c.iso2} value={c.iso2}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!addCountryIso2}
                              onClick={() => addDeliveryCountry(addCountryIso2)}
                              className="rounded-md bg-[#28a745] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-45"
                            >
                              {labels.addCountry}
                            </button>
                          </div>
                        ) : null}
                        {countryIso2s.length === 0 ? (
                          <p className="text-sm text-slate-400">{labels.noCountries}</p>
                        ) : (
                          <ul className="space-y-2">
                            {countryIso2s.map((iso2) => {
                              const editableLocs = locationsForCountry(iso2, catalogLocations);
                              const readLocs = selectedLocationsForCountry(
                                iso2,
                                selectedIds,
                                catalogLocations,
                              );
                              return (
                                <li
                                  key={iso2}
                                  className={cn(
                                    "rounded-md border bg-white px-3 py-2",
                                    sectionChanged ? "border-red-300" : "border-slate-200",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                      <CountryFlag iso2={iso2} />
                                      {worldCountryName(iso2)}
                                      <span className="text-xs font-medium text-slate-400">({iso2})</span>
                                    </div>
                                    {editable ? (
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-red-700"
                                        onClick={() => removeDeliveryCountry(iso2)}
                                      >
                                        {labels.remove}
                                      </button>
                                    ) : null}
                                  </div>
                                  {editable ? (
                                    <div className="mt-2 space-y-1.5">
                                      <select
                                        className={cn(inputClass, "text-xs")}
                                        disabled={editableLocs.length === 0}
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) toggleDeliveryLocation(e.target.value, iso2);
                                          e.target.value = "";
                                        }}
                                      >
                                        <option value="">
                                          {editableLocs.length
                                            ? labels.selectLocation
                                            : labels.noLocations}
                                        </option>
                                        {editableLocs
                                          .filter(
                                            (loc) =>
                                              !isLocationSelected(loc, selectedIds, catalogLocations),
                                          )
                                          .map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                              {loc.label}
                                            </option>
                                          ))}
                                      </select>
                                      <ul className="space-y-1">
                                        {editableLocs
                                          .filter((loc) =>
                                            isLocationSelected(loc, selectedIds, catalogLocations),
                                          )
                                          .map((loc) => (
                                            <li
                                              key={loc.id}
                                              className={cn(
                                                "flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs",
                                                locationsChanged
                                                  ? "border-red-200 bg-red-50/80"
                                                  : "border-slate-100 bg-slate-50",
                                              )}
                                            >
                                              <span className="font-semibold text-slate-800">{loc.label}</span>
                                              <button
                                                type="button"
                                                className="font-semibold text-red-700"
                                                onClick={() => toggleDeliveryLocation(loc.id, iso2)}
                                              >
                                                {labels.remove}
                                              </button>
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <ul className="mt-2 space-y-1">
                                      {readLocs.length === 0 ? (
                                        <li className="text-xs text-slate-400">{labels.noLocations}</li>
                                      ) : (
                                        readLocs.map((loc) => (
                                          <li
                                            key={loc.id}
                                            className={cn(
                                              "rounded border px-2 py-1.5 text-xs font-semibold text-slate-800",
                                              locationsChanged
                                                ? "border-red-200 bg-red-50/80"
                                                : "border-slate-100 bg-slate-50",
                                            )}
                                          >
                                            {loc.label}
                                          </li>
                                        ))
                                      )}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      {countriesChanged && ch("deliveryCountryIso2s")?.from ? (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {labels.was}:{" "}
                          <span className="line-through">{ch("deliveryCountryIso2s")?.from}</span>
                        </p>
                      ) : null}
                      {locationsChanged && ch("deliveryLocationIds")?.from ? (
                        <p className="mt-1 text-xs font-semibold text-red-700">
                          {labels.was}:{" "}
                          <span className="line-through">
                            {formatLocationChangeValue(
                              ch("deliveryLocationIds")?.from,
                              catalogLocations,
                            )}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  );
                })()}

                <div>
                  <p
                    className={cn(
                      "mb-1.5 text-sm font-semibold",
                      ch("primaryPhone") || ch("primaryMessengers") ? "text-red-700" : "text-[#3a4553]",
                    )}
                  >
                    {labels.primaryPhone} <span className="text-[#e11d48]">*</span>
                  </p>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2",
                      ch("primaryPhone") || ch("primaryMessengers")
                        ? "border-red-500 bg-red-50"
                        : "border-[#c5ced8] bg-white",
                    )}
                  >
                    {editable ? (
                      <input
                        className={cn(inputClass, "min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none")}
                        value={settings.primaryPhone || ""}
                        onChange={(e) => patchDraft({ primaryPhone: e.target.value })}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {settings.primaryPhone || detail.phone || "—"}
                      </span>
                    )}
                    {editable ? (
                      <PhoneMessengerIcons
                        selected={(settings.primaryMessengers || []) as PartnerSocialPlatform[]}
                        labels={{ WHATSAPP: "WhatsApp", TELEGRAM: "Telegram", VIBER: "Viber" }}
                        onChange={(primaryMessengers) => patchDraft({ primaryMessengers })}
                      />
                    ) : (
                      <MessengerReadOnly
                        selected={(settings.primaryMessengers || []) as PartnerSocialPlatform[]}
                      />
                    )}
                  </div>
                  {ch("primaryPhone") ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      იყო: <span className="line-through">{ch("primaryPhone")?.from}</span>
                    </p>
                  ) : null}
                </div>
                <div>
                  <p
                    className={cn(
                      "mb-1.5 text-sm font-semibold",
                      ch("secondaryPhone") || ch("secondaryMessengers") ? "text-red-700" : "text-[#3a4553]",
                    )}
                  >
                    {labels.secondaryPhone} <span className="text-[#e11d48]">*</span>
                  </p>
                  <div
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2",
                      ch("secondaryPhone") || ch("secondaryMessengers")
                        ? "border-red-500 bg-red-50"
                        : "border-[#c5ced8] bg-white",
                    )}
                  >
                    {editable ? (
                      <input
                        className={cn(inputClass, "min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none")}
                        value={settings.secondaryPhone || ""}
                        onChange={(e) => patchDraft({ secondaryPhone: e.target.value })}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {settings.secondaryPhone || detail.secondaryPhone || "—"}
                      </span>
                    )}
                    {editable ? (
                      <PhoneMessengerIcons
                        selected={(settings.secondaryMessengers || []) as PartnerSocialPlatform[]}
                        labels={{ WHATSAPP: "WhatsApp", TELEGRAM: "Telegram", VIBER: "Viber" }}
                        onChange={(secondaryMessengers) => patchDraft({ secondaryMessengers })}
                      />
                    ) : (
                      <MessengerReadOnly
                        selected={(settings.secondaryMessengers || []) as PartnerSocialPlatform[]}
                      />
                    )}
                  </div>
                  {ch("secondaryPhone") ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      იყო: <span className="line-through">{ch("secondaryPhone")?.from}</span>
                    </p>
                  ) : null}
                </div>
                {editable ? (
                  <EditField
                    label={labels.website}
                    value={settings.website || ""}
                    onChange={(website) => patchDraft({ website })}
                    changed={Boolean(ch("website"))}
                    previous={ch("website")?.from}
                  />
                ) : (
                  <ReadField
                    label={labels.website}
                    value={settings.website || "—"}
                    changed={Boolean(ch("website"))}
                    previous={ch("website")?.from}
                  />
                )}
                {showCredentials ? (
                  <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-[#3a4553]">{labels.credentials}</p>
                    {editable ? (
                      <>
                        <EditField
                          label={labels.login}
                          type="email"
                          value={loginEmail}
                          onChange={setLoginEmail}
                        />
                        <EditField
                          label={labels.password}
                          type="text"
                          value={portalPassword}
                          onChange={setPortalPassword}
                        />
                      </>
                    ) : (
                      <>
                        <ReadField label={labels.login} value={detail.loginEmail || "—"} />
                        <ReadField label={labels.password} value={detail.portalPassword || "—"} />
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </NestedWindow>
        ) : (
          <NestedWindow title={labels.cars} changed={pendingListings}>
            {(detail.cars || []).length === 0 ? (
              <p className="text-sm text-slate-500">{labels.noCars}</p>
            ) : (
              <div className="space-y-3">
                {(detail.cars || []).map((car) => {
                  const awaiting = car.status === "PENDING" || car.status === "PENDING_REMODERATION";
                  const approved = car.status === "APPROVED";
                  const rejected = car.status === "REJECTED";
                  return (
                    <article
                      key={car.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-xl border-2 p-3 shadow-sm sm:flex-row sm:items-center",
                        awaiting && "border-amber-400 bg-amber-50 ring-1 ring-amber-300/60",
                        approved && "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300/50",
                        rejected && "border-orange-400 bg-orange-50 ring-1 ring-orange-300/60",
                        !awaiting && !approved && !rejected && "border-slate-200 bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "h-16 w-24 shrink-0 overflow-hidden rounded-md bg-white ring-1",
                          awaiting && "ring-amber-300",
                          approved && "ring-emerald-300",
                          rejected && "ring-orange-300",
                          !awaiting && !approved && !rejected && "ring-slate-200",
                        )}
                      >
                        {car.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-[10px] font-extrabold uppercase tracking-wide",
                            awaiting && "text-amber-800",
                            approved && "text-emerald-800",
                            rejected && "text-orange-800",
                            !awaiting && !approved && !rejected && "text-slate-600",
                          )}
                        >
                          {car.status}
                        </p>
                        <p className="truncate text-base font-extrabold text-[#0b1f4b]">
                          {car.make} {car.model}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {car.year} · {car.country || "—"} · {car.bodyType || "—"}
                        </p>
                        {rejected ? (
                          <p className="mt-1 text-xs font-semibold text-orange-800">
                            {locale === "ka"
                              ? "გაეგზავნა პარტნიორს კორექტირებისთვის (ადმინის კომენტარით)"
                              : locale === "ru"
                                ? "Отправлено партнёру на исправление (с комментарием админа)"
                                : "Sent to partner for correction (with admin comment)"}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 sm:ms-auto">
                        <ListingModerationActions carId={car.id} onDone={() => void load()} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </NestedWindow>
        )}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          {(isAwaiting || isRejected) && !isApproved ? (
            <>
              <label className="block text-xs font-bold text-slate-500">{labels.note}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </>
          ) : null}
          <div className={cn("flex flex-wrap gap-2", isAwaiting || isRejected ? "mt-3" : "")}>
            {isPrimaryPartner || status === "PENDING_REMODERATION" ? (
              <>
                {canAgree ? (
                  <button
                    type="button"
                    disabled={busy || logoUploading}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-extrabold text-amber-950 disabled:opacity-60"
                    onClick={() => void runAction(agreeAction)}
                  >
                    {labels.agree}
                  </button>
                ) : null}
                {!isRejected ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm font-extrabold text-red-800 disabled:opacity-60"
                    onClick={() => void runAction("REJECT")}
                  >
                    {labels.rejectBtn}
                  </button>
                ) : null}
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {labels.goBack}
                  </button>
                ) : (
                  <Link
                    href={resolvedBackHref}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {labels.goBack}
                  </Link>
                )}
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    {labels.close}
                  </button>
                ) : (
                  <Link
                    href={resolvedBackHref}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    {labels.close}
                  </Link>
                )}
              </>
            ) : (
              <>
                {editable && isApproved ? (
                  <button
                    type="button"
                    disabled={busy || logoUploading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    onClick={() => void saveSettings()}
                  >
                    {labels.save}
                  </button>
                ) : null}
                {editable && !isApproved && !isRejected ? (
                  <button
                    type="button"
                    disabled={busy || logoUploading}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    onClick={() => void saveSettings()}
                  >
                    {labels.save}
                  </button>
                ) : null}
                {detail.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-extrabold text-amber-950 disabled:opacity-60"
                    onClick={() => void runAction("INVITE")}
                  >
                    {labels.agree}
                  </button>
                ) : null}
                {detail.status === "PENDING_FINAL" ||
                detail.status === "NEEDS_CORRECTION" ||
                detail.status === "PENDING_REMODERATION" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-extrabold text-amber-950 disabled:opacity-60"
                    onClick={() => void runAction("FINAL_APPROVE")}
                  >
                    {labels.agree}
                  </button>
                ) : null}
                {detail.status !== "REJECTED" && detail.status !== "APPROVED" && detail.status !== "SUSPENDED" ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-60"
                    onClick={() => void runAction("REJECT")}
                  >
                    {labels.rejectBtn}
                  </button>
                ) : null}
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {labels.goBack}
                  </button>
                ) : (
                  <Link
                    href={resolvedBackHref}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  >
                    {labels.goBack}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
