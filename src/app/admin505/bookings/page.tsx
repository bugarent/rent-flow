import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/guards";
import { CustomBookingInbox } from "@/components/admin/custom-booking-inbox";
import { AdminBookingsDashboard } from "@/components/admin/admin-bookings-dashboard";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { AdminFinancialsPanel } from "@/components/admin/admin-financials-panel";
import { AdminBookingRefundsPanel } from "@/components/admin/admin-booking-refunds-panel";
import { loadAdminBookingRows } from "@/lib/server/load-admin-bookings";
import { AdminBookingsSection } from "@/components/admin/admin-bookings-section";
import { ADMIN_BASE } from "@/lib/routes";

export const dynamic = "force-dynamic";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type BookingsTab = "bookings" | "financials" | "chat" | "statistics" | "refunds";

function parseTab(raw?: string): BookingsTab {
  if (raw === "statistics" || raw === "analytics") return "statistics";
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

  const bookingRows = tab === "bookings" ? await loadAdminBookingRows() : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <AdminBookingsSection
        tab={tab}
        hrefs={{
          bookings: bookingsHref,
          refunds: refundsHref,
          financials: financialsHref,
          stats: statsHref,
          chat: chatHref,
        }}
      >
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
      ) : tab === "chat" ? (
        <Suspense fallback={<p className="text-sm text-slate-500">…</p>}>
          <CustomBookingInbox />
        </Suspense>
      ) : tab === "refunds" ? (
        <AdminBookingRefundsPanel />
      ) : (
        <AdminBookingsDashboard bookings={bookingRows} />
      )}
      </AdminBookingsSection>
    </div>
  );
}
