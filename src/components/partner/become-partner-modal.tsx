"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FLEET_AGE_RANGES, type PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { PARTNER_LOGIN } from "@/lib/routes";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { SocialPlatformPicker } from "@/components/partner/social-platform-picker";
import { OperatingCountriesHover } from "@/components/partner/operating-countries-hover";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

type Props = {
  open: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialCompany?: string;
  initialCountry?: string;
};

function RequiredMark() {
  return <span className="text-red-500"> *</span>;
}

export function BecomePartnerModal({
  open,
  onClose,
  initialEmail = "",
  initialCompany: _initialCompany = "",
  initialCountry = "",
}: Props) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    kind: "COMPANY" as "COMPANY" | "PRIVATE",
    identificationNumber: "",
    email: "",
    phoneIso2: "GE",
    phoneNational: "",
    messengers: [] as PartnerSocialPlatform[],
    fleetSize: "1",
    fleetAgeRange: "AGE_0_5",
    countryIso2s: [] as string[],
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const seed = open ? `${initialEmail}\0${initialCountry}` : "";
  const [appliedSeed, setAppliedSeed] = useState("");
  if (seed !== appliedSeed) {
    setAppliedSeed(seed);
    if (seed) {
      setForm((prev) => ({
        ...prev,
        email: initialEmail || prev.email,
        countryIso2s: initialCountry ? [initialCountry] : prev.countryIso2s,
      }));
    }
  }

  if (!open) return null;

  const phoneValue = formatInternationalPhone(form.phoneIso2, form.phoneNational);
  const emailInvalid = submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const passwordTooShort = submitted && form.password.length < 6;
  const passwordsDiffer = submitted && form.password !== form.confirmPassword;
  const passwordInvalid = passwordTooShort || passwordsDiffer;
  const confirmInvalid = submitted && (!form.confirmPassword || form.password !== form.confirmPassword);
  const firstNameInvalid = submitted && !form.firstName.trim();
  const lastNameInvalid = submitted && !form.lastName.trim();
  const idInvalid = submitted && form.identificationNumber.trim().length < 5;
  const phoneInvalid = submitted && !phoneValue;
  const messengersInvalid = submitted && form.messengers.length === 0;
  const fleetInvalid = submitted && !(Number(form.fleetSize) >= 1);
  const countriesInvalid = submitted && form.countryIso2s.length === 0;

  const fleetAgeLabel = (value: string) => {
    if (value === "AGE_0_5") return t.fleetAge0_5;
    if (value === "AGE_6_9") return t.fleetAge6_9;
    if (value === "AGE_10_PLUS") return t.fleetAge10;
    return value;
  };

  const inputClass = (invalid: boolean, extra?: string) =>
    cn(
      "w-full rounded-xl border px-3 py-2.5 text-base font-normal outline-none",
      extra,
      invalid ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200",
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError("");
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const identificationNumber = form.identificationNumber.trim();
    const fleetSize = Number(form.fleetSize);
    const phone = formatInternationalPhone(form.phoneIso2, form.phoneNational);

    const password = form.password;
    const confirmPassword = form.confirmPassword;
    const passwordsDiffer = password !== confirmPassword;

    if (
      !firstName ||
      !lastName ||
      !email ||
      identificationNumber.length < 5 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !form.kind ||
      !form.phoneIso2 ||
      !phone ||
      !form.messengers.length ||
      !Number.isFinite(fleetSize) ||
      fleetSize < 1 ||
      !form.fleetAgeRange ||
      !form.countryIso2s.length ||
      password.length < 6
    ) {
      setError(
        !form.messengers.length
          ? t.messengersRequired
          : !form.countryIso2s.length
            ? t.countriesRequired
            : !phone
              ? t.phoneRequired
              : password.length < 6
                ? t.passwordShort
                : t.fillAll,
      );
      return;
    }
    if (passwordsDiffer) {
      setError(t.passwordsMismatch);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          kind: form.kind,
          identificationNumber,
          email,
          phone,
          phoneCountryIso2: form.phoneIso2,
          messengers: form.messengers,
          fleetSize,
          fleetAgeRange: form.fleetAgeRange,
          countryIso2s: form.countryIso2s,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : "";
        if (code === "EMAIL_EXISTS") {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "An application with this email is already registered.",
          );
        }
        if (code === "PHONE_EXISTS") {
          throw new Error(
            typeof data.error === "string"
              ? data.error
              : "A partner with this phone number is already registered.",
          );
        }
        throw new Error(data.error || t.fillAll);
      }
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fillAll);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-5 py-3">
          <h2 className="text-xl font-extrabold text-[#0b1f4b]">{t.title}</h2>
          <button
            type="button"
            className="min-h-10 px-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            {t.close}
          </button>
        </div>

        {ok ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-lg font-bold text-emerald-800">{t.received}</p>
            <p className="text-sm text-slate-600">{t.receivedBody}</p>
            <button type="button" className="rounded-xl bg-[#1d6fe8] px-5 py-2.5 font-bold text-white" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 py-3 md:grid-cols-2">
            {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-2">{error}</p> : null}

            <label className="block text-sm font-semibold text-slate-800">
              {t.firstName}
              <RequiredMark />
              <input
                className={inputClass(firstNameInvalid, "mt-1")}
                required
                autoComplete="given-name"
                aria-invalid={firstNameInvalid || undefined}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t.lastName}
              <RequiredMark />
              <input
                className={inputClass(lastNameInvalid, "mt-1")}
                required
                autoComplete="family-name"
                aria-invalid={lastNameInvalid || undefined}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800 md:col-span-2">
              {t.email}
              <RequiredMark />
              <input
                type="email"
                className={inputClass(emailInvalid, "mt-1")}
                required
                autoComplete="email"
                aria-invalid={emailInvalid || undefined}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              {t.password}
              <RequiredMark />
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  className={inputClass(passwordInvalid, "pe-12")}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={passwordInvalid || undefined}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowPassword((open) => !open)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              {passwordTooShort ? (
                <span className="mt-1 block text-xs font-normal text-red-600">{t.passwordShort}</span>
              ) : null}
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              {t.confirmPassword}
              <RequiredMark />
              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={inputClass(confirmInvalid, "pe-12")}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-invalid={confirmInvalid || undefined}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
                  aria-label={showConfirmPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowConfirmPassword((open) => !open)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
              {passwordsDiffer ? <span className="mt-1 block text-xs font-normal text-red-600">{t.passwordsMismatch}</span> : null}
            </label>

            <fieldset className="md:col-span-2">
              <legend className="text-sm font-semibold text-slate-800">
                {t.entityType}
                <RequiredMark />
              </legend>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "COMPANY" as const, label: t.companyType, sub: t.companyHint },
                    { value: "PRIVATE" as const, label: t.privateType, sub: t.privateHint },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, kind: opt.value })}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-sm transition",
                      form.kind === opt.value
                        ? "border-sky-500 bg-sky-50 font-bold text-sky-900"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    <span className="block">{opt.label}</span>
                    <span className="block text-xs font-normal text-slate-500">{opt.sub}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-semibold text-slate-800">
              {form.kind === "COMPANY" ? t.companyTaxId : t.personalId}
              <RequiredMark />
              <input
                className={inputClass(idInvalid, "mt-1")}
                required
                aria-invalid={idInvalid || undefined}
                value={form.identificationNumber}
                onChange={(e) => setForm({ ...form, identificationNumber: e.target.value })}
              />
            </label>

            <PhoneCountryField
              label={t.primaryPhone}
              required
              invalid={phoneInvalid}
              iso2={form.phoneIso2}
              national={form.phoneNational}
              onIso2Change={(phoneIso2) => setForm({ ...form, phoneIso2 })}
              onNationalChange={(phoneNational) => setForm({ ...form, phoneNational })}
            />

            <div className="md:col-span-2">
              <SocialPlatformPicker
                compact
                invalid={messengersInvalid}
                selected={form.messengers}
                onChange={(messengers) => setForm({ ...form, messengers })}
              />
            </div>

            <label className="block text-sm font-semibold text-slate-800">
              {t.fleetSize}
              <RequiredMark />
              <input
                type="number"
                min={1}
                className={inputClass(fleetInvalid, "mt-1")}
                required
                aria-invalid={fleetInvalid || undefined}
                value={form.fleetSize}
                onChange={(e) => setForm({ ...form, fleetSize: e.target.value })}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-800">
              {t.fleetAge}
              <RequiredMark />
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-base font-normal"
                required
                value={form.fleetAgeRange}
                onChange={(e) => setForm({ ...form, fleetAgeRange: e.target.value })}
              >
                {FLEET_AGE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {fleetAgeLabel(r.value)}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2">
              <OperatingCountriesHover
                catalog="europe-asia"
                invalid={countriesInvalid}
                countryIso2s={form.countryIso2s}
                onChange={(countryIso2s) => setForm((prev) => ({ ...prev, countryIso2s }))}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-xl bg-[#22c55e] py-2.5 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400 md:col-span-2"
            >
              {loading ? t.submitting : t.submit}
            </button>

            <p className="text-center text-sm text-slate-600 md:col-span-2">
              {t.passedModerationPrompt}{" "}
              <a
                href={PARTNER_LOGIN}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-700 hover:underline"
                onClick={onClose}
              >
                {t.partnerLogin}
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
