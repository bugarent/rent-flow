"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_PARTNER_CATEGORIES } from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { MessengerLogo } from "@/components/partner/phone-messenger-icons";
import type { PartnerSocialPlatform } from "@/lib/partner";
import {
  normalizePayoutMethod,
  validateIban,
  validatePaypalAccount,
  validatePayoutPreferences,
  validateSwiftBic,
  type BusinessPartnerPayoutMethod,
} from "@/lib/business-partner/payout-validation";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";
import { buildReferralAbsoluteUrl } from "@/lib/business-partner/codes";

const SECTION_HEAD = "#d9e2e8";
const inputClass =
  "w-full rounded-md border border-[#c5ced8] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none focus:border-[#5b4a8a] focus:ring-2 focus:ring-[#5b4a8a]/20";
const inputOkClass = "border-emerald-500 bg-emerald-50/40 focus:border-emerald-600 focus:ring-emerald-400/30";
const inputBadClass = "border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-400/40";

const MESSENGER_OPTIONS: PartnerSocialPlatform[] = ["WHATSAPP", "VIBER", "TELEGRAM"];

export type CabinetProfilePartner = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  messengers: string[];
  category: string;
  website: string;
  notes: string;
  personalId: string;
  payoutMethod: BusinessPartnerPayoutMethod;
  payoutAccount: string;
  payoutSwift: string;
  paypalAccount: string;
  referralCode: string;
  status: string;
  countryIso2: string;
  referralBookings: number;
  earnedUsd: number;
  paidUsd: number;
  unpaidUsd: number;
};

export type CabinetProfileLabels = {
  mainInfo: string;
  firstName: string;
  lastName: string;
  personalId: string;
  payoutMethod: string;
  payoutMethodBank: string;
  payoutMethodPaypal: string;
  payoutAccount: string;
  payoutAccountHint: string;
  payoutSwift: string;
  payoutSwiftHint: string;
  paypalAccount: string;
  paypalAccountHint: string;
  payoutValid: string;
  payoutInvalidIban: string;
  payoutInvalidSwift: string;
  payoutInvalidPaypal: string;
  email: string;
  phone: string;
  category: string;
  country: string;
  website: string;
  status: string;
  statusActive: string;
  statusInactive: string;
  messengers: string;
  login: string;
  oldPassword: string;
  newPassword: string;
  passwordHint: string;
  passwordWrong: string;
  passwordUpdated: string;
  save: string;
  saving: string;
  saved: string;
  nameRequired: string;
  idsRequired: string;
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function joinFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="block text-sm">
      <span className="mb-1.5 block font-semibold text-[#3a4553]">
        {label}
        {required ? <span className="text-[#e11d48]"> *</span> : null}
      </span>
      {children}
    </div>
  );
}

