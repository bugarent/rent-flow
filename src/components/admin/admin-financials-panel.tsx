import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { storedTripAndPickupDue } from "@/lib/bookings/booking-money";
import { loadAdminBookingFacts } from "@/lib/server/admin-booking-facts";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { ADMIN_BASE } from "@/lib/routes";
import { isActiveBookingStatus } from "@/lib/bookings/table-filters";
import { AdminPillTabs } from "@/components/admin/admin-pill-tabs";
import { AdminFinancialsCountryBreakdown } from "@/components/admin/admin-financials-country-breakdown";
import { AdminFinancialsBookingsTable } from "@/components/admin/admin-financials-bookings-table";
import { AdminFinancialsFilters } from "@/components/admin/admin-financials-filters";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
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
        <AdminPillTabs
          tabs={[
            { href: activeHref, label: "Active bookings", active: !isPartnerCancelled },
            {
              href: cancelledHref,
              label: "Partner cancelled",
              active: isPartnerCancelled,
            },
          ]}
        />

        {(dbOffline || queryError) && bookings.length === 0 ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <p className="font-semibold">
              {dbOffline ? "Database offline — connection refused (not a schema/include error)" : "Could not load booking data"}
            </p>
            <p className="mt-1 leading-relaxed">{queryError || describeQueryError({ code: "ECONNREFUSED" })}</p>
            <p className="mt-2 text-xs text-amber-800">
              Prisma reports this as an “Invalid findMany() invocation”, but the underlying cause is{" "}
              <strong>ECONNREFUSED</strong> — PostgreSQL is not running on port 5432. Start it with{" "}
              <code className="rounded bg-amber-100 px-1">docker compose up -d</code>, then{" "}
              <code className="rounded bg-amber-100 px-1">npx prisma db push</code>.
            </p>
          </div>
        ) : null}

        <AdminFinancialsFilters
          from={from}
          to={to}
          country={countryFilter}
          countries={countryOptions}
          isPartnerCancelled={isPartnerCancelled}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">
              {isPartnerCancelled ? "Partner cancelled" : "Active bookings"}
            </h3>
            <p className="mt-2 text-3xl font-extrabold">{bookings.length}</p>
            <p className="mt-1 text-xs text-slate-400">
              {from} → {to}
              {countryFilter ? ` · ${selectedCountryLabel}` : ""}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">Paid online (deposit)</h3>
            <p className="mt-2 text-3xl font-extrabold text-sky-700">
              <AdminMoneyText amountEur={totalDeposit} />
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">
              {isPartnerCancelled ? "Was due at pick-up" : "Due at pick-up"}
            </h3>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">
              <AdminMoneyText amountEur={totalBalance} />
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {isPartnerCancelled ? "Est. commission lost" : "Est. commission"}{" "}
              <AdminMoneyText amountEur={totalCommission} />
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500">
              {isPartnerCancelled ? "Cancelled volume" : "Gross volume"}
            </h3>
            <p className="mt-2 text-3xl font-extrabold text-green-600">
              <AdminMoneyText amountEur={totalRevenue} />
            </p>
          </div>
        </div>

        {!countryFilter ? (
          <AdminFinancialsCountryBreakdown
            rows={countryRows}
            linkBase={linkBase}
            from={from}
            to={to}
            title={
              isPartnerCancelled
                ? "Partner cancelled by country"
                : "Breakdown by partner country"
            }
            subtitle={
              isPartnerCancelled
                ? "Sorted by highest cancelled volume. Partner-cancelled (UNFULFILLED) bookings only."
                : "Sorted by highest gross volume. Same totals as above, split by partner country."
            }
          />
        ) : null}

        <AdminFinancialsBookingsTable
          title={isPartnerCancelled ? "Partner cancelled bookings" : "Active bookings"}
          subtitle={
            isPartnerCancelled
              ? `${bookings.length} partner-cancelled booking${bookings.length === 1 ? "" : "s"}`
              : `${bookings.length} booking${bookings.length === 1 ? "" : "s"} for financial calculation`
          }
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
            countryIso2: b.countryIso2,
            countryLabel: b.countryLabel,
          }))}
          emptyMessage={
            dbOffline
              ? isPartnerCancelled
                ? "No partner-cancelled bookings in this period (database offline — file bookings already included when present)."
                : "No active bookings in this period (database offline — file bookings already included when present)."
              : isPartnerCancelled
                ? `No partner-cancelled bookings in this period${countryFilter ? ` for ${selectedCountryLabel}` : ""}.`
                : `No active bookings in this period${countryFilter ? ` for ${selectedCountryLabel}` : ""}.`
          }
        />

        <AdminPeriodPurgePanel from={from} to={to} />
    </div>
  );
}
