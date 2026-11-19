"use client";

import { Lock } from "lucide-react";

type Copy = {
  title: string;
  amountLabel: string;
  hint: string;
  confirmCta: string;
  backLabel: string;
  processing: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "PayPal",
    amountLabel: "Amount due now",
    hint: "You will be redirected to PayPal to approve the payment securely. Your booking is confirmed only after PayPal reports a successful payment.",
    confirmCta: "Continue to PayPal",
    backLabel: "Back to driver details",
    processing: "Redirecting to PayPal…",
  },
  ka: {
    title: "PayPal",
    amountLabel: "გადასახდელი თანხა ახლა",
    hint: "გადამისამართდებით PayPal-ზე უსაფრთხო გადახდის დასადასტურებლად. ჯავშანი დადასტურდება მხოლოდ წარმატებული გადახდის შემდეგ.",
    confirmCta: "გაგრძელება PayPal-ზე",
    backLabel: "დაბრუნება მძღოლის დეტალებზე",
    processing: "გადამისამართება PayPal-ზე…",
  },
  ru: {
    title: "PayPal",
    amountLabel: "К оплате сейчас",
    hint: "Вы будете перенаправлены в PayPal для безопасного подтверждения оплаты. Бронь подтверждается только после успешной оплаты.",
    confirmCta: "Перейти в PayPal",
    backLabel: "Назад к данным водителя",
    processing: "Переход в PayPal…",
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

export function CheckoutPaypalCard({
  amountLabel,
  locale,
  loading,
  onConfirm,
  onBack,
  backLabel,
}: {
  amountLabel: string;
  locale: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onBack: () => void;
  backLabel?: string;
}) {
  const copy = COPY[locale] || COPY.en;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-[#e1e7ef] bg-[#f5f7fa] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <PaypalMark className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#003087]">{copy.title}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Secure checkout
            </p>
          </div>
        </div>
        <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {copy.amountLabel}
          </p>
          <p className="mt-1 text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">{amountLabel}</p>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{copy.hint}</p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0070ba] px-4 text-sm font-extrabold text-white transition hover:bg-[#005ea6] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
          >
            {loading ? copy.processing : copy.confirmCta}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onBack}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:min-w-[10rem]"
          >
            {backLabel || copy.backLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
