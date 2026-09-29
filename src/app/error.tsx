"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest || error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <BrandLogo size="lg" />
      <h1 className="mt-6 text-2xl font-extrabold text-[#0b1f4b]">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        We could not load this page. Please try again, or return to the home page to continue
        booking.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-slate-400">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b1f4b] px-5 text-sm font-bold text-white hover:bg-[#152a5c]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-50"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