function ValidatedInput({
  value,
  onChange,
  state,
  autoCapitalize,
}: {
  value: string;
  onChange: (v: string) => void;
  state: "idle" | "ok" | "bad";
  autoCapitalize?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        className={cn(
          inputClass,
          "pr-16",
          state === "ok" && inputOkClass,
          state === "bad" && inputBadClass,
        )}
        value={value}
        onChange={(e) =>
          onChange(autoCapitalize ? e.target.value.toUpperCase() : e.target.value)
        }
      />
      <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
        {state === "ok" ? <Check className="h-4 w-4 text-emerald-600" aria-hidden /> : null}
        {state === "bad" ? <AlertCircle className="h-4 w-4 text-red-600" aria-hidden /> : null}
        {value ? (
          <button
            type="button"
            aria-label="Clear"
            className="flex items-center px-1 text-slate-400 hover:text-slate-700"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ClearableInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        readOnly={readOnly}
        className={cn(inputClass, readOnly && "bg-slate-50 text-slate-600", !readOnly && "pr-9")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {!readOnly && value ? (
        <button
          type="button"
          aria-label="Clear"
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-700"
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function BusinessPartnerCabinetProfile({
  partner,
  labels,
  referralUrl,
  onUpdated,
}: {
  partner: CabinetProfilePartner;
  labels: CabinetProfileLabels;
  referralUrl?: string;
  onUpdated: (partner: CabinetProfilePartner) => void;
}) {
  const initial = splitFullName(partner.fullName);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [personalId, setPersonalId] = useState(partner.personalId || "");
  const [payoutMethod, setPayoutMethod] = useState<BusinessPartnerPayoutMethod>(
    normalizePayoutMethod(partner.payoutMethod),
  );
  const [payoutAccount, setPayoutAccount] = useState(partner.payoutAccount || "");
  const [payoutSwift, setPayoutSwift] = useState(partner.payoutSwift || "");
  const [paypalAccount, setPaypalAccount] = useState(partner.paypalAccount || "");
  const [phone, setPhone] = useState(partner.phone);
  const [category, setCategory] = useState(partner.category);
  const [website, setWebsite] = useState(partner.website || "");
  const [messengers, setMessengers] = useState<string[]>(partner.messengers || []);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordOk, setPasswordOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [touchedPayout, setTouchedPayout] = useState(false);

  useEffect(() => {
    const next = splitFullName(partner.fullName);
    setFirstName(next.firstName);
    setLastName(next.lastName);
    setPersonalId(partner.personalId || "");
    setPayoutMethod(normalizePayoutMethod(partner.payoutMethod));
    setPayoutAccount(partner.payoutAccount || "");
    setPayoutSwift(partner.payoutSwift || "");
    setPaypalAccount(partner.paypalAccount || "");
    setPhone(partner.phone);
    setCategory(partner.category);
    setWebsite(partner.website || "");
    setMessengers(partner.messengers || []);
    setTouchedPayout(false);
  }, [partner]);

  const countryLabel = partner.countryIso2
    ? worldCountryName(partner.countryIso2) || partner.countryIso2
    : "—";

  const ibanState = useMemo(() => {
    if (!payoutAccount.trim()) return "idle" as const;
    return validateIban(payoutAccount).ok ? ("ok" as const) : ("bad" as const);
  }, [payoutAccount]);

  const swiftState = useMemo(() => {
    if (!payoutSwift.trim()) return "idle" as const;
    return validateSwiftBic(payoutSwift).ok ? ("ok" as const) : ("bad" as const);
  }, [payoutSwift]);

  const paypalState = useMemo(() => {
    if (!paypalAccount.trim()) return "idle" as const;
    return validatePaypalAccount(paypalAccount).ok ? ("ok" as const) : ("bad" as const);
  }, [paypalAccount]);

  const payoutOk = useMemo(
    () =>
      validatePayoutPreferences({
        payoutMethod,
        payoutAccount,
        payoutSwift,
        paypalAccount,
      }).ok,
    [payoutMethod, payoutAccount, payoutSwift, paypalAccount],
  );

  const toggleMessenger = (value: PartnerSocialPlatform) => {
    setMessengers((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    );
    setOk(false);
  };

  const onSavePassword = async () => {
    setPasswordError("");
    setPasswordOk(false);
    if (!isValidBusinessPartnerPassword(newPassword)) {
      setPasswordError(labels.passwordHint);
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch("/api/business-partners/session/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword,
        }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "INVALID_PASSWORD") setPasswordError(labels.passwordWrong);
        else if (data.code === "WEAK_PASSWORD") setPasswordError(labels.passwordHint);
        else setPasswordError(data.error || "—");
        return;
      }
      setOldPassword("");
      setNewPassword("");
      setPasswordOk(true);
    } catch {
      setPasswordError("—");
    } finally {
      setPasswordBusy(false);
    }
  };

  const onSave = async () => {
    const fullName = joinFullName(firstName, lastName);
    setTouchedPayout(true);
    if (!firstName.trim() || !lastName.trim()) {
      setError(labels.nameRequired);
      return;
    }
    if (!personalId.trim()) {
      setError(labels.idsRequired);
      return;
    }
    const payout = validatePayoutPreferences({
      payoutMethod,
      payoutAccount,
      payoutSwift,
      paypalAccount,
    });
    if (!payout.ok) {
      if (payout.errorCode === "INVALID_IBAN") setError(labels.payoutInvalidIban);
      else if (payout.errorCode === "INVALID_SWIFT") setError(labels.payoutInvalidSwift);
      else if (payout.errorCode === "INVALID_PAYPAL") setError(labels.payoutInvalidPaypal);
      else setError(labels.idsRequired);
      return;
    }

    setBusy(true);
    setError("");
    setOk(false);
    try {
      const res = await fetch("/api/business-partners/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          category,
          website,
          notes: partner.notes || "",
          personalId,
          payoutMethod: payout.method,
          payoutAccount: payout.payoutAccount,
          payoutSwift: payout.payoutSwift,
          paypalAccount: payout.paypalAccount,
          messengers,
        }),
      });
      const data = (await res.json()) as {
        partner?: CabinetProfilePartner;
        error?: string;
      };
      if (!res.ok || !data.partner) {
        setError(data.error || "Update failed");
        return;
      }
      onUpdated({
        ...data.partner,
        payoutMethod: normalizePayoutMethod(data.partner.payoutMethod),
        payoutSwift: data.partner.payoutSwift || "",
        paypalAccount: data.partner.paypalAccount || "",
      });
      setOk(true);
    } catch {
      setError("Update failed");
    } finally {
      setBusy(false);
    }
  };

  const isActive = String(partner.status || "").toUpperCase() === "ACTIVE";
  const statusLabel = isActive ? labels.statusActive : labels.statusInactive;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://rentairportcars.com";
  const promoUrl = referralUrl || buildReferralAbsoluteUrl(origin, partner.referralCode);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=4&data=${encodeURIComponent(promoUrl)}`;

  return (
    <section className="overflow-hidden rounded-lg border border-[#d5dde6] bg-white shadow-sm">
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd8e3] px-5 py-3.5 text-[15px] font-bold tracking-wide text-[#2a3340]"
        style={{ backgroundColor: SECTION_HEAD }}
      >
        <span>{labels.mainInfo}</span>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
              isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600",
            )}
          >
            {labels.status}: {statusLabel}
          </span>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm"
            />
            <span className="shrink-0 font-mono text-lg font-black tracking-wider text-[#0b5c2e] sm:text-xl">
              {partner.referralCode}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-5 bg-[#fbfcfd] px-5 py-5 sm:px-7 sm:py-6">
        <p className="text-sm font-bold text-slate-700">{labels.mainInfo}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={labels.firstName} required>
            <ClearableInput
              value={firstName}
              onChange={(v) => {
                setFirstName(v);
                setOk(false);
                setError("");
              }}
            />
          </Field>
          <Field label={labels.lastName} required>
            <ClearableInput
              value={lastName}
              onChange={(v) => {
                setLastName(v);
                setOk(false);
                setError("");
              }}
            />
          </Field>
        </div>

        <Field label={labels.personalId} required>
          <ClearableInput
            value={personalId}
            onChange={(v) => {
              setPersonalId(v);
              setOk(false);
            }}
          />
        </Field>

        <Field label={labels.payoutMethod} required>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["BANK", labels.payoutMethodBank],
                ["PAYPAL", labels.payoutMethodPaypal],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPayoutMethod(value);
                  setTouchedPayout(true);
                  setOk(false);
                  setError("");
                }}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs font-bold transition",
                  payoutMethod === value
                    ? "border-[#0b1f4b] bg-[#0b1f4b] text-white"
                    : "border-[#c5ced8] bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {payoutMethod === "BANK" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={labels.payoutAccount} required>
              <ValidatedInput
                value={payoutAccount}
                state={touchedPayout || payoutAccount ? ibanState : "idle"}
                autoCapitalize
                onChange={(v) => {
                  setPayoutAccount(v);
                  setTouchedPayout(true);
                  setOk(false);
                  setError("");
                }}
              />
              <p
                className={cn(
                  "mt-1 text-xs",
                  ibanState === "ok" && "font-semibold text-emerald-700",
                  ibanState === "bad" && "font-semibold text-red-600",
                  ibanState === "idle" && "text-slate-500",
                )}
              >
                {ibanState === "ok"
                  ? labels.payoutValid
                  : ibanState === "bad"
                    ? labels.payoutInvalidIban
                    : labels.payoutAccountHint}
              </p>
            </Field>
            <Field label={labels.payoutSwift} required>
              <ValidatedInput
                value={payoutSwift}
                state={touchedPayout || payoutSwift ? swiftState : "idle"}
                autoCapitalize
                onChange={(v) => {
                  setPayoutSwift(v);
                  setTouchedPayout(true);
                  setOk(false);
                  setError("");
                }}
              />
              <p
                className={cn(
                  "mt-1 text-xs",
                  swiftState === "ok" && "font-semibold text-emerald-700",
                  swiftState === "bad" && "font-semibold text-red-600",
                  swiftState === "idle" && "text-slate-500",
                )}
              >
                {swiftState === "ok"
                  ? labels.payoutValid
                  : swiftState === "bad"
                    ? labels.payoutInvalidSwift
                    : labels.payoutSwiftHint}
              </p>
            </Field>
          </div>
        ) : (
          <Field label={labels.paypalAccount} required>
            <ValidatedInput
              value={paypalAccount}
              state={touchedPayout || paypalAccount ? paypalState : "idle"}
              onChange={(v) => {
                setPaypalAccount(v);
                setTouchedPayout(true);
                setOk(false);
                setError("");
              }}
            />
            <p
              className={cn(
                "mt-1 text-xs",
                paypalState === "ok" && "font-semibold text-emerald-700",
                paypalState === "bad" && "font-semibold text-red-600",
                paypalState === "idle" && "text-slate-500",
              )}
            >
              {paypalState === "ok"
                ? labels.payoutValid
                : paypalState === "bad"
                  ? labels.payoutInvalidPaypal
                  : labels.paypalAccountHint}
            </p>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={labels.country}>
            <input
              className={cn(inputClass, "bg-slate-50 text-slate-600")}
              value={countryLabel}
              readOnly
            />
          </Field>
          <Field label={labels.category} required>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setOk(false);
              }}
            >
              {BUSINESS_PARTNER_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              {!BUSINESS_PARTNER_CATEGORIES.includes(
                category as (typeof BUSINESS_PARTNER_CATEGORIES)[number],
              ) && category ? (
                <option value={category}>{category}</option>
              ) : null}
            </select>
          </Field>
        </div>

        <Field label={labels.email} required>
          <ClearableInput value={partner.email} onChange={() => {}} readOnly />
        </Field>

        <Field label={labels.phone} required>
          <ClearableInput
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setOk(false);
            }}
          />
        </Field>

        <Field label={labels.website}>
          <ClearableInput
            value={website}
            onChange={(v) => {
              setWebsite(v);
              setOk(false);
            }}
          />
        </Field>

        <Field label={labels.messengers} required>
          <div className="flex flex-wrap gap-2">
            {MESSENGER_OPTIONS.map((m) => {
              const on = messengers.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMessenger(m)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-bold transition",
                    on
                      ? "border-[#0b1f4b] bg-[#0b1f4b] text-white"
                      : "border-[#c5ced8] bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <MessengerLogo platform={m} />
                  {m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="space-y-3 rounded-md border border-[#c5ced8] bg-slate-50/60 p-3">
          <Field label={labels.login}>
            <ClearableInput value={partner.email} onChange={() => undefined} readOnly />
          </Field>
          <Field label={labels.oldPassword} required>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                setPasswordOk(false);
                setPasswordError("");
              }}
            />
          </Field>
          <Field label={labels.newPassword} required>
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setPasswordOk(false);
                setPasswordError("");
              }}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              {labels.passwordHint}
            </span>
          </Field>
          {passwordError ? (
            <p className="text-sm font-semibold text-rose-600">{passwordError}</p>
          ) : null}
          {passwordOk ? (
            <p className="text-sm font-semibold text-emerald-700">{labels.passwordUpdated}</p>
          ) : null}
          <button
            type="button"
            disabled={passwordBusy || !oldPassword || !newPassword}
            onClick={() => void onSavePassword()}
            className="rounded-md bg-[#0b1f4b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#152a5c] disabled:opacity-60"
          >
            {passwordBusy ? labels.saving : labels.save}
          </button>
        </div>

        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
        {ok ? <p className="text-sm font-semibold text-emerald-700">{labels.saved}</p> : null}

        <button
          type="button"
          disabled={busy || !payoutOk || !personalId.trim()}
          onClick={() => void onSave()}
          className="rounded-md bg-[#0b1f4b] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#152a5c] disabled:opacity-60"
        >
          {busy ? labels.saving : labels.save}
        </button>
      </div>
    </section>
  );
}
