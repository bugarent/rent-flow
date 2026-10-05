"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { ResidenceCountrySelect } from "@/components/cars/residence-country-select";
import { PhoneMessengerIcons } from "@/components/partner/phone-messenger-icons";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";
import { splitStoredPhone } from "@/lib/catalog/dial-codes";
import { normalizeLocationCode, searchPlacesForCountry } from "@/lib/catalog/search-places";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { PARTNER_LOGIN } from "@/lib/routes";
import { PARTNER_SOCIAL_PLATFORMS, type PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "პარტნიორობის შეთავაზება",
      close: "დახურვა",
      brand: "საფირმო სახელი",
      firstName: "სახელი",
      lastName: "გვარი",
      email: "ელ. ფოსტა",
      country: "ქვეყანა",
      city: "ვინ ითხოვს პარტნიორობას",
      kindCompany: "კომპანია",
      kindPrivate: "კერძო პირი",
      selectKind: "აირჩიეთ",
      address: "ცენტრალური ოფისის მისამართი",
      languages: "კლიენტთან კომუნიკაციისთვის ხელმისაწვდომი ენები",
      countries: "ოპერირების ქვეყნები",
      selectCountry: "აირჩიეთ ქვეყანა",
      add: "დამატება",
      remove: "წაშლა",
      selectPlace: "აირჩიეთ ლოკაცია",
      noPlaces: "ლოკაციები არ არის",
      noCountries: "ოპერირების ქვეყანა არ არის მითითებული",
      primaryPhone: "ძირითადი მობილური ტელეფონის ნომერი",
      managerPhone: "მეორე ტელეფონი",
      website: "ვებსაიტი",
      credentials: "შესვლის მონაცემები",
      login: "ლოგინი (ელ. ფოსტა)",
      emailMismatch: "ელ. ფოსტა და ლოგინი უნდა იყოს ერთი და იგივე მისამართი. სანამ არ დაემთხვევა, მოთხოვნა არ გაიგზავნება.",
      password: "პაროლი",
      confirm: "გაიმეორეთ პაროლი",
      submit: "განაცხადის გაგზავნა",
      submitting: "იგზავნება…",
      received: "განაცხადი მიღებულია",
      receivedBody: "ადმინისტრატორი დაინახავს ამ მონაცემებს, ქვეყნებს და აყვანის პუნქტებს.",
      done: "დახურვა",
      loginPrompt: "უკვე გავლილი გაქვთ მოდერაცია?",
      loginLink: "პარტნიორის შესვლა",
    };
  }
  if (locale === "ru") {
    return {
      title: "Предложение о партнёрстве",
      close: "Закрыть",
      brand: "Фирменное название",
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Эл. почта",
      country: "Страна",
      city: "Кто запрашивает партнёрство",
      kindCompany: "Компания",
      kindPrivate: "Частное лицо",
      selectKind: "Выберите",
      address: "Адрес центрального офиса",
      languages: "Языки общения с клиентами",
      countries: "Страны операций",
      selectCountry: "Выберите страну",
      add: "Добавить",
      remove: "Удалить",
      selectPlace: "Выберите локацию",
      noPlaces: "Локации отсутствуют",
      noCountries: "Страны операций не указаны",
      primaryPhone: "Основной мобильный",
      managerPhone: "Второй телефон",
      website: "Сайт",
      credentials: "Данные входа",
      login: "Логин (эл. почта)",
      emailMismatch: "Эл. почта и логин должны быть одним и тем же адресом. Пока они не совпадут, заявка не отправится.",
      password: "Пароль",
      confirm: "Повторите пароль",
      submit: "Отправить заявку",
      submitting: "Отправка…",
      received: "Заявка получена",
      receivedBody: "Администратор увидит эти данные, страны и пункты выдачи.",
      done: "Закрыть",
      loginPrompt: "Модерация уже пройдена?",
      loginLink: "Вход партнёра",
    };
  }
  return {
    title: "Partnership offer",
    close: "Close",
    brand: "Brand name",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    country: "Country",
    city: "Who is requesting partnership",
    kindCompany: "Company",
    kindPrivate: "Private person",
    selectKind: "Select",
    address: "Central office address",
    languages: "Languages available for client communication",
    countries: "Operating countries",
    selectCountry: "Select country",
    add: "Add",
    remove: "Remove",
    selectPlace: "Select location",
    noPlaces: "No locations",
    noCountries: "No operating countries set",
    primaryPhone: "Primary mobile phone",
    managerPhone: "Secondary phone",
    website: "Website",
    credentials: "Login credentials",
    login: "Login (email)",
    emailMismatch: "Email and login must be the same address. The request will not be sent until they match.",
    password: "Password",
    confirm: "Confirm password",
    submit: "Submit application",
    submitting: "Sending…",
    received: "Application received",
    receivedBody: "An administrator will see these details, countries, and pickup points.",
    done: "Close",
    loginPrompt: "Already approved?",
    loginLink: "Partner login",
  };
}

