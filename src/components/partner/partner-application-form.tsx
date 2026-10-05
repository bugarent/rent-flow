"use client";

import { useRef, useState } from "react";
import { CountryFlag } from "@/components/ui/country-flag";
import { PhoneMessengerIcons } from "@/components/partner/phone-messenger-icons";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";
import { splitStoredPhone } from "@/lib/catalog/dial-codes";
import { normalizeLocationCode, searchPlacesForCountry } from "@/lib/catalog/search-places";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { PARTNER_LOGIN } from "@/lib/routes";
import { PARTNER_SOCIAL_PLATFORMS, type PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1 w-full rounded-md border border-[#c5ced8] bg-white px-3 py-2.5 text-base font-normal text-slate-900 outline-none focus:border-sky-500";

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "ძირითადი ინფო",
      close: "დახურვა",
      logo: "ლოგო",
      upload: "ატვირთვა",
      replace: "შეცვლა",
      deleteLogo: "წაშლა",
      brand: "საფირმო სახელი",
      firstName: "სახელი",
      lastName: "გვარი",
      email: "ელ. ფოსტა",
      country: "ქვეყანა",
      city: "ცენტრალური ოფისის მდებარეობა",
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
      password: "პაროლი",
      confirm: "გაიმეორეთ პაროლი",
      submit: "განაცხადის გაგზავნა",
      submitting: "იგზავნება…",
      received: "განაცხადი მიღებულია",
      receivedBody: "ადმინისტრატორი დაინახავს ამ მონაცემებს, ქვეყნებს და აყვანის პუნქტებს.",
      done: "დახურვა",
      fill: "შეავსეთ ყველა სავალდებულო ველი.",
      placesRequired: "თითოეულ ქვეყანას მიუთითეთ აყვანის პუნქტი.",
      passwordShort: "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.",
      mismatch: "პაროლები არ ემთხვევა.",
      loginPrompt: "უკვე გავლილი გაქვთ მოდერაცია?",
      loginLink: "პარტნიორის შესვლა",
    };
  }
  if (locale === "ru") {
    return {
      title: "Основная информация",
      close: "Закрыть",
      logo: "Логотип",
      upload: "Загрузить",
      replace: "Заменить",
      deleteLogo: "Удалить",
      brand: "Фирменное название",
      firstName: "Имя",
      lastName: "Фамилия",
      email: "Эл. почта",
      country: "Страна",
      city: "Центральный офис",
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
      password: "Пароль",
      confirm: "Повторите пароль",
      submit: "Отправить заявку",
      submitting: "Отправка…",
      received: "Заявка получена",
      receivedBody: "Администратор увидит эти данные, страны и пункты выдачи.",
      done: "Закрыть",
      fill: "Заполните все обязательные поля.",
      placesRequired: "Укажите пункт выдачи для каждой страны.",
      passwordShort: "Пароль должен быть не короче 6 символов.",
      mismatch: "Пароли не совпадают.",
      loginPrompt: "Модерация уже пройдена?",
      loginLink: "Вход партнёра",
    };
  }
  return {
    title: "Basic info",
    close: "Close",
    logo: "Logo",
    upload: "Upload",
    replace: "Replace",
    deleteLogo: "Remove",
    brand: "Brand name",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    country: "Country",
    city: "Central office location",
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
    password: "Password",
    confirm: "Confirm password",
    submit: "Submit application",
    submitting: "Sending…",
    received: "Application received",
    receivedBody: "An administrator will see these details, countries, and pickup points.",
    done: "Close",
    fill: "Fill in every required field.",
    placesRequired: "Choose a pickup point for each country.",
    passwordShort: "Password must be at least 6 characters.",
    mismatch: "Passwords do not match.",
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
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [title, setTitle] = useState(initialCompany);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [officeCountry, setOfficeCountry] = useState("");
  const [centralOffice, setCentralOffice] = useState("");
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

  if (!open) return null;

  const messengerLabels = Object.fromEntries(
    PARTNER_SOCIAL_PLATFORMS.map((item) => [item.value, item.label]),
  ) as Record<PartnerSocialPlatform, string>;

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

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/partners/apply-logo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLogoUrl(String(data.url || ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoBusy(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const login = (loginEmail || email).trim();
    const phoneSplit = splitStoredPhone(primaryPhone);
    const managerSplit = managerPhone.trim() ? splitStoredPhone(managerPhone) : null;
    const missingPlace = countryIso2s.some(
      (iso2) => !placesForCountry(iso2).some((place) => locationCodes.includes(place.code)),
    );
    if (
      !title.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !login ||
      !officeCountry.trim() ||
      !centralOffice.trim() ||
      !address.trim() ||
      !languages.length ||
      !countryIso2s.length ||
      !primaryPhone.trim() ||
      !primaryMessengers.length ||
      !password
    ) {
      setError(t.fill);
      return;
    }
    if (missingPlace) {
      setError(t.placesRequired);
      return;
    }
    if (password.length < 6) {
      setError(t.passwordShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }
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
          kind: "COMPANY",
          identificationNumber,
          email: login,
          contactEmail: email.trim() || login,
          phone: phoneSplit.national || primaryPhone.trim(),
          phoneCountryIso2: phoneSplit.iso2,
          secondaryPhone:
            managerSplit && managerSplit.national.length >= 8 ? managerSplit.national : undefined,
          secondaryPhoneCountryIso2:
            managerSplit && managerSplit.national.length >= 8 ? managerSplit.iso2 : undefined,
          messengers: primaryMessengers,
          secondaryMessengers: managerMessengers,
          fleetSize: 1,
          fleetAgeRange: "AGE_0_5",
          countryIso2s,
          locationCodes,
          title: title.trim(),
          officeCountry: officeCountry.trim(),
          centralOffice: centralOffice.trim(),
          address: address.trim(),
          clientLanguages: languages,
          logoUrl,
          website: website.trim(),
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.fill);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fill);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-[#f4f7fb] text-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b bg-white px-4 py-3 sm:px-5">
          <h2 className="text-lg font-extrabold text-[#0b1f4b] sm:text-xl">{t.title}</h2>
          <button type="button" className="min-h-10 px-2 text-sm font-semibold text-slate-500" onClick={onClose}>
            {t.close}
          </button>
        </div>
        {ok ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-lg font-bold text-emerald-800">{t.received}</p>
            <p className="text-sm text-slate-600">{t.receivedBody}</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#1d6fe8] px-5 py-2.5 font-bold text-white" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="p-3 sm:p-5">
            {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <div className="rounded-xl border border-slate-200 bg-[#eef3f8] p-3 sm:p-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="w-[120px] rounded-none border border-dashed border-slate-300 bg-white p-2">
                    <p className="mb-1 text-xs font-semibold text-[#3a4553]">{t.logo}</p>
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-[96px] w-[96px] bg-slate-50 object-cover" />
                    ) : (
                      <div className="flex h-[96px] w-[96px] items-center justify-center border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                        —
                      </div>
                    )}
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void uploadLogo(event.target.files?.[0])}
                    />
                    <div className="mt-2 flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={logoBusy}
                        className="min-h-10 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                        onClick={() => logoRef.current?.click()}
                      >
                        {logoBusy ? "…" : logoUrl ? t.replace : t.upload}
                      </button>
                      {logoUrl ? (
                        <button
                          type="button"
                          className="min-h-10 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-800"
                          onClick={() => setLogoUrl("")}
                        >
                          {t.deleteLogo}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <label className="block text-sm font-semibold text-[#3a4553]">
                    {t.brand} <span className="text-[#e11d48]">*</span>
                    <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.firstName} <span className="text-[#e11d48]">*</span>
                      <input className={inputClass} value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                    </label>
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.lastName} <span className="text-[#e11d48]">*</span>
                      <input className={inputClass} value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-[#3a4553]">
                    {t.email} <span className="text-[#e11d48]">*</span>
                    <input
                      type="email"
                      className={inputClass}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.country} <span className="text-[#e11d48]">*</span>
                      <input className={inputClass} value={officeCountry} onChange={(event) => setOfficeCountry(event.target.value)} required />
                    </label>
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.city} <span className="text-[#e11d48]">*</span>
                      <input className={inputClass} value={centralOffice} onChange={(event) => setCentralOffice(event.target.value)} required />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-[#3a4553]">
                    {t.address} <span className="text-[#e11d48]">*</span>
                    <input className={inputClass} value={address} onChange={(event) => setAddress(event.target.value)} required />
                  </label>
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-[#3a4553]">
                      {t.languages} <span className="text-[#e11d48]">*</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
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
                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-[#3a4553]">
                      {t.countries} <span className="text-[#e11d48]">*</span>
                    </p>
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
                      <p className="text-sm text-slate-400">{t.noCountries}</p>
                    ) : (
                      <ul className="space-y-2">
                        {countryIso2s.map((iso2) => {
                          const places = placesForCountry(iso2);
                          const selected = places.filter((place) => locationCodes.includes(place.code));
                          return (
                            <li key={iso2} className="rounded-md border border-slate-200 bg-white px-3 py-2">
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
                                className="mt-2 h-11 w-full rounded-md border border-[#c5ced8] bg-white px-3 text-base"
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

                  <PhoneRow
                    label={t.primaryPhone}
                    value={primaryPhone}
                    onChange={setPrimaryPhone}
                    messengers={primaryMessengers}
                    onMessengers={setPrimaryMessengers}
                    messengerLabels={messengerLabels}
                    required
                  />
                  <PhoneRow
                    label={t.managerPhone}
                    value={managerPhone}
                    onChange={setManagerPhone}
                    messengers={managerMessengers}
                    onMessengers={setManagerMessengers}
                    messengerLabels={messengerLabels}
                    required
                  />
                  <label className="block text-sm font-semibold text-[#3a4553]">
                    {t.website}
                    <input className={inputClass} value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </label>
                  <div className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-[#3a4553]">{t.credentials}</p>
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.login} <span className="text-[#e11d48]">*</span>
                      <input
                        type="email"
                        className={inputClass}
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.password} <span className="text-[#e11d48]">*</span>
                      <input
                        type="password"
                        className={inputClass}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-[#3a4553]">
                      {t.confirm} <span className="text-[#e11d48]">*</span>
                      <input
                        type="password"
                        className={inputClass}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 min-h-11 w-full rounded-xl bg-[#22c55e] py-3 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
            >
              {loading ? t.submitting : t.submit}
            </button>
            <p className="mt-3 text-center text-sm text-slate-600">
              {t.loginPrompt}{" "}
              <a href={PARTNER_LOGIN} className="font-semibold text-sky-700 hover:underline" onClick={onClose}>
                {t.loginLink}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function PhoneRow({
  label,
  value,
  onChange,
  messengers,
  onMessengers,
  messengerLabels,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  messengers: PartnerSocialPlatform[];
  onMessengers: (next: PartnerSocialPlatform[]) => void;
  messengerLabels: Record<PartnerSocialPlatform, string>;
  required?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-[#3a4553]">
        {label} {required ? <span className="text-[#e11d48]">*</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-[#c5ced8] bg-white px-3 py-2">
        <input
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="tel"
        />
        <PhoneMessengerIcons selected={messengers} onChange={onMessengers} labels={messengerLabels} />
      </div>
    </div>
  );
}
