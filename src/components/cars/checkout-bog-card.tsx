"use client";

import { Lock, CreditCard } from "lucide-react";

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
    title: "Card payment",
    amountLabel: "Amount due now",
    hint: "After you tap pay, the Bank of Georgia card form opens on this page so you can enter your card details securely.",
    confirmCta: "Open card payment form",
    backLabel: "Back to driver details",
    processing: "Opening card form…",
  },
  ka: {
    title: "ბარათით გადახდა",
    amountLabel: "გადასახდელი თანხა ახლა",
    hint: "ღილაკზე დაჭერის შემდეგ ამ გვერდზე გაიხსნება საქართველოს ბანკის ბარათის ფორმა — ნომერი და CVV ივსება უსაფრთხოდ.",
    confirmCta: "ბარათის ფორმის გახსნა",
    backLabel: "დაბრუნება მძღოლის დეტალებზე",
    processing: "ფორმა იხსნება…",
  },
  ru: {
    title: "Оплата картой",
    amountLabel: "К оплате сейчас",
    hint: "После нажатия на этой странице откроется форма карты Банка Грузии — номер и CVV вводятся безопасно.",
    confirmCta: "Открыть форму карты",
    backLabel: "Назад к данным водителя",
    processing: "Открываем форму…",
  },
};

export function CheckoutBogCard({
  amountLabel,
  locale,
  loading,
  disabled,
  onConfirm,
  onBack,
  backLabel,
}: {
  amountLabel: string;
  locale: string;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  onBack: () => void;
  backLabel?: string;
}) {
  const copy = COPY[locale] || COPY.en;
  const blocked = Boolean(loading || disabled);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-[#e1e7ef] bg-[#f5f7fa] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ff6200]/10 text-[#ff6200]">
            <CreditCard className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0b1f4b]">{copy.title}</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Bank of Georgia
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
            disabled={blocked}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ff6200] px-4 text-sm font-extrabold text-white transition hover:bg-[#e55800] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
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
