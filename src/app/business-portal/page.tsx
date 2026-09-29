"use client";

import { Suspense, useMemo } from "react";
import { BusinessPartnerCabinet } from "@/components/business/business-partner-cabinet";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import { getBusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";

function CabinetInner() {
  const { locale } = useBusinessPartnerPreferences();
  const t = useMemo(() => getBusinessPartnershipCopy(locale), [locale]);

  return (
    <BusinessPartnerCabinet
      labels={{
        title: t.cabinetTitle,
        loading: t.cabinetLoading,
        logout: t.cabinetLogout,
        tabCabinet: t.cabinetTabCabinet,
        tabBookings: t.cabinetTabBookings,
        tabTools: t.cabinetTabTools,
        mainInfo: t.cabinetMainInfo,
        fieldFullName: t.cabinetFieldFullName,
        fieldFirstName: t.cabinetFieldFirstName,
        fieldLastName: t.cabinetFieldLastName,
        fieldPersonalId: t.cabinetFieldPersonalId,
        fieldPayoutMethod: t.cabinetFieldPayoutMethod,
        fieldPayoutMethodBank: t.cabinetPayoutMethodBank,
        fieldPayoutMethodPaypal: t.cabinetPayoutMethodPaypal,
        fieldPayoutAccount: t.cabinetFieldPayoutAccount,
        fieldPayoutAccountHint: t.cabinetFieldPayoutAccountHint,
        fieldPayoutSwift: t.cabinetFieldPayoutSwift,
        fieldPayoutSwiftHint: t.cabinetFieldPayoutSwiftHint,
        fieldPaypalAccount: t.cabinetFieldPaypalAccount,
        fieldPaypalAccountHint: t.cabinetFieldPaypalAccountHint,
        payoutValid: t.cabinetPayoutValid,
        payoutInvalidIban: t.cabinetPayoutInvalidIban,
        payoutInvalidSwift: t.cabinetPayoutInvalidSwift,
        payoutInvalidPaypal: t.cabinetPayoutInvalidPaypal,
        fieldEmail: t.cabinetFieldEmail,
        fieldPhone: t.cabinetFieldPhone,
        fieldCategory: t.cabinetFieldCategory,
        fieldCountry: t.cabinetFieldCountry,
        fieldWebsite: t.cabinetFieldWebsite,
        fieldStatus: t.cabinetFieldStatus,
        statusActive: t.cabinetStatusActive,
        statusInactive: t.cabinetStatusInactive,
        fieldMessengers: t.cabinetFieldMessengers,
        login: t.cabinetLogin,
        oldPassword: t.cabinetOldPassword,
        newPassword: t.cabinetNewPassword,
        passwordHint: t.cabinetPasswordHint,
        passwordWrong: t.cabinetPasswordWrong,
        passwordUpdated: t.cabinetPasswordUpdated,
        save: t.cabinetSave,
        saving: t.cabinetSaving,
        saved: t.cabinetSaved,
        nameRequired: t.cabinetNameRequired,
        idsRequired: t.cabinetIdsRequired,
        earned: t.cabinetEarned,
        paid: t.cabinetPaid,
        unpaid: t.cabinetUnpaid,
        bookings: t.cabinetBookings,
        code: t.cabinetCode,
        earningsTitle: t.cabinetEarningsTitle,
        earningsEmpty: t.cabinetEarningsEmpty,
        colBooking: t.cabinetColBooking,
        colCustomer: t.cabinetColCustomer,
        colEmail: t.cabinetColEmail,
        colPartner: t.cabinetColPartner,
        colStatus: t.cabinetColStatus,
        colBookingDate: t.cabinetColBookingDate,
        statusTransferred: t.cabinetStatusTransferred,
        statusPendingPayout: t.cabinetStatusPendingPayout,
        dateFrom: t.cabinetDateFrom,
        dateTo: t.cabinetDateTo,
        search: t.cabinetSearch,
        clearDates: t.cabinetClearDates,
        back: t.loginBack,
      }}
    />
  );
}

export default function BusinessPartnerCabinetPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
      <Suspense fallback={<p className="text-sm text-slate-500">…</p>}>
        <CabinetInner />
      </Suspense>
    </div>
  );
}
