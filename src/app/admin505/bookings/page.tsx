import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { CustomBookingInbox } from "@/components/admin/custom-booking-inbox";
import { AdminBookingsDashboard } from "@/components/admin/admin-bookings-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AdminFinancialsPanel } from "@/components/admin/admin-financials-panel";
import { AdminBookingsPillTabs } from "@/components/admin/admin-bookings-pill-tabs";
import {
  AdminCustomersTable,
} from "@/components/admin/admin-customers-table";
import { AdminBookingRefundsPanel } from "@/components/admin/admin-booking-refunds-panel";
import { loadAdminCustomerRows } from "@/lib/server/load-admin-customers";
import { loadAdminBookingRows } from "@/lib/server/load-admin-bookings";
import { readAdminLocale } from "@/lib/server/admin-preferences";
import { getAdminDictionary } from "@/lib/i18n/admin-dictionaries";
import { ADMIN_BASE } from "@/lib/routes";

export const dynamic = "force-dynamic";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type BookingsTab = "bookings" | "financials" | "chat" | "statistics" | "users" | "refunds";

function parseTab(raw?: string): BookingsTab {
  if (raw === "statistics" || raw === "analytics") return "statistics";
  if (raw === "users") return "users";
  if (raw === "chat" || raw === "custom-booking") return "chat";
  if (raw === "financials" || raw === "finance") return "financials";
  if (raw === "refunds" || raw === "refund") return "refunds";
  return "bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    tab?: string;
    country?: string;
    year?: string;
    month?: string;
    view?: string;
  }>;
}) {
  await requireAdmin();
  const locale = await readAdminLocale();
  const t = getAdminDictionary(locale);
  const sp = await searchParams;
  const tab = parseTab(sp.tab);
  const to = sp.to ?? isoDate(new Date());
  const from = sp.from ?? isoDate(new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30));

  const dateQs = new URLSearchParams({ from, to }).toString();
  const bookingsHref = `${ADMIN_BASE}/bookings`;
  const financialsHref = `${ADMIN_BASE}/bookings?tab=financials`;
  const chatHref = `${ADMIN_BASE}/bookings?tab=chat`;
  const refundsHref = `${ADMIN_BASE}/bookings?tab=refunds`;
  const statsHref = `${ADMIN_BASE}/bookings?tab=statistics&${dateQs}`;
  const usersHref = `${ADMIN_BASE}/bookings?tab=users`;

  let stats = {
    totalActive: 0,
    categoryStats: [] as Array<{ id: string; name: string; details: string; bookings: number }>,
    modelStats: [] as Array<{ model: string; bookings: number }>,
    airportStats: [] as Array<{ title: string; iata: string; bookings: number }>,
  };

  if (tab === "statistics") {
    try {
      const { buildAdminBookingStatistics } = await import("@/lib/server/admin-booking-statistics");
      stats = await buildAdminBookingStatistics(from, to);
    } catch (error) {
      console.warn("[admin/bookings] statistics", error);
    }
  }

  const customers =
    tab === "users"
      ? await loadAdminCustomerRows()
      : { users: [], dbOffline: false, queryError: "" };

  const bookingRows = tab === "bookings" ? await loadAdminBookingRows() : [];

  const title =
    tab === "statistics"
      ? t.pages.analytics.title
      : tab === "financials"
        ? t.pages.financials.title
        : tab === "users"
          ? t.pages.users.title
          : tab === "chat"
            ? t.pages.customBooking.title
            : tab === "refunds"
              ? locale === "ka"
                ? "დასაბრუნებელი"
                : locale === "ru"
                  ? "Возвраты"
                  : "Refunds"
              : t.pages.bookings.title;
  const body =
    tab === "statistics"
      ? t.pages.analytics.body
      : tab === "financials"
        ? t.pages.financials.body
        : tab === "users"
          ? t.pages.users.body
          : tab === "chat"
            ? t.pages.customBooking.body
            : tab === "refunds"
              ? locale === "ka"
                ? "კლიენტის გაუქმებული სერვისებისა და შემცირებული დღეების საიტის საკომისიოს დაბრუნების ინვოისები."
                : locale === "ru"
                  ? "Счета на возврат сервисного сбора за отменённые услуги и сокращённые дни."
                  : "Invoices to refund site service fees for cancelled extras or shortened trips."
              : t.pages.bookings.body;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-extrabold">{title}</h1>
      <p className="mb-6 text-sm text-slate-600">{body}</p>

      <AdminBookingsPillTabs
        tabs={[
          { href: bookingsHref, label: t.nav.bookings, active: tab === "bookings" },
          {
            href: refundsHref,
            label: locale === "ka" ? "დასაბრუნებელი" : locale === "ru" ? "Возвраты" : "Refunds",
            active: tab === "refunds",
          },
          { href: financialsHref, label: t.nav.financials, active: tab === "financials" },
          { href: statsHref, label: t.nav.statistics, active: tab === "statistics" },
          { href: usersHref, label: t.nav.users, active: tab === "users" },
          { href: chatHref, label: t.nav.customBooking, active: tab === "chat" },
        ]}
      />

      {tab === "statistics" ? (
        <AnalyticsDashboard
          initial={stats}
          initialFrom={from}
          initialTo={to}
          basePath={`${ADMIN_BASE}/bookings`}
          preserveParams={{ tab: "statistics" }}
        />
      ) : tab === "financials" ? (
        <AdminFinancialsPanel
          searchParams={{
            from: sp.from,
            to: sp.to,
            country: sp.country,
            year: sp.year,
            month: sp.month,
            view: sp.view,
          }}
        />
      ) : tab === "users" ? (
        <AdminCustomersTable
          users={customers.users}
          dbOffline={customers.dbOffline}
          queryError={customers.queryError}
        />
      ) : tab === "chat" ? (
        <Suspense fallback={<p className="text-sm text-slate-500">{t.common.loading}</p>}>
          <CustomBookingInbox />
        </Suspense>
      ) : tab === "refunds" ? (
        <AdminBookingRefundsPanel />
      ) : (
        <AdminBookingsDashboard bookings={bookingRows} />
      )}
    </div>
  );
}
