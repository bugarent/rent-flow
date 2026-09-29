"use client";

import { useMemo } from "react";
import { BusinessPartnerLoginForm } from "@/components/business/business-partner-login-form";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import { getBusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";

export default function BusinessPartnerLoginPage() {
  const { locale } = useBusinessPartnerPreferences();
  const t = useMemo(() => getBusinessPartnershipCopy(locale), [locale]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#f5f6f8] px-4 py-12">
      <BusinessPartnerLoginForm
        title={t.loginTitle}
        emailLabel={t.email}
        passwordLabel={t.password}
        submitLabel={t.loginSubmit}
        backLabel={t.loginBack}
        errorInvalid={t.loginErrorInvalid}
        errorPending={t.loginErrorPending}
        errorRejected={t.loginErrorRejected}
      />
    </div>
  );
}
