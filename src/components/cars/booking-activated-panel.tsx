"use client";

import Link from "next/link";
import { CheckCircle2, Hash, Mail } from "lucide-react";
import { paymentSuccessCopy } from "@/lib/i18n/payment-success-copy";

/** Instant post-confirm UI (same layout as `/booking/payment/success`) — no checkout flash. */
export function BookingActivatedPanel({
  locale,
  email,
  bookingRef,
}: {
  locale: string;
  email: string;
  bookingRef: string;
}) {
  const t = paymentSuccessCopy(locale);
  const mail = email.trim();
  const ref = bookingRef.trim();

  return (
    <main className="min-h-[70vh] bg-[#eef2f6] px-3 py-10 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{t.body}</p>

        {mail || ref ? (
          <div className="mt-5 overflow-hidden rounded-2xl border-2 border-[#1d6fe8] bg-gradient-to-br from-[#eef5ff] via-white to-[#fff7e8] text-start shadow-[0_0_0_4px_rgba(29,111,232,0.12)]">
            {mail ? (
              <div className="border-b border-[#1d6fe8]/20 px-4 py-3.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1d6fe8]">
                  {t.emailLabel}
                </p>
                <p className="flex items-start gap-2 break-all text-base font-extrabold text-[#0b1f4b]">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fe8]" aria-hidden />
                  <span className="min-w-0">{mail}</span>
                </p>
              </div>
            ) : null}
            {ref ? (
              <div className="px-4 py-3.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                  {t.bookingLabel}
                </p>
                <p className="flex items-center gap-2 font-mono text-xl font-black tracking-wide text-[#0b1f4b] sm:text-2xl">
                  <Hash className="h-6 w-6 shrink-0 text-amber-600" aria-hidden />
                  <span className="min-w-0 break-all rounded-lg bg-amber-100 px-2.5 py-1 text-amber-950 ring-1 ring-amber-300">
                    {ref}
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-extrabold text-amber-950">
          {t.remember}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d6fe8] px-5 text-sm font-extrabold text-white hover:bg-[#1557c0]"
          >
            {t.home}
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t.support}
          </Link>
        </div>
      </div>
    </main>
  );
}
