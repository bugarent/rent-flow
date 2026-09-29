import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SITE_NAME } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <BrandLogo size="lg" />
      <h1 className="mt-6 text-2xl font-extrabold text-[#0b1f4b]">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you are looking for does not exist or was moved. Search airport cars at Kutaisi,
        Tbilisi and Batumi on {SITE_NAME}.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b1f4b] px-5 text-sm font-bold text-white hover:bg-[#152a5c]"
        >
          Home
        </Link>
        <Link
          href="/cars?pickup=KUT"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-50"
        >
          Kutaisi airport cars
        </Link>
        <Link
          href="/help"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-50"
        >
          Help
        </Link>
      </div>
    </div>
  );
}
