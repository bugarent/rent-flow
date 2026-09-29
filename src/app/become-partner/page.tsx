"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { BecomePartnerModal } from "@/components/partner/become-partner-modal";
import { PARTNER_LOGIN } from "@/lib/routes";
import { usePreferences } from "@/components/providers/preferences-context";

function BecomePartnerInner() {
  const { dictionary } = usePreferences();
  const t = dictionary.partner;
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const email = searchParams.get("email")?.trim() || "";
  const company = searchParams.get("company")?.trim() || "";
  const country = searchParams.get("country")?.trim().toUpperCase() || "";

  useEffect(() => {
    setOpen(true);
  }, [email, company, country]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-3 text-3xl font-extrabold text-[#0b1f4b]">{t.title}</h1>
      <p className="mb-8 text-slate-600">{t.pageBody}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="rounded-xl bg-[#22c55e] px-6 py-3 text-base font-bold text-white hover:bg-[#16a34a]"
          onClick={() => setOpen(true)}
        >
          {t.applyCta}
        </button>
        <Link href={PARTNER_LOGIN} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-700 hover:underline">
          {t.partnerLogin}
        </Link>
      </div>
      <BecomePartnerModal
        open={open}
        onClose={() => setOpen(false)}
        initialEmail={email}
        initialCompany={company}
        initialCountry={country}
      />
    </div>
  );
}

export default function BecomePartnerPage() {
  const { dictionary } = usePreferences();
  return (
    <Suspense fallback={<p className="p-10 text-center text-slate-500">{dictionary.partner.loading}</p>}>
      <BecomePartnerInner />
    </Suspense>
  );
}
