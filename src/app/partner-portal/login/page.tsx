import { Suspense } from "react";
import { PartnerCompanyAuthScreen } from "@/components/partner/partner-company-auth-screen";

export default function PartnerPortalLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] text-slate-500">Loading…</div>
      }
    >
      <PartnerCompanyAuthScreen initialMode="login" />
    </Suspense>
  );
}
