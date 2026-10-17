"use client";

import { useRef, useState } from "react";
import { CountryFlag } from "@/components/ui/country-flag";
import { ResidenceCountrySelect } from "@/components/cars/residence-country-select";
import { PhoneMessengerIcons } from "@/components/partner/phone-messenger-icons";
import { DialCodeSelect } from "@/components/partner/phone-country-field";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";
import { dialCodeForIso2, nationalDigits } from "@/lib/catalog/dial-codes";
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
      firstName: "სახელი",
      lastName: "გვარი",
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
      countriesHelp:
        "აირჩიეთ ქვეყნები, სადაც მუშაობთ. აეროპორტებს და ქალაქებს დამტკიცების შემდეგ დაამატებთ კაბინეტის „მიწოდების“ გვერდზე.",
      noCountries: "ოპერირების ქვეყანა არ არის მითითებული",
      primaryPhone: "ძირითადი მობილური ტელეფონის ნომერი",
      managerPhone: "მეორე ტელეფონი",
      phoneCodeRequired: "ქვეყნის კოდი აუცილებელია. აირჩიეთ სიიდან და ნომერში მხოლოდ ციფრები ჩაწერეთ.",
      website: "ვებსაიტი",
      noWebsite: "არ მაქვს ვებსაიტი",
      credentials: "შესვლის მონაცემები",
      login: "ლოგინი (ელ. ფოსტა)",
      password: "პაროლი",
      confirm: "გაიმეორეთ პაროლი",
      submit: "განაცხადის გაგზავნა",
      submitting: "იგზავნება…",
      received: "შეთავაზება წარმატებით გაიგზავნა",
      receivedBody:
        "დაელოდეთ შეთავაზების განხილვას. დამტკიცების შემთხვევაში თქვენს მიერ მითითებული მაილი და პაროლი ავტომატურად გააქტიურდება პირად კაბინეტში შესასვლელად.",
      done: "დახურვა",
      loginPrompt: "უკვე გავლილი გაქვთ მოდერაცია?",
      loginLink: "პარტნიორის შესვლა",
    };
  }
  if (locale === "ru") {
    return {
      title: "Предложение о партнёрстве",
      close: "Закрыть",
      firstName: "Имя",
      lastName: "Фамилия",
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
      countriesHelp:
        "Выберите страны, где вы работаете. Аэропорты и города добавляются после одобрения на странице «Доставка» в кабинете.",
      noCountries: "Страны операций не указаны",
      primaryPhone: "Основной мобильный",
      managerPhone: "Второй телефон",
      phoneCodeRequired: "Код страны обязателен. Выберите его в списке и вводите только номер.",
      website: "Сайт",
      noWebsite: "У меня нет сайта",
      credentials: "Данные входа",
      login: "Логин (эл. почта)",
      password: "Пароль",
      confirm: "Повторите пароль",
      submit: "Отправить заявку",
      submitting: "Отправка…",
      received: "Предложение успешно отправлено",
      receivedBody:
        "Дождитесь рассмотрения предложения. В случае одобрения указанные вами почта и пароль автоматически активируются для входа в личный кабинет.",
      done: "Закрыть",
      loginPrompt: "Модерация уже пройдена?",
      loginLink: "Вход партнёра",
    };
  }
  return {
    title: "Partnership offer",
    close: "Close",
    firstName: "First name",
    lastName: "Last name",
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
    countriesHelp:
      "Select the countries where you operate. After approval you add airports and cities on the Delivery page of your cabinet.",
    noCountries: "No operating countries set",
    primaryPhone: "Primary mobile phone",
    managerPhone: "Secondary phone",
    phoneCodeRequired: "A country code is required. Choose it in the list and enter only the number.",
    website: "Website",
    noWebsite: "I don't have a website",
    credentials: "Login credentials",
    login: "Login (email)",
    password: "Password",
    confirm: "Confirm password",
    submit: "Submit application",
    submitting: "Sending…",
    received: "Your offer was sent successfully",
    receivedBody:
      "Please wait while the offer is reviewed. If it is approved, the email and password you entered will be activated automatically so you can sign in to your partner cabinet.",
    done: "Close",
    loginPrompt: "Already approved?",
    loginLink: "Partner login",
  };
}

