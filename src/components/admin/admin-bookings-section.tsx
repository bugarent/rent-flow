"use client";

import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { AdminBookingsPillTabs } from "@/components/admin/bookings/admin-bookings-pill-tabs";

type BookingsTab = "bookings" | "financials" | "chat" | "statistics" | "refunds";

export function AdminBookingsSection({
  tab,
  hrefs,
  children,
}: {
  tab: BookingsTab;
  hrefs: {
    bookings: string;
    refunds: string;
    financials: string;
    stats: string;
    chat: string;
  };
  children: React.ReactNode;
}) {
  const { locale, dictionary } = useAdminLocale();
  const refunds = uiText(locale, "Refunds", "დასაბრუნებელი", "Возвраты");
  const title =
    tab === "statistics"
      ? dictionary.pages.analytics.title
      : tab === "financials"
        ? dictionary.pages.financials.title
        : tab === "chat"
            ? dictionary.pages.customBooking.title
            : tab === "refunds"
              ? refunds
              : dictionary.pages.bookings.title;
  const body =
    tab === "statistics"
      ? dictionary.pages.analytics.body
      : tab === "financials"
        ? dictionary.pages.financials.body
        : tab === "chat"
            ? dictionary.pages.customBooking.body
            : tab === "refunds"
              ? uiText(
                  locale,
                  "Invoices to refund site service fees for cancelled extras or shortened trips.",
                  "კლიენტის გაუქმებული სერვისებისა და შემცირებული დღეების საიტის საკომისიოს დაბრუნების ინვოისები.",
                  "Счета на возврат сервисного сбора за отменённые услуги и сокращённые дни.",
                )
              : dictionary.pages.bookings.body;

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold">{title}</h1>
      <p className="mb-6 text-sm text-slate-600">{body}</p>
      <AdminBookingsPillTabs
        tabs={[
          { href: hrefs.bookings, label: dictionary.nav.bookings, active: tab === "bookings" },
          { href: hrefs.refunds, label: refunds, active: tab === "refunds" },
          { href: hrefs.financials, label: dictionary.nav.financials, active: tab === "financials" },
          { href: hrefs.stats, label: dictionary.nav.statistics, active: tab === "statistics" },
          { href: hrefs.chat, label: dictionary.nav.customBooking, active: tab === "chat" },
        ]}
      />
      {children}
    </>
  );
}
