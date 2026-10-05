import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { storedTripAndPickupDue } from "@/lib/bookings/booking-money";
import { loadAdminBookingFacts } from "@/lib/server/admin-booking-facts";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { ADMIN_BASE } from "@/lib/routes";
import { isActiveBookingStatus } from "@/lib/bookings/table-filters";
import { AdminFinancialsCountryBreakdown } from "@/components/admin/admin-financials-country-breakdown";
import { AdminFinancialsBookingsTable } from "@/components/admin/admin-financials-bookings-table";
import { AdminFinancialsFilters } from "@/components/admin/admin-financials-filters";
import { AdminFinancialsSummary } from "@/components/admin/admin-financials-summary";
import { AdminPeriodPurgePanel } from "@/components/admin/admin-period-purge-panel";

type FinanceView = "active" | "partner-cancelled";

function parseFinanceView(raw: string | undefined): FinanceView {
  if (raw === "partner-cancelled" || raw === "empty" || raw === "unfulfilled") {
    return "partner-cancelled";
  }
  return "active";
}

function matchesFinanceView(status: string, view: FinanceView) {
  if (view === "partner-cancelled") return status === "UNFULFILLED";
  return isActiveBookingStatus(status);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

function endOfDay(iso: string) {
  return new Date(`${iso}T23:59:59.999Z`);
}

function localizeCountryName(name: unknown, iso2: string) {
  if (name && typeof name === "object" && "en" in name) {
    const en = (name as { en?: string }).en;
    if (en) return en;
  }
  return worldCountryName(iso2);
}

function isDbOfflineError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; name?: string };
  const msg = `${err.code ?? ""} ${err.message ?? ""}`;
  return (
    err.code === "ECONNREFUSED" ||
    err.code === "P1001" ||
    err.code === "P1017" ||
    /ECONNREFUSED|Can't reach database|Connection refused|connect ECONNREFUSED/i.test(msg)
  );
}

function describeQueryError(error: unknown) {
  if (isDbOfflineError(error)) {
    return "PostgreSQL is not reachable on localhost:5432. Start the database (e.g. `docker compose up -d` or your local Postgres service), then run `npx prisma db push` and refresh. Filters and layout still work; booking totals will appear once the DB is online.";
  }
  if (!error || typeof error !== "object") {
    return "Could not load bookings. The page is still usable — check the database connection and try again.";
  }
  const err = error as { message?: string };
  const short = err.message?.split("\n").filter(Boolean).slice(0, 3).join(" ").trim();
  return short || "Could not load bookings. The page is still usable — try again after checking the database.";
}

type CountryOption = { iso2: string; label: string };

type FinancialRow = {
  id: string;
  sequentialNumber: number;
  createdAt: Date;
  totalPriceEur: unknown;
  depositPaidEur: number;
  balanceDueEur: number;
  status: string;
  customerName: string;
  carLabel: string;
  partnerName: string;
  partnerCode: string;
  partnerKind?: "COMPANY" | "PRIVATE";
  countryIso2: string;
  countryLabel: string;
};

