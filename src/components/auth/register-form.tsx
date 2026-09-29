"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { OtpModal } from "@/components/auth/otp-modal";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { SocialPlatformPicker } from "@/components/partner/social-platform-picker";
import { usePreferences } from "@/components/providers/preferences-context";
import { formatInternationalPhone, nationalDigits } from "@/lib/catalog/dial-codes";
import type { PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    phoneIso2: z.string().length(2),
    phoneNational: z.string().trim().min(4),
    email: z.string().email(),
    messengers: z.array(z.enum(["WHATSAPP", "VIBER", "TELEGRAM"])).min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"] })
  .refine((d) => nationalDigits(d.phoneNational).length >= 6, { path: ["phone"] });

type Props = {
  embedded?: boolean;
  onSwitchToLogin?: () => void;
};

export function RegisterForm({ embedded = false, onSwitchToLogin }: Props) {
  const router = useRouter();
  const { dictionary, locale } = usePreferences();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneIso2: "GE",
    phoneNational: "",
    email: "",
    messengers: [] as PartnerSocialPlatform[],
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const clearError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setText =
    (key: "firstName" | "lastName" | "email" | "password" | "confirmPassword" | "phoneNational") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      clearError(key);
      if (key === "phoneNational") clearError("phone");
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        next[key] =
          key === "confirmPassword"
            ? dictionary.auth.passwordsMismatch
            : key === "email"
              ? dictionary.auth.invalidEmail
              : key === "password"
                ? dictionary.auth.passwordMinLength
              : key === "phone" || key === "phoneNational"
                ? dictionary.auth.invalidPhone
                : key === "messengers"
                  ? dictionary.partner.messengersRequired
                  : dictionary.auth.required;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const phone = formatInternationalPhone(parsed.data.phoneIso2, parsed.data.phoneNational);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone,
          phoneCountryIso2: parsed.data.phoneIso2,
          email: parsed.data.email,
          messengers: parsed.data.messengers,
          password: parsed.data.password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || dictionary.auth.registrationFailed);
      setUserId(data.userId);
      setOtpHint(typeof data.otpPreview === "string" ? data.otpPreview : "");
      setOtpOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : dictionary.auth.registrationFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setOtpError("");
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || dictionary.auth.invalidCode);
      setOtpOpen(false);
      if (onSwitchToLogin) {
        onSwitchToLogin();
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : dictionary.auth.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (key: string) =>
    cn(
      "mt-1 w-full rounded-xl border p-3 font-normal outline-none transition",
      fieldErrors[key]
        ? "border-red-500 bg-red-50 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200"
        : "border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
    );

  return (
    <div className={embedded ? "" : "mx-auto w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm"}>
      {!embedded ? <h1 className="mb-6 text-2xl font-bold text-slate-900">{dictionary.auth.registerTitle}</h1> : null}
      {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <label className="text-sm font-semibold text-slate-700">
          {dictionary.auth.firstName}
          <input className={inputClass("firstName")} value={form.firstName} onChange={setText("firstName")} />
          {fieldErrors.firstName ? (
            <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.firstName}</span>
          ) : null}
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {dictionary.auth.lastName}
          <input className={inputClass("lastName")} value={form.lastName} onChange={setText("lastName")} />
          {fieldErrors.lastName ? (
            <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.lastName}</span>
          ) : null}
        </label>

        <div className="sm:col-span-2">
          <PhoneCountryField
            label={dictionary.auth.phone}
            iso2={form.phoneIso2}
            national={form.phoneNational}
            required
            invalid={Boolean(fieldErrors.phone || fieldErrors.phoneNational)}
            onIso2Change={(iso2) => {
              setForm((prev) => ({ ...prev, phoneIso2: iso2 }));
              clearError("phone");
            }}
            onNationalChange={(national) => {
              setForm((prev) => ({ ...prev, phoneNational: national }));
              clearError("phone");
              clearError("phoneNational");
            }}
          >
            <SocialPlatformPicker
              compact
              invalid={Boolean(fieldErrors.messengers)}
              selected={form.messengers}
              onChange={(messengers) => {
                setForm((prev) => ({ ...prev, messengers }));
                clearError("messengers");
              }}
            />
          </PhoneCountryField>
          {fieldErrors.phone || fieldErrors.phoneNational ? (
            <span className="mt-1 block text-xs font-normal text-red-600">
              {fieldErrors.phone || fieldErrors.phoneNational}
            </span>
          ) : null}
        </div>

        <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
          {dictionary.auth.email}
          <input
            type="email"
            className={inputClass("email")}
            value={form.email}
            onChange={setText("email")}
            autoComplete="email"
          />
          {fieldErrors.email ? <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.email}</span> : null}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          {dictionary.auth.password}
          <input
            type="password"
            className={inputClass("password")}
            value={form.password}
            onChange={setText("password")}
            autoComplete="new-password"
          />
          {fieldErrors.password ? (
            <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.password}</span>
          ) : null}
        </label>
        <label className="text-sm font-semibold text-slate-700">
          {dictionary.auth.confirmPassword}
          <input
            type="password"
            className={inputClass("confirmPassword")}
            value={form.confirmPassword}
            onChange={setText("confirmPassword")}
            autoComplete="new-password"
          />
          {fieldErrors.confirmPassword ? (
            <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.confirmPassword}</span>
          ) : null}
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-sky-600 py-3 font-bold text-white disabled:bg-slate-400 sm:col-span-2"
        >
          {dictionary.auth.submitRegister}
        </button>
      </form>
      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onVerify={handleVerify}
        loading={loading}
        error={otpError}
        hint={otpHint}
      />
    </div>
  );
}
