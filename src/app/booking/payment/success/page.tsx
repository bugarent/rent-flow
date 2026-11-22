import Link from "next/link";
import { cookies } from "next/headers";
import { CheckCircle2, Hash, Mail } from "lucide-react";
import { formatBookingRef } from "@/lib/ids";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { paymentSuccessCopy } from "@/lib/i18n/payment-success-copy";
import { getBookingForPayment } from "@/lib/server/booking-payment";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || "");
  return String(v || "");
}

function cleanEmail(value: string): string {
  const mail = value.trim().slice(0, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) ? mail : "";
}

export default async function BookingPaymentSuccessPage({ searchParams }: Props) {
  const sp = (await searchParams) || {};
  const bookingId = first(sp.bookingId).trim();
  let ref = first(sp.ref).trim();
  let email = cleanEmail(first(sp.email));

  if (bookingId && (!ref || !email)) {
    const booking = await getBookingForPayment(bookingId).catch(() => null);
    if (booking) {
      if (!ref) ref = formatBookingRef(booking.sequentialNumber) || "";
      if (!email) email = cleanEmail(booking.guestEmail);
    }
  }

  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const t = paymentSuccessCopy(locale);

  return (
    <main className="min-h-[70vh] bg-[#eef2f6] px-3 py-10 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">{t.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">{t.body}</p>

        {email || ref ? (
          <div className="mt-5 overflow-hidden rounded-2xl border-2 border-[#1d6fe8] bg-gradient-to-br from-[#eef5ff] via-white to-[#fff7e8] text-start shadow-[0_0_0_4px_rgba(29,111,232,0.12)]">
            {email ? (
              <div className="border-b border-[#1d6fe8]/20 px-4 py-3.5">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1d6fe8]">
                  {t.emailLabel}
                </p>
                <p className="flex items-start gap-2 break-all text-base font-extrabold text-[#0b1f4b]">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fe8]" aria-hidden />
                  <span className="min-w-0">{email}</span>
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
