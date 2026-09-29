"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PartnerInviteRegisterForm } from "@/components/partner/partner-invite-register-form";
import { BecomePartnerCta } from "@/components/partner/become-partner-cta";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { PARTNER_LOGIN } from "@/lib/routes";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

function RegisterInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;

  if (token) {
    return <PartnerInviteRegisterForm token={token} />;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/">
          <BrandLogo />
        </Link>
      </header>
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold text-[#0b1f4b]">{t.partnerRegistration}</h1>
        <p className="mt-3 text-sm text-slate-600">{t.inviteOnly}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <BecomePartnerCta />
          <Link href={PARTNER_LOGIN} className="text-sm font-semibold text-sky-700 hover:underline">
            {t.alreadyApproved} {dictionary.nav.login}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PartnerRegisterPage() {
  const { dictionary } = useSurfaceDictionary();
  return (
    <Suspense fallback={<p className="p-10 text-center text-slate-500">{dictionary.partner.loading}</p>}>
      <RegisterInner />
    </Suspense>
  );
}
