import { Suspense } from "react";
import { PartnerPhoneVerifyForm } from "@/components/partner/partner-phone-verify-form";

export default function PartnerVerifyPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-3xl font-extrabold text-[#1A3B5D]">Phone verification</h1>
      <Suspense>
        <PartnerPhoneVerifyForm />
      </Suspense>
    </div>
  );
}
