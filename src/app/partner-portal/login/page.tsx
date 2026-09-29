import { Suspense } from "react";
import { ensureTestPartner } from "@/lib/auth/ensure-test-partner";
import { PartnerCompanyAuthScreen } from "@/components/partner/partner-company-auth-screen";

export default async function PartnerPortalLoginPage() {
  try {
    await ensureTestPartner();
  } catch (error) {
    console.error("ensureTestPartner failed", error);
  }

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
