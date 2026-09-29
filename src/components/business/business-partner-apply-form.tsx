"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReferralQrCard } from "@/components/business/referral-qr-card";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { MessengerLogo } from "@/components/partner/phone-messenger-icons";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import type { PartnerSocialPlatform } from "@/lib/partner";
import type { BusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";
import { usePreferences } from "@/components/providers/preferences-context";

const MESSENGER_OPTIONS: Array<{
  value: PartnerSocialPlatform;
  labelKey: "messengerWhatsapp" | "messengerViber" | "messengerTelegram";
}> = [
  { value: "WHATSAPP", labelKey: "messengerWhatsapp" },
  { value: "VIBER", labelKey: "messengerViber" },
  { value: "TELEGRAM", labelKey: "messengerTelegram" },
];

type InvalidField =
  | "fullName"
  | "email"
  | "password"
  | "passwordConfirm"
  | "phone"
  | "messengers"
  | "category"
  | "website"
  | "referralCode";

const inputBase =
  "mt-1 w-full rounded-md border px-3 py-2.5 text-sm font-normal outline-none transition";
const inputOk = "border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100";
const inputBad = "border-2 border-red-500 bg-red-50 ring-2 ring-red-200";

export function BusinessPartnerApplyForm({ t }: { t: BusinessPartnershipCopy }) {
  const { dictionary } = usePreferences();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [category, setCategory] = useState(t.categories[0] ?? "");
  const [phoneIso2, setPhoneIso2] = useState("GE");
  const [phoneNational, setPhoneNational] = useState("");
  const [messengers, setMessengers] = useState<PartnerSocialPlatform[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [website, setWebsite] = useState("");
  const [noWebsite, setNoWebsite] = useState(false);
  const [autoReferralCode, setAutoReferralCode] = useState(false);
  const [codeHint, setCodeHint] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [invalid, setInvalid] = useState<Set<InvalidField>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ code: string; url: string } | null>(null);

  const clearInvalid = (field: InvalidField) => {
    setInvalid((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const isBad = (field: InvalidField) => invalid.has(field);

  const checkCode = async (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setCodeHint("idle");
      return;
    }
    setCodeHint("checking");
    try {
      const res = await fetch(`/api/business-partners?code=${encodeURIComponent(value)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { available?: boolean; reason?: string };
      if (data.reason === "INVALID_CODE") setCodeHint("invalid");
      else if (data.available) {
        setCodeHint("ok");
        clearInvalid("referralCode");
      } else setCodeHint("taken");
    } catch {
      setCodeHint("idle");
    }
  };

  const toggleMessenger = (value: PartnerSocialPlatform) => {
    setMessengers((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
    clearInvalid("messengers");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const phone = formatInternationalPhone(phoneIso2, phoneNational);
    const nextInvalid = new Set<InvalidField>();
    if (!fullName.trim()) nextInvalid.add("fullName");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextInvalid.add("email");
    if (!isValidBusinessPartnerPassword(password)) nextInvalid.add("password");
    if (!passwordConfirm.trim() || password !== passwordConfirm) nextInvalid.add("passwordConfirm");
    if (!phone || phoneNational.replace(/\D/g, "").length < 5) nextInvalid.add("phone");
    if (messengers.length === 0) nextInvalid.add("messengers");
    if (!category.trim()) nextInvalid.add("category");
    if (!noWebsite && !website.trim()) nextInvalid.add("website");
    if (!autoReferralCode) {
      if (!referralCode.trim()) nextInvalid.add("referralCode");
      else if (codeHint === "taken" || codeHint === "invalid") nextInvalid.add("referralCode");
    }

    setInvalid(nextInvalid);
    if (nextInvalid.size > 0) {
      if (nextInvalid.has("messengers")) setError(t.messengersRequired);
      else if (nextInvalid.has("password")) setError(t.passwordHint);
      else if (nextInvalid.has("passwordConfirm")) setError(t.passwordMismatch);
      else if (nextInvalid.has("website")) setError(t.websiteRequired);
      else if (nextInvalid.has("referralCode")) {
        setError(
          codeHint === "taken"
            ? t.codeTaken
            : codeHint === "invalid"
              ? t.codeInvalid
              : t.referralCodeRequired,
        );
      } else setError(t.applyError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/business-partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone,
          messengers,
          category,
          website: noWebsite ? "" : website.trim(),
          notes: String(new FormData(e.currentTarget).get("notes") || ""),
          referralCode: autoReferralCode ? "" : referralCode.trim(),
          password,
          passwordConfirm,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        referralCode?: string;
        referralUrl?: string;
      };
      if (!res.ok) {
        if (data.code === "WEAK_PASSWORD") {
          setInvalid(new Set(["password"]));
          setError(t.passwordHint);
        } else if (data.code === "PASSWORD_MISMATCH") {
          setInvalid(new Set(["passwordConfirm"]));
          setError(t.passwordMismatch);
        } else if (data.code === "MESSENGERS_REQUIRED") {
          setInvalid(new Set(["messengers"]));
          setError(t.messengersRequired);
        } else if (data.code === "EMAIL_EXISTS") {
          setInvalid(new Set(["email"]));
          setError(data.error || t.applyError);
        } else {
          setError(data.error || t.applyError);
        }
        if (data.code === "CODE_TAKEN") setCodeHint("taken");
        return;
      }
      setSuccess({
        code: data.referralCode || "",
        url: data.referralUrl || "",
      });
      setFullName("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setPhoneIso2("GE");
      setPhoneNational("");
      setMessengers([]);
      setReferralCode("");
      setWebsite("");
      setNoWebsite(false);
      setAutoReferralCode(false);
      setCodeHint("idle");
      setInvalid(new Set());
      e.currentTarget.reset();
    } catch {
      setError(t.applyError);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mt-8 space-y-4">
        <ReferralQrCard
          code={success.code}
          referralUrl={success.url}
          title={t.successTitle}
          hint={t.successBody}
        />
        <button
          type="button"
          className="w-full rounded-md border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setSuccess(null)}
        >
          {t.registerAnother}
        </button>
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={(ev) => void onSubmit(ev)}
      noValidate
    >
      <label className="block text-sm font-semibold text-slate-700">
        {t.fullName}
        <input
          name="fullName"
          required
          value={fullName}
          onChange={(ev) => {
            setFullName(ev.target.value);
            clearInvalid("fullName");
          }}
          className={cn(inputBase, isBad("fullName") ? inputBad : inputOk)}
          aria-invalid={isBad("fullName") || undefined}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        {t.email}
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(ev) => {
            setEmail(ev.target.value);
            clearInvalid("email");
          }}
          className={cn(inputBase, isBad("email") ? inputBad : inputOk)}
          aria-invalid={isBad("email") || undefined}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        {t.password}
        <div className="relative mt-1">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(ev) => {
              setPassword(ev.target.value);
              clearInvalid("password");
            }}
            className={cn(inputBase, "mt-0 pe-10", isBad("password") ? inputBad : inputOk)}
            aria-invalid={isBad("password") || undefined}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={showPassword ? dictionary.partner.hidePassword : dictionary.partner.showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <span className="mt-1 block text-xs font-normal text-slate-500">{t.passwordHint}</span>
      </label>
      <label className="block text-sm font-semibold text-slate-700">
        {t.passwordConfirm}
        <div className="relative mt-1">
          <input
            name="passwordConfirm"
            type={showPasswordConfirm ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(ev) => {
              setPasswordConfirm(ev.target.value);
              clearInvalid("passwordConfirm");
            }}
            className={cn(inputBase, "mt-0 pe-10", isBad("passwordConfirm") ? inputBad : inputOk)}
            aria-invalid={isBad("passwordConfirm") || undefined}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPasswordConfirm((v) => !v)}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={showPasswordConfirm ? dictionary.partner.hidePassword : dictionary.partner.showPassword}
          >
            {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <div>
        <PhoneCountryField
          label={t.phone.replace(/\s*\*$/, "")}
          iso2={phoneIso2}
          national={phoneNational}
          required
          invalid={isBad("phone")}
          onIso2Change={(iso) => {
            setPhoneIso2(iso);
            clearInvalid("phone");
          }}
          onNationalChange={(v) => {
            setPhoneNational(v);
            clearInvalid("phone");
          }}
        />
        <fieldset
          className={cn(
            "mt-2 rounded-lg border px-2.5 py-2",
            isBad("messengers")
              ? "border-2 border-red-500 bg-red-50 ring-2 ring-red-200"
              : "border-slate-200 bg-slate-50/80",
          )}
        >
          <legend
            className={cn(
              "px-1 text-xs font-semibold",
              isBad("messengers") ? "text-red-600" : "text-slate-700",
            )}
          >
            {t.messengersLabel}
          </legend>
          <p className="mb-1.5 text-[11px] font-normal leading-snug text-slate-500">
            {t.messengersHint}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MESSENGER_OPTIONS.map((item) => {
              const checked = messengers.includes(item.value);
              const brand =
                item.value === "WHATSAPP"
                  ? {
                      on: "border-[#25D366] bg-[#25D366] text-white",
                      off: "border-[#25D366]/40 bg-white text-[#128C7E]",
                      icon: "bg-[#25D366] text-white",
                    }
                  : item.value === "VIBER"
                    ? {
                        on: "border-[#7360F2] bg-[#7360F2] text-white",
                        off: "border-[#7360F2]/40 bg-white text-[#7360F2]",
                        icon: "bg-[#7360F2] text-white",
                      }
                    : {
                        on: "border-[#2AABEE] bg-[#2AABEE] text-white",
                        off: "border-[#2AABEE]/40 bg-white text-[#229ED9]",
                        icon: "bg-[#2AABEE] text-white",
                      };
              return (
                <label
                  key={item.value}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-semibold leading-none",
                    checked ? brand.on : brand.off,
                    checked ? "ring-1 ring-slate-900/20" : "",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMessenger(item.value)}
                    className="h-3 w-3 shrink-0 rounded border-slate-300"
                  />
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded",
                      brand.icon,
                    )}
                  >
                    <MessengerLogo platform={item.value} />
                  </span>
                  {t[item.labelKey]}
                </label>
              );
            })}
          </div>
          {isBad("messengers") ? (
            <span className="mt-1.5 block text-[11px] font-semibold text-red-600">
              {t.messengersRequired}
            </span>
          ) : null}
        </fieldset>
      </div>

      <div>
        <p
          className={cn(
            "mb-2 text-sm font-semibold",
            isBad("category") ? "text-red-600" : "text-slate-700",
          )}
        >
          {t.categoryLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {t.categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item);
                clearInvalid("category");
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold",
                category === item
                  ? "border-[#1d6fe8] bg-[#1d6fe8] text-white"
                  : isBad("category")
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p
          className={cn(
            "mb-1 text-sm font-semibold",
            isBad("website") ? "text-red-600" : "text-slate-700",
          )}
        >
          {t.websiteOptional}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="website"
            type="url"
            value={website}
            disabled={noWebsite}
            onChange={(ev) => {
              setWebsite(ev.target.value);
              clearInvalid("website");
            }}
            placeholder={noWebsite ? "" : "https://"}
            className={cn(
              "w-full flex-1 rounded-md border px-3 py-2.5 text-sm font-normal disabled:bg-slate-50 disabled:text-slate-400",
              isBad("website") ? inputBad : "border-slate-300",
            )}
            aria-invalid={isBad("website") || undefined}
          />
          <label
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 sm:whitespace-nowrap",
              noWebsite ? "border-[#1d6fe8]" : "border-slate-200",
            )}
          >
            <input
              type="checkbox"
              checked={noWebsite}
              onChange={(ev) => {
                const checked = ev.target.checked;
                setNoWebsite(checked);
                if (checked) {
                  setWebsite("");
                  clearInvalid("website");
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-[#1d6fe8] focus:ring-[#1d6fe8]"
            />
            {t.noWebsite}
          </label>
        </div>
      </div>
      <div>
        <p
          className={cn(
            "mb-1 text-sm font-semibold",
            isBad("referralCode") ? "text-red-600" : "text-slate-700",
          )}
        >
          {t.referralCodeLabel}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="referralCode"
            value={referralCode}
            disabled={autoReferralCode}
            onChange={(ev) => {
              setReferralCode(ev.target.value);
              setCodeHint("idle");
              clearInvalid("referralCode");
            }}
            onBlur={() => {
              if (!autoReferralCode) void checkCode(referralCode);
            }}
            placeholder={autoReferralCode ? "" : t.referralCodePlaceholder}
            autoComplete="off"
            className={cn(
              "w-full flex-1 rounded-md border px-3 py-2.5 text-sm font-normal uppercase tracking-wide disabled:bg-slate-50 disabled:text-slate-400",
              isBad("referralCode") ? inputBad : "border-slate-300",
            )}
            aria-invalid={isBad("referralCode") || undefined}
          />
          <label
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 sm:whitespace-nowrap",
              autoReferralCode ? "border-[#1d6fe8]" : "border-slate-200",
            )}
          >
            <input
              type="checkbox"
              checked={autoReferralCode}
              onChange={(ev) => {
                const checked = ev.target.checked;
                setAutoReferralCode(checked);
                if (checked) {
                  setReferralCode("");
                  setCodeHint("idle");
                  clearInvalid("referralCode");
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-[#1d6fe8] focus:ring-[#1d6fe8]"
            />
            {t.autoReferralCode}
          </label>
        </div>
        {!autoReferralCode ? (
          <>
            <span className="mt-1 block text-xs font-normal text-slate-500">{t.referralCodeHint}</span>
            {codeHint === "checking" ? (
              <span className="mt-1 block text-xs text-slate-500">{t.codeChecking}</span>
            ) : null}
            {codeHint === "ok" ? (
              <span className="mt-1 block text-xs font-semibold text-emerald-700">{t.codeAvailable}</span>
            ) : null}
            {codeHint === "taken" ? (
              <span className="mt-1 block text-xs font-semibold text-rose-600">{t.codeTaken}</span>
            ) : null}
            {codeHint === "invalid" ? (
              <span className="mt-1 block text-xs font-semibold text-rose-600">{t.codeInvalid}</span>
            ) : null}
          </>
        ) : (
          <span className="mt-1 block text-xs font-normal text-slate-500">{t.autoReferralCodeHint}</span>
        )}
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        {t.notesOptional}
        <textarea
          name="notes"
          rows={4}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={
          submitting ||
          (!autoReferralCode && (codeHint === "taken" || codeHint === "invalid"))
        }
        className="w-full rounded-md bg-[#1d6fe8] py-3 text-sm font-bold text-white hover:bg-[#1557c0] disabled:opacity-60"
      >
        {submitting ? t.submitting : t.sendApplication}
      </button>
    </form>
  );
}