function emailOk(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function phoneOk(value: string) {
  return nationalDigits(value).length >= 8;
}

function nationalOnly(iso2: string, raw: string) {
  const digits = raw.replace(/\D/g, "");
  const dial = dialCodeForIso2(iso2);
  if (raw.trim().startsWith("+") && dial && digits.startsWith(dial)) return digits.slice(dial.length);
  return digits.replace(/^0+/, "");
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [officeCountry, setOfficeCountry] = useState("");
  const defaultIso2 =
    initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? initialCountry.toUpperCase() : "GE";
  const [applicantKind, setApplicantKind] = useState<"" | "COMPANY" | "PRIVATE">("");
  const [address, setAddress] = useState("");
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [countryIso2s, setCountryIso2s] = useState<string[]>(
    initialCountry && /^[A-Za-z]{2}$/.test(initialCountry) ? [initialCountry.toUpperCase()] : [],
  );
  const [addCountry, setAddCountry] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [primaryIso2, setPrimaryIso2] = useState(defaultIso2);
  const [primaryMessengers, setPrimaryMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [managerPhone, setManagerPhone] = useState("");
  const [managerIso2, setManagerIso2] = useState(defaultIso2);
  const [managerMessengers, setManagerMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [website, setWebsite] = useState("");
  const [noWebsite, setNoWebsite] = useState(false);
  const [loginEmail, setLoginEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  if (!open) return null;

  const messengerLabels = Object.fromEntries(
    PARTNER_SOCIAL_PLATFORMS.map((item) => [item.value, item.label]),
  ) as Record<PartnerSocialPlatform, string>;

  const invalid = {
    firstName: !firstName.trim(),
    lastName: !lastName.trim(),
    officeCountry: !officeCountry.trim(),
    applicantKind: applicantKind !== "COMPANY" && applicantKind !== "PRIVATE",
    address: !address.trim(),
    languages: languages.length === 0,
    countries: countryIso2s.length === 0,
    primaryPhone: !phoneOk(primaryPhone) || primaryMessengers.length === 0,
    managerPhone: !phoneOk(managerPhone) || managerMessengers.length === 0,
    website: !noWebsite && !websiteOk(website),
    login: !emailOk(loginEmail),
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
    setCountryIso2s((current) => current.filter((item) => item !== iso2));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setShowErrors(true);
    if (Object.values(invalid).some(Boolean) || (applicantKind !== "COMPANY" && applicantKind !== "PRIVATE")) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector("[data-invalid='true']")
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    const login = loginEmail.trim().toLowerCase();
    const idSeed = `${firstName.trim()}${lastName.trim()}`.replace(/\s+/g, "");
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
          contactEmail: login,
          phone: nationalDigits(primaryPhone),
          phoneCountryIso2: primaryIso2,
          secondaryPhone: nationalDigits(managerPhone),
          secondaryPhoneCountryIso2: managerIso2,
          messengers: primaryMessengers,
          secondaryMessengers: managerMessengers,
          fleetSize: 1,
          fleetAgeRange: "AGE_0_5",
          countryIso2s,
          officeCountry: officeCountry.trim(),
          centralOffice: "",
          address: address.trim(),
          clientLanguages: languages,
          website: noWebsite ? "" : website.trim(),
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
      className="fixed inset-0 z-[230] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none bg-[#f4f7fb] text-slate-900 shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b bg-white px-4 py-3 sm:px-5">
          <h2 className="min-w-0 flex-1 break-words text-lg font-extrabold text-[#0b1f4b] sm:text-xl">{t.title}</h2>
          <button type="button" className="min-h-10 shrink-0 px-2 text-sm font-semibold text-slate-500" onClick={onClose}>
            {t.close}
          </button>
        </div>
        {ok ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-lg font-bold text-emerald-800">{t.received}</p>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600">{t.receivedBody}</p>
            <button type="button" className="min-h-11 rounded-xl bg-[#1d6fe8] px-5 py-2.5 font-bold text-white" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={submit}
            noValidate
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
            {error ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <div className="rounded-xl border border-slate-200 bg-[#eef3f8] p-3 sm:p-4">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label={t.firstName} value={firstName} onChange={setFirstName} invalid={mark("firstName")} />
                    <TextField label={t.lastName} value={lastName} onChange={setLastName} invalid={mark("lastName")} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ResidenceCountrySelect
                      label={t.country}
                      valueIso2={
                        WORLD_COUNTRIES.find((country) => country.name === officeCountry)?.iso2 || ""
                      }
                      onChange={(iso2, name) => {
                        setOfficeCountry(name);
                        if (!primaryPhone.trim()) setPrimaryIso2(iso2);
                        if (!managerPhone.trim()) setManagerIso2(iso2);
                      }}
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
                    <p className="mb-2 text-xs text-slate-500">{t.countriesHelp}</p>
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
                          {countryIso2s.map((iso2) => (
                            <li
                              key={iso2}
                              className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                            >
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
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <PhoneRow
                    label={t.primaryPhone}
                    iso2={primaryIso2}
                    onIso2Change={setPrimaryIso2}
                    value={primaryPhone}
                    onChange={(value) => setPrimaryPhone(nationalOnly(primaryIso2, value))}
                    messengers={primaryMessengers}
                    onMessengers={setPrimaryMessengers}
                    messengerLabels={messengerLabels}
                    invalid={mark("primaryPhone")}
                    hint={t.phoneCodeRequired}
                  />
                  <PhoneRow
                    label={t.managerPhone}
                    iso2={managerIso2}
                    onIso2Change={setManagerIso2}
                    value={managerPhone}
                    onChange={(value) => setManagerPhone(nationalOnly(managerIso2, value))}
                    messengers={managerMessengers}
                    onMessengers={setManagerMessengers}
                    messengerLabels={messengerLabels}
                    invalid={mark("managerPhone")}
                    hint={t.phoneCodeRequired}
                  />
                  <div data-invalid={mark("website") ? "true" : undefined}>
                    <p className={cn("mb-1.5 text-sm font-semibold", mark("website") ? "text-red-700" : "text-[#3a4553]")}>
                      {t.website}
                      {noWebsite ? null : <span className="text-[#e11d48]"> *</span>}
                    </p>
                    <div
                      className={cn(
                        "rounded-md border bg-white px-3 py-2",
                        mark("website") ? "border-red-500 bg-red-50" : "border-[#c5ced8]",
                      )}
                    >
                      <input
                        type="text"
                        inputMode="url"
                        disabled={noWebsite}
                        aria-invalid={mark("website") || undefined}
                        className="min-h-11 w-full border-0 bg-transparent text-base font-normal text-slate-900 outline-none disabled:text-slate-400"
                        value={noWebsite ? "" : website}
                        onChange={(event) => setWebsite(event.target.value)}
                      />
                      <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 border-t border-slate-200 pt-1.5 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 accent-sky-600"
                          checked={noWebsite}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setNoWebsite(checked);
                            if (checked) setWebsite("");
                          }}
                        />
                        <span>{t.noWebsite}</span>
                      </label>
                    </div>
                  </div>
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
                      autoComplete="email"
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
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-xl bg-[#22c55e] py-3 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
            >
              {loading ? t.submitting : t.submit}
            </button>
            <p className="mt-2 mb-1 text-center text-sm text-slate-600">
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
  iso2,
  onIso2Change,
  value,
  onChange,
  messengers,
  onMessengers,
  messengerLabels,
  invalid,
  hint,
}: {
  label: string;
  iso2: string;
  onIso2Change: (iso2: string) => void;
  value: string;
  onChange: (value: string) => void;
  messengers: PartnerSocialPlatform[];
  onMessengers: (next: PartnerSocialPlatform[]) => void;
  messengerLabels: Record<PartnerSocialPlatform, string>;
  invalid: boolean;
  hint: string;
}) {
  return (
    <div data-invalid={invalid ? "true" : undefined}>
      <p className={cn("mb-1.5 text-sm font-semibold", invalid ? "text-red-700" : "text-[#3a4553]")}>
        {label} <span className="text-[#e11d48]">*</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <DialCodeSelect iso2={iso2} label={label} onChange={onIso2Change} invalid={invalid} />
        <div
          className={cn(
            "flex min-h-12 min-w-0 flex-1 flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-1.5",
            invalid ? "border-red-500 bg-red-50" : "border-[#c5ced8]",
          )}
        >
          <input
            className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-base outline-none"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            inputMode="tel"
            autoComplete="tel-national"
            aria-invalid={invalid || undefined}
            placeholder="555123456"
          />
          <PhoneMessengerIcons selected={messengers} onChange={onMessengers} labels={messengerLabels} />
        </div>
      </div>
      <p className={cn("mt-1 text-sm leading-snug", invalid ? "font-semibold text-red-700" : "text-slate-500")}>
        {hint}
      </p>
    </div>
  );
}