function placesForCountry(iso2: string) {
  return searchPlacesForCountry(iso2).map((place) => ({
    code: normalizeLocationCode(place.code),
    label: place.label,
  }));
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function phoneOk(value: string) {
  return splitStoredPhone(value).national.length >= 8;
}

function websiteOk(value: string) {
  const site = value.trim();
  return site.length >= 4 && !/\s/.test(site) && site.includes(".");
}

function fieldClass(invalid: boolean) {
  return cn(
    "mt-1 w-full rounded-md border bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none",
    invalid ? "border-red-500 bg-red-50" : "border-[#c5ced8] focus:border-sky-500",
  );
}

export function PartnerApplicationForm({
  open,
  onClose,
  initialEmail = "",
  initialCompany = "",
  initialCountry = "",
}: {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialCompany?: string;
  initialCountry?: string;
}) {
  const { locale } = useSurfaceDictionary();
  const t = copyFor(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(initialCompany);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [officeCountry, setOfficeCountry] = useState("");
  const [applicantKind, setApplicantKind] = useState<"" | "COMPANY" | "PRIVATE">("");
  const [address, setAddress] = useState("");
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [countryIso2s, setCountryIso2s] = useState<string[]>(
    initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? [initialCountry.toUpperCase()] : [],
  );
  const [locationCodes, setLocationCodes] = useState<string[]>([]);
  const [addCountry, setAddCountry] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [primaryMessengers, setPrimaryMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [managerPhone, setManagerPhone] = useState("");
  const [managerMessengers, setManagerMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [website, setWebsite] = useState("");
  const [loginEmail, setLoginEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const messengerLabels = Object.fromEntries(
    PARTNER_SOCIAL_PLATFORMS.map((item) => [item.value, item.label]),
  ) as Record<PartnerSocialPlatform, string>;

  const countryMissingPlace = (iso2: string) =>
    !placesForCountry(iso2).some((place) => locationCodes.includes(place.code));

  const emailsDiffer =
    email.trim().length > 0 &&
    loginEmail.trim().length > 0 &&
    email.trim().toLowerCase() !== loginEmail.trim().toLowerCase();
  const invalid = {
    title: !title.trim(),
    firstName: !firstName.trim(),
    lastName: !lastName.trim(),
    email: !emailOk(email) || emailsDiffer,
    officeCountry: !officeCountry.trim(),
    applicantKind: applicantKind !== "COMPANY" && applicantKind !== "PRIVATE",
    address: !address.trim(),
    languages: languages.length === 0,
    countries: countryIso2s.length === 0 || countryIso2s.some(countryMissingPlace),
    primaryPhone: !phoneOk(primaryPhone) || primaryMessengers.length === 0,
    managerPhone: !phoneOk(managerPhone) || managerMessengers.length === 0,
    website: !websiteOk(website),
    login: !emailOk(loginEmail) || emailsDiffer,
    password: password.length < 6,
    confirm: confirmPassword.length < 6 || confirmPassword !== password,
  };
  const mark = (key: keyof typeof invalid) => showErrors && invalid[key];

  const addOperatingCountry = () => {
    const iso2 = addCountry.toUpperCase();
    if (!iso2 || countryIso2s.includes(iso2)) return;
    setCountryIso2s((current) => [...current, iso2]);
    setAddCountry("");
  };

  const removeOperatingCountry = (iso2: string) => {
    const codes = new Set(placesForCountry(iso2).map((place) => place.code));
    setCountryIso2s((current) => current.filter((item) => item !== iso2));
    setLocationCodes((current) => current.filter((code) => !codes.has(code)));
  };

  const addPlace = (code: string) => {
    if (!code || locationCodes.includes(code)) return;
    setLocationCodes((current) => [...current, code]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setShowErrors(true);
    if (emailsDiffer) setError(t.emailMismatch);
    if (Object.values(invalid).some(Boolean) || (applicantKind !== "COMPANY" && applicantKind !== "PRIVATE")) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector("[data-invalid='true']")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    const login = email.trim();
    const phoneSplit = splitStoredPhone(primaryPhone);
    const managerSplit = splitStoredPhone(managerPhone);
    const idSeed = title.trim().replace(/\s+/g, "");
    const identificationNumber = (idSeed.length >= 5 ? idSeed : `${idSeed}00000`).slice(0, 40);
    setLoading(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          kind: applicantKind,
          identificationNumber,
          email: login,
          contactEmail: email.trim(),
          phone: phoneSplit.national || primaryPhone.trim(),
          phoneCountryIso2: phoneSplit.iso2,
          secondaryPhone: managerSplit.national,
          secondaryPhoneCountryIso2: managerSplit.iso2,
          messengers: primaryMessengers,
          secondaryMessengers: managerMessengers,
          fleetSize: 1,
          fleetAgeRange: "AGE_0_5",
          countryIso2s,
          locationCodes,
          title: title.trim(),
          officeCountry: officeCountry.trim(),
          centralOffice: "",
          address: address.trim(),
          clientLanguages: languages,
          website: website.trim(),
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-black/55 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#f4f7fb] text-slate-900 shadow-2xl sm:max-h-[90dvh]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b bg-white px-4 py-2.5 sm:px-5 sm:py-3">
          <h2 className="min-w-0 flex-1 break-words text-lg font-extrabold text-[#0b1f4b] sm:text-xl">{t.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            title={t.close}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {ok ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-lg font-bold text-emerald-800">{t.received}</p>
            <p className="text-sm text-slate-600">{t.receivedBody}</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#1d6fe8] px-5 py-2.5 font-bold text-white" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={submit} noValidate className="px-3 pt-3 sm:px-5 sm:pt-5">
            {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <div className="rounded-xl border border-slate-200 bg-[#eef3f8] p-3 sm:p-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <TextField label={t.brand} value={title} onChange={setTitle} invalid={mark("title")} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label={t.firstName} value={firstName} onChange={setFirstName} invalid={mark("firstName")} />
                    <TextField label={t.lastName} value={lastName} onChange={setLastName} invalid={mark("lastName")} />
                  </div>
                  <TextField
                    label={t.email}
                    value={email}
                    onChange={setEmail}
                    invalid={mark("email")}
                    type="email"
                    hint={showErrors && emailsDiffer ? t.emailMismatch : ""}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ResidenceCountrySelect
                      label={t.country}
                      valueIso2={
                        WORLD_COUNTRIES.find((country) => country.name === officeCountry)?.iso2 || ""
                      }
                      onChange={(_iso2, name) => setOfficeCountry(name)}
                      locale={locale}
                      invalid={mark("officeCountry")}
                      placeholder={t.selectCountry}
                      required
                    />
                    <label
                      data-invalid={mark("applicantKind") ? "true" : undefined}
                      className={cn(
                        "block text-sm font-semibold",
                        mark("applicantKind") ? "text-red-700" : "text-[#3a4553]",
                      )}
                    >
                      {t.city} <span className="text-[#e11d48]">*</span>
                      <select
                        className={fieldClass(mark("applicantKind"))}
                        value={applicantKind}
                        onChange={(event) => {
                          const value = event.target.value;
                          setApplicantKind(value === "COMPANY" || value === "PRIVATE" ? value : "");
                        }}
                      >
                        <option value="">{t.selectKind}</option>
                        <option value="COMPANY">{t.kindCompany}</option>
                        <option value="PRIVATE">{t.kindPrivate}</option>
                      </select>
                    </label>
                  </div>
                  <TextField label={t.address} value={address} onChange={setAddress} invalid={mark("address")} />
                  <div data-invalid={mark("languages") ? "true" : undefined}>
                    <p className={cn("mb-1.5 text-sm font-semibold", mark("languages") ? "text-red-700" : "text-[#3a4553]")}>
                      {t.languages} <span className="text-[#e11d48]">*</span>
                    </p>
                    <div
                      className={cn(
                        "flex flex-wrap gap-1.5 rounded-md p-1",
                        mark("languages") && "border border-red-500 bg-red-50",
                      )}
                    >
                      {LOCALES.map((code) => {
                        const on = languages.includes(code);
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() =>
                              setLanguages((current) =>
                                current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
                              )
                            }
                            className={cn(
                              "min-h-10 rounded-md border px-2.5 py-1.5 text-xs font-semibold",
                              on
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                                : "border-slate-200 bg-white text-slate-600",
                            )}
                          >
                            {LOCALE_LABELS[code as Locale]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div data-invalid={mark("countries") ? "true" : undefined}>
                    <p className={cn("mb-1.5 text-sm font-semibold", mark("countries") ? "text-red-700" : "text-[#3a4553]")}>
                      {t.countries} <span className="text-[#e11d48]">*</span>
                    </p>
                    <div
                      className={cn(
                        "rounded-md",
                        mark("countries") && countryIso2s.length === 0 && "border border-red-500 bg-red-50 p-2",
                      )}
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <select
                          className="h-11 min-w-0 flex-1 rounded-md border border-[#c5ced8] bg-white px-3 text-base"
                          value={addCountry}
                          onChange={(event) => setAddCountry(event.target.value)}
                        >
                          <option value="">{t.selectCountry}</option>
                          {WORLD_COUNTRIES.filter((country) => !countryIso2s.includes(country.iso2)).map((country) => (
                            <option key={country.iso2} value={country.iso2}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!addCountry}
                          onClick={addOperatingCountry}
                          className="min-h-11 rounded-md bg-[#28a745] px-3 text-sm font-bold text-white disabled:opacity-45"
                        >
                          {t.add}
                        </button>
                      </div>
                      {countryIso2s.length === 0 ? (
                        <p className={cn("text-sm", mark("countries") ? "font-semibold text-red-700" : "text-slate-400")}>
                          {t.noCountries}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {countryIso2s.map((iso2) => {
                            const places = placesForCountry(iso2);
                            const selected = places.filter((place) => locationCodes.includes(place.code));
                            const missing = showErrors && selected.length === 0;
                            return (
                              <li
                                key={iso2}
                                data-invalid={missing ? "true" : undefined}
                                className={cn(
                                  "rounded-md border bg-white px-3 py-2",
                                  missing ? "border-red-500 bg-red-50" : "border-slate-200",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                                    <CountryFlag iso2={iso2} />
                                    <span className="truncate">{worldCountryName(iso2)}</span>
                                    <span className="text-xs font-medium text-slate-400">({iso2})</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="min-h-10 shrink-0 text-xs font-semibold text-red-700"
                                    onClick={() => removeOperatingCountry(iso2)}
                                  >
                                    {t.remove}
                                  </button>
                                </div>
                                <select
                                  className={cn(
                                    "mt-2 h-11 w-full rounded-md border bg-white px-3 text-base",
                                    missing ? "border-red-500" : "border-[#c5ced8]",
                                  )}
                                  value=""
                                  disabled={places.length === 0}
                                  onChange={(event) => {
                                    if (event.target.value) addPlace(event.target.value);
                                  }}
                                >
                                  <option value="">{places.length ? t.selectPlace : t.noPlaces}</option>
                                  {places
                                    .filter((place) => !locationCodes.includes(place.code))
                                    .map((place) => (
                                      <option key={place.code} value={place.code}>
                                        {place.label}
                                      </option>
                                    ))}
                                </select>
                                <ul className="mt-2 space-y-1">
                                  {selected.map((place) => (
                                    <li
                                      key={place.code}
                                      className="flex items-center justify-between gap-2 rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-xs"
                                    >
                                      <span className="min-w-0 break-words font-semibold text-slate-800">{place.label}</span>
                                      <button
                                        type="button"
                                        className="min-h-10 shrink-0 font-semibold text-red-700"
                                        onClick={() =>
                                          setLocationCodes((current) => current.filter((code) => code !== place.code))
                                        }
                                      >
                                        {t.remove}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <PhoneRow
                    label={t.primaryPhone}
                    value={primaryPhone}
                    onChange={setPrimaryPhone}
                    messengers={primaryMessengers}
                    onMessengers={setPrimaryMessengers}
                    messengerLabels={messengerLabels}
                    invalid={mark("primaryPhone")}
                  />
                  <PhoneRow
                    label={t.managerPhone}
                    value={managerPhone}
                    onChange={setManagerPhone}
                    messengers={managerMessengers}
                    onMessengers={setManagerMessengers}
                    messengerLabels={messengerLabels}
                    invalid={mark("managerPhone")}
                  />
                  <TextField label={t.website} value={website} onChange={setWebsite} invalid={mark("website")} />
                  <div
                    data-invalid={mark("login") || mark("password") || mark("confirm") ? "true" : undefined}
                    className={cn(
                      "space-y-3 rounded-md border bg-white p-3",
                      mark("login") || mark("password") || mark("confirm") ? "border-red-500" : "border-slate-200",
                    )}
                  >
                    <p className="text-sm font-semibold text-[#3a4553]">{t.credentials}</p>
                    <TextField
                      label={t.login}
                      value={loginEmail}
                      onChange={setLoginEmail}
                      invalid={mark("login")}
                      type="email"
                      hint={showErrors && emailsDiffer ? t.emailMismatch : ""}
                    />
                    <TextField
                      label={t.password}
                      value={password}
                      onChange={setPassword}
                      invalid={mark("password")}
                      type="password"
                      autoComplete="new-password"
                    />
                    <TextField
                      label={t.confirm}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      invalid={mark("confirm")}
                      type="password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 -mx-3 mt-4 border-t border-slate-200 bg-[#f4f7fb] px-3 pb-3 pt-3 sm:-mx-5 sm:px-5 sm:pb-5">
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 w-full rounded-xl bg-[#22c55e] py-3 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
              >
                {loading ? t.submitting : t.submit}
              </button>
              <p className="mt-2 text-center text-sm text-slate-600">
                {t.loginPrompt}{" "}
                <a href={PARTNER_LOGIN} className="font-semibold text-sky-700 hover:underline" onClick={onClose}>
                  {t.loginLink}
                </a>
              </p>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  invalid,
  type = "text",
  autoComplete,
  hint = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label
      data-invalid={invalid ? "true" : undefined}
      className={cn("block text-sm font-semibold", invalid ? "text-red-700" : "text-[#3a4553]")}
    >
      {label} <span className="text-[#e11d48]">*</span>
      <input
        type={type}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className={fieldClass(invalid)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="mt-1 block text-sm font-semibold text-red-700">{hint}</span> : null}
    </label>
  );
}

function PhoneRow({
  label,
  value,
  onChange,
  messengers,
  onMessengers,
  messengerLabels,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  messengers: PartnerSocialPlatform[];
  onMessengers: (next: PartnerSocialPlatform[]) => void;
  messengerLabels: Record<PartnerSocialPlatform, string>;
  invalid: boolean;
}) {
  return (
    <div data-invalid={invalid ? "true" : undefined}>
      <p className={cn("mb-1.5 text-sm font-semibold", invalid ? "text-red-700" : "text-[#3a4553]")}>
        {label} <span className="text-[#e11d48]">*</span>
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border bg-white px-3 py-2",
          invalid ? "border-red-500 bg-red-50" : "border-[#c5ced8]",
        )}
      >
        <input
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="tel"
          aria-invalid={invalid || undefined}
        />
        <PhoneMessengerIcons selected={messengers} onChange={onMessengers} labels={messengerLabels} />
      </div>
    </div>
  );
}
