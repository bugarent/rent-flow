"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Copy = {
  title: string;
  amountLabel: string;
  sandboxBadge: string;
  sandboxHint: string;
  emailLabel: string;
  emailPlaceholder: string;
  confirmCta: string;
  backLabel: string;
  processing: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "PayPal Business",
    amountLabel: "Amount due now",
    sandboxBadge: "Sandbox · test mode",
    sandboxHint:
      "No real money is charged. Confirm below to complete and activate the booking in test mode.",
    emailLabel: "PayPal account email",
    emailPlaceholder: "buyer@example.com",
    confirmCta: "Confirm PayPal payment (test)",
    backLabel: "Back to driver details",
    processing: "Confirming…",
  },
  ka: {
    title: "PayPal Business",
    amountLabel: "გადასახდელი თანხა ახლა",
    sandboxBadge: "Sandbox · სატესტო რეჟიმი",
    sandboxHint:
      "რეალური თანხა არ ჩამოიჭრება. დაადასტურეთ ქვემოთ — ჯავშანი გააქტიურდება სატესტო რეჟიმში.",
    emailLabel: "PayPal ანგარიშის ელფოსტა",
    emailPlaceholder: "buyer@example.com",
    confirmCta: "PayPal გადახდის დადასტურება (ტესტი)",
    backLabel: "დაბრუნება მძღოლის დეტალებზე",
    processing: "მიმდინარეობს…",
  },
  ru: {
    title: "PayPal Business",
    amountLabel: "К оплате сейчас",
    sandboxBadge: "Sandbox · тестовый режим",
    sandboxHint:
      "Реальные средства не списываются. Подтвердите ниже — бронь активируется в тестовом режиме.",
    emailLabel: "Email аккаунта PayPal",
    emailPlaceholder: "buyer@example.com",
    confirmCta: "Подтвердить оплату PayPal (тест)",
    backLabel: "Назад к данным водителя",
    processing: "Подтверждение…",
  },
};

function PaypalMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#003087"
        d="M7.2 20.4 8.1 14.7H5.4L7.05 4.2h5.7c2.55 0 4.35 1.05 4.05 3.6-.45 3.75-3.15 5.85-6.45 5.85H8.85l-.9 5.55H5.4l1.8 1.2Z"
        opacity="0.35"
      />
      <path
        fill="#009CDE"
        d="M9.15 18.6 9.9 13.8H7.5L8.85 5.4h4.95c1.95 0 3.3.75 3.15 2.7-.3 2.7-2.25 4.35-4.8 4.35H10.5l-.75 4.65H7.2l1.95 1.5Z"
      />
    </svg>
  );
}

export function CheckoutPaypalSandbox({
  amountLabel,
  locale,
  guestEmail,
  loading,
  onConfirm,
  onBack,
  backLabel,
}: {
  amountLabel: string;
  locale: string;
  guestEmail?: string;
  loading?: boolean;
  onConfirm: (paypalEmail: string) => void | Promise<void>;
  onBack: () => void;
  /** Override for the back link (defaults to locale copy). */
  backLabel?: string;
}) {
  const copy = COPY[locale] || COPY.en;
  const [paypalEmail, setPaypalEmail] = useState(guestEmail?.trim() || "");
  const [emailInvalid, setEmailInvalid] = useState(false);

  const submit = async () => {
    const email = paypalEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailInvalid(true);
      return;
    }
    setEmailInvalid(false);
    await onConfirm(email);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-[#e1e7ef] bg-[#f5f7fa] px-4 py-3">
        <div className="flex items-center gap-2">
          <PaypalMark className="h-8 w-8" />
          <div>
            <p className="text-sm font-extrabold text-[#003087]">{copy.title}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {copy.sandboxBadge}
            </p>
          </div>
        </div>
        <Lock className="h-4 w-4 text-slate-400" aria-hidden />
      </header>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {copy.amountLabel}
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-[#0b1f4b]">{amountLabel}</p>
        </div>

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-900">
          {copy.sandboxHint}
        </p>

        <label className="block text-sm font-semibold text-slate-700">
          {copy.emailLabel}
          <input
            type="email"
            value={paypalEmail}
            onChange={(e) => {
              setPaypalEmail(e.target.value);
              setEmailInvalid(false);
            }}
            placeholder={copy.emailPlaceholder}
            className={cn(
              "mt-1 w-full rounded-md border p-2.5 text-sm outline-none transition",
              emailInvalid
                ? "border-2 border-red-500 bg-red-50 ring-2 ring-red-200"
                : "border-slate-300 focus:border-[#0070ba] focus:ring-2 focus:ring-sky-100",
            )}
            autoComplete="email"
          />
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="flex w-full min-h-12 items-center justify-center rounded-full bg-[#0070ba] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#005ea6] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? copy.processing : copy.confirmCta}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm font-semibold text-[#1d6fe8] hover:underline"
        >
          ← {backLabel || copy.backLabel}
        </button>
      </div>
    </section>
  );
}
