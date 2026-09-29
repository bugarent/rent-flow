"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FLEET_AGE_RANGES, parsePartnerMessengers, type PartnerSocialPlatform } from "@/lib/partner";
import { PARTNER_LOGIN } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { formatInternationalPhone, splitStoredPhone } from "@/lib/catalog/dial-codes";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { SocialPlatformPicker } from "@/components/partner/social-platform-picker";
import { OperatingCountriesHover } from "@/components/partner/operating-countries-hover";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

export function PartnerInviteRegisterForm({ token }: { token: string }) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const auth = dictionary.auth;
  const [booting, setBooting] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    kind: "COMPANY" as "COMPANY" | "PRIVATE",
    identificationNumber: "",
    fleetSize: "1",
    fleetAgeRange: "AGE_0_5",
    phoneIso2: "GE",
    phoneNational: "",
    secondaryPhoneIso2: "GE",
    secondaryPhoneNational: "",
    messengers: [] as PartnerSocialPlatform[],
    logoUrl: "",
    countryIso2s: [] as string[],
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/partners/register?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.invalidInvite);
        if (cancelled) return;
        const primary = splitStoredPhone(data.phone, data.phoneCountryIso2 || "GE");
        const secondary = splitStoredPhone(data.secondaryPhone, data.secondaryPhoneCountryIso2 || primary.iso2);
        setForm((prev) => ({
          ...prev,
          email: data.email ?? "",
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          kind: data.kind === "PRIVATE" ? "PRIVATE" : "COMPANY",
          identificationNumber: data.identificationNumber ?? "",
          fleetSize: String(data.fleetSize ?? 1),
          fleetAgeRange: data.fleetAgeRange ?? "AGE_0_5",
          phoneIso2: data.phoneCountryIso2 || primary.iso2,
          phoneNational: primary.national,
          secondaryPhoneIso2: data.secondaryPhoneCountryIso2 || secondary.iso2,
          secondaryPhoneNational: secondary.national,
          messengers: parsePartnerMessengers(data.messengers, data.messenger),
          logoUrl: data.logoUrl ?? "",
          countryIso2s: Array.isArray(data.countryIso2s) ? data.countryIso2s : [],
        }));
        setFeedbackNote(data.feedbackNote ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t.invalidInvite);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onLogoFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError(t.logoSize);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.messengers.length) {
      setError(t.messengersRequired);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t.passwordsMismatch);
      return;
    }
    if (!form.countryIso2s.length) {
      setError(t.countriesRequired);
      return;
    }
    if (!form.logoUrl.trim()) {
      setError(t.logoRequired);
      return;
    }
    const phone = formatInternationalPhone(form.phoneIso2, form.phoneNational);
    const secondaryPhone = formatInternationalPhone(form.secondaryPhoneIso2, form.secondaryPhoneNational);
    if (!phone || !secondaryPhone) {
      setError(t.bothPhonesRequired);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          kind: form.kind,
          identificationNumber: form.identificationNumber.trim(),
          fleetSize: Number(form.fleetSize),
          fleetAgeRange: form.fleetAgeRange,
          phone,
          phoneCountryIso2: form.phoneIso2,
          secondaryPhone,
          secondaryPhoneCountryIso2: form.secondaryPhoneIso2,
          messengers: form.messengers,
          logoUrl: form.logoUrl.trim(),
          countryIso2s: form.countryIso2s,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.fillAll);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.fillAll);
    } finally {
      setLoading(false);
    }
  };

  if (booting) {
    return <p className="p-10 text-center text-slate-500">{t.loading}</p>;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center">
          <BrandLogo />
        </Link>
      </header>

      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-16">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-2xl font-extrabold text-[#0b1f4b]">{t.partnerRegistration}</h1>
          <p className="mb-5 text-sm text-slate-500">{t.inviteHint}</p>

          {feedbackNote ? (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-bold">{t.adminFeedback}</p>
              <p className="mt-1">{feedbackNote}</p>
            </div>
          ) : null}

          {ok ? (
            <div className="space-y-3 text-center">
              <p className="text-lg font-bold text-emerald-800">{t.registrationSubmitted}</p>
              <p className="text-sm text-slate-600">{t.registrationSubmittedBody}</p>
              <Link href={PARTNER_LOGIN} className="inline-block font-semibold text-sky-700 hover:underline">
                {t.goToPartnerLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

              <label className="block text-sm font-semibold">
                {t.email}
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border p-3 font-normal"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label className="block text-sm font-semibold">
                {auth.password}
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-lg border p-3 pe-12 font-normal"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-0 px-3 text-xs font-semibold text-slate-500"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? t.hidePassword : t.showPassword}
                  </button>
                </div>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {t.passwordHint}
                </span>
              </label>

              <label className="block text-sm font-semibold">
                {auth.confirmPassword}
                <input
                  type={showPassword ? "text" : "password"}
                  className="mt-1 w-full rounded-lg border p-3 font-normal"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  {t.firstName}
                  <input
                    className="mt-1 w-full rounded-lg border p-3 font-normal"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t.lastName}
                  <input
                    className="mt-1 w-full rounded-lg border p-3 font-normal"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </label>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold">{t.entityType}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "COMPANY", label: t.companyType },
                      { value: "PRIVATE", label: t.privateType },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, kind: opt.value })}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-semibold",
                        form.kind === opt.value ? "border-sky-500 bg-sky-50 text-sky-900" : "bg-white",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-semibold">
                {form.kind === "COMPANY" ? t.companyTaxId : t.personalId}
                <input
                  className="mt-1 w-full rounded-lg border p-3 font-normal"
                  required
                  value={form.identificationNumber}
                  onChange={(e) => setForm({ ...form, identificationNumber: e.target.value })}
                />
              </label>

              <PhoneCountryField
                label={t.primaryPhone}
                required
                iso2={form.phoneIso2}
                national={form.phoneNational}
                onIso2Change={(phoneIso2) => setForm({ ...form, phoneIso2 })}
                onNationalChange={(phoneNational) => setForm({ ...form, phoneNational })}
              >
                <SocialPlatformPicker
                  compact
                  selected={form.messengers}
                  onChange={(messengers) => setForm({ ...form, messengers })}
                />
              </PhoneCountryField>

              <PhoneCountryField
                label={t.secondaryPhone}
                required
                iso2={form.secondaryPhoneIso2}
                national={form.secondaryPhoneNational}
                onIso2Change={(secondaryPhoneIso2) => setForm({ ...form, secondaryPhoneIso2 })}
                onNationalChange={(secondaryPhoneNational) => setForm({ ...form, secondaryPhoneNational })}
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  {t.fleetSize}
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-lg border p-3 font-normal"
                    required
                    value={form.fleetSize}
                    onChange={(e) => setForm({ ...form, fleetSize: e.target.value })}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  {t.fleetAge}
                  <select
                    className="mt-1 w-full rounded-lg border p-3 font-normal"
                    value={form.fleetAgeRange}
                    onChange={(e) => setForm({ ...form, fleetAgeRange: e.target.value })}
                  >
                    {FLEET_AGE_RANGES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value === "AGE_0_5" ? t.fleetAge0_5 : r.value === "AGE_6_9" ? t.fleetAge6_9 : t.fleetAge10}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <OperatingCountriesHover
                countryIso2s={form.countryIso2s}
                onChange={(countryIso2s) => setForm((prev) => ({ ...prev, countryIso2s }))}
              />

              <label className="block text-sm font-semibold">
                {t.logoUpload}
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm font-normal"
                  onChange={(e) => onLogoFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover" />
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-lg bg-[#22c55e] py-3 font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
              >
                {loading ? t.submitting : t.completeRegistration}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          {t.alreadyApproved}{" "}
          <Link href={PARTNER_LOGIN} className="font-semibold text-[#22c55e] hover:underline">
            {dictionary.nav.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
