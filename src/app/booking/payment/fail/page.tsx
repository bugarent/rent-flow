import Link from "next/link";
import { XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return String(v[0] || "");
  return String(v || "");
}

export default async function BookingPaymentFailPage({ searchParams }: Props) {
  const sp = (await searchParams) || {};
  const ref = first(sp.ref).trim();
  const bookingId = first(sp.bookingId).trim();

  return (
    <main className="min-h-[70vh] bg-[#eef2f6] px-3 py-10 sm:px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <XCircle className="mx-auto h-12 w-12 text-red-500" aria-hidden />
        <h1 className="mt-4 text-xl font-extrabold text-[#0b1f4b] sm:text-2xl">
          Payment not completed
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          The card payment was cancelled or failed
          {ref ? (
            <>
              {" "}
              for booking <span className="font-semibold text-[#0b1f4b]">{ref}</span>
            </>
          ) : null}
          . Your reservation is still unpaid — you can try again from checkout or contact support.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={bookingId ? `/cars` : "/cars"}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d6fe8] px-5 text-sm font-extrabold text-white hover:bg-[#1557c0]"
          >
            Browse cars
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