export async function AdminFinancialsPanel({
  searchParams,
}: {
  searchParams: {
    from?: string;
    to?: string;
    country?: string;
    year?: string;
    month?: string;
    view?: string;
  };
}) {
  const sp = searchParams;
  const view = parseFinanceView(sp.view);
  const isPartnerCancelled = view === "partner-cancelled";

  const today = new Date();
  const defaultFrom = isoDate(new Date(today.getFullYear(), 0, 1));
  const defaultTo = isoDate(today);

  let from = sp.from?.trim() || defaultFrom;
  let to = sp.to?.trim() || defaultTo;
  if (!sp.from && !sp.to && sp.year) {
    const year = parseInt(sp.year, 10);
    const month = sp.month ? parseInt(sp.month, 10) : undefined;
    if (!Number.isNaN(year)) {
      from = isoDate(new Date(year, month ? month - 1 : 0, 1));
      to = isoDate(new Date(year, month ? month : 12, 0));
    }
  }
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const countryFilter = (sp.country || "").trim().toUpperCase();
  const viewQs = isPartnerCancelled ? "&view=partner-cancelled" : "";
  const linkBase = `${ADMIN_BASE}/bookings?tab=financials${viewQs}`;
  const activeHref = `${ADMIN_BASE}/bookings?tab=financials&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${countryFilter ? `&country=${encodeURIComponent(countryFilter)}` : ""}`;
  const cancelledHref = `${ADMIN_BASE}/bookings?tab=financials&view=partner-cancelled&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${countryFilter ? `&country=${encodeURIComponent(countryFilter)}` : ""}`;

  const countryOptions: CountryOption[] = WORLD_COUNTRIES.map((c) => ({
    iso2: c.iso2,
    label: c.name,
  }));

  let bookings: FinancialRow[] = [];
  let queryError = "";
  let dbOffline = false;

  // Optional enrichment from DB — never blocks the page or the world country list
  try {
    const dbCountries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { iso2: true, name: true },
    });
    const seen = new Set(countryOptions.map((c) => c.iso2));
    for (const row of dbCountries) {
      const iso2 = String(row.iso2 || "").toUpperCase();
      if (!iso2 || seen.has(iso2)) continue;
      seen.add(iso2);
      countryOptions.push({ iso2, label: localizeCountryName(row.name, iso2) });
    }
    countryOptions.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    if (isDbOfflineError(error)) dbOffline = true;
    /* WORLD_COUNTRIES already populated */
  }

  try {
    const rangeStart = startOfDay(from);
    const rangeEnd = endOfDay(to);
    const facts = await loadAdminBookingFacts();
    bookings = facts
      .filter((fact) => matchesFinanceView(fact.status, view))
      .filter((fact) => {
        const created = new Date(fact.createdAt).getTime();
        return Number.isFinite(created) && created >= rangeStart.getTime() && created <= rangeEnd.getTime();
      })
      .map((fact) => ({
        id: fact.id,
        sequentialNumber: fact.sequentialNumber,
        createdAt: new Date(fact.createdAt),
        totalPriceEur: fact.totalPriceEur,
        depositPaidEur: fact.depositPaidEur,
        balanceDueEur: fact.balanceDueEur,
        status: fact.status,
        customerName: fact.guestName,
        carLabel: fact.carLabel,
        partnerName: fact.partnerName,
        partnerCode: fact.partnerCode,
        partnerKind: fact.partnerKind,
        countryIso2: fact.countryIso2,
        countryLabel: fact.countryLabel,
      }));

    if (countryFilter) {
      bookings = bookings.filter((row) => row.countryIso2 === countryFilter);
    }
    if (bookings.length > 0) queryError = "";
  } catch (error) {
    console.error("[admin/financials]", error);
    if (isDbOfflineError(error)) dbOffline = true;
    queryError = describeQueryError(error);
  }

  const totalRevenue = bookings.reduce((acc, b) => acc + toNumber(b.totalPriceEur), 0);
  const totalDeposit = bookings.reduce((acc, b) => acc + (Number(b.depositPaidEur) || 0), 0);
  const totalBalance = bookings.reduce((acc, b) => acc + (Number(b.balanceDueEur) || 0), 0);
  const totalCommission = bookings.reduce((acc, booking) => {
    const money = storedTripAndPickupDue({
      totalPriceEur: toNumber(booking.totalPriceEur),
      depositPaidEur: booking.depositPaidEur,
      balanceDueEur: booking.balanceDueEur,
    });
    return acc + Math.max(0, money.tripEur - money.dueAtPickupEur);
  }, 0);

  const countryBreakdown = new Map<
    string,
    {
      iso2: string;
      label: string;
      bookings: number;
      revenue: number;
      deposit: number;
      balance: number;
    }
  >();
  for (const b of bookings) {
    const key = b.countryIso2;
    const current = countryBreakdown.get(key) ?? {
      iso2: key,
      label: b.countryLabel,
      bookings: 0,
      revenue: 0,
      deposit: 0,
      balance: 0,
    };
    current.bookings += 1;
    current.revenue += toNumber(b.totalPriceEur);
    current.deposit += Number(b.depositPaidEur) || 0;
    current.balance += Number(b.balanceDueEur) || 0;
    countryBreakdown.set(key, current);
  }
  const countryRows = [...countryBreakdown.values()].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    if (b.deposit !== a.deposit) return b.deposit - a.deposit;
    return b.bookings - a.bookings;
  });
  const selectedCountryLabel =
    countryOptions.find((c) => c.iso2 === countryFilter)?.label ||
    (countryFilter ? worldCountryName(countryFilter) : "All countries");

  return (
    <div>
        <AdminFinancialsSummary
          isPartnerCancelled={isPartnerCancelled}
          activeHref={activeHref}
          cancelledHref={cancelledHref}
          count={bookings.length}
          from={from}
          to={to}
          countryLabel={countryFilter ? selectedCountryLabel : ""}
          totalDeposit={totalDeposit}
          totalBalance={totalBalance}
          totalCommission={totalCommission}
          totalRevenue={totalRevenue}
          showDbWarning={Boolean((dbOffline || queryError) && bookings.length === 0)}
          dbOffline={dbOffline}
          queryError={queryError || (dbOffline ? describeQueryError({ code: "ECONNREFUSED" }) : "")}
        />

        <AdminFinancialsFilters
          from={from}
          to={to}
          country={countryFilter}
          countries={countryOptions}
          isPartnerCancelled={isPartnerCancelled}
        />

        {!countryFilter ? (
          <AdminFinancialsCountryBreakdown
            rows={countryRows}
            linkBase={linkBase}
            from={from}
            to={to}
            cancelled={isPartnerCancelled}
          />
        ) : null}

        <AdminFinancialsBookingsTable
          cancelled={isPartnerCancelled}
          countryLabel={countryFilter ? selectedCountryLabel : ""}
          dbOffline={dbOffline}
          bookings={bookings.map((b) => ({
            id: b.id,
            sequentialNumber: b.sequentialNumber,
            createdAt: b.createdAt.toISOString(),
            totalPriceEur: toNumber(b.totalPriceEur),
            depositPaidEur: Number(b.depositPaidEur) || 0,
            balanceDueEur: Number(b.balanceDueEur) || 0,
            customerName: b.customerName,
            carLabel: b.carLabel,
            partnerName: b.partnerName,
            partnerCode: b.partnerCode,
            partnerKind: b.partnerKind,
            countryIso2: b.countryIso2,
            countryLabel: b.countryLabel,
          }))}
        />

        <AdminPeriodPurgePanel from={from} to={to} />
    </div>
  );
}
