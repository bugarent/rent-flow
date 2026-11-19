import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || "");
  return String(v || "");
}

export default async function BookingPaymentSuccessPage({ searchParams }: Props) {
  const sp = (await searchParams) || {};
  const ref = first(sp.ref).trim();
  const bookingId = first(sp.bookingId).trim();

  return (
    <main className="min-h-[70vh] bg-[#eef2f6] px-3 py-10 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">
          Payment received
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Thank you. Your card payment was submitted successfully. We are confirming your booking
          {ref ? (
            <>
              {" "}
              <span className="font-semibold text-[#0b1f4b]">{ref}</span>
            </>
          ) : bookingId ? (
            <>
              {" "}
              <span className="font-semibold text-[#0b1f4b]">{bookingId.slice(0, 8)}</span>
            </>
          ) : null}
          . You will receive a confirmation email shortly.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d6fe8] px-5 text-sm font-extrabold text-white hover:bg-[#1557c0]"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}
