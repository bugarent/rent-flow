import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { partnerDisplayName, formatPartnerCode, parseIso2List, parsePartnerMessengers } from "@/lib/partner";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { backfillSequentialIds } from "@/lib/sequential-ids";
import { displayInternationalPhone } from "@/lib/catalog/dial-codes";

async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

function countryLabelFromJson(name: unknown, iso2: string) {
  if (name && typeof name === "object" && "en" in name) {
    const en = String((name as { en?: string }).en || "").trim();
    if (en) return en;
  }
  return worldCountryName(iso2);
}

export async function GET(req: Request) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") === "customers" ? "customers" : "partners";
  const country = (searchParams.get("country") || "").trim().toUpperCase();

  try {
    await backfillSequentialIds();
  } catch (error) {
    console.error("[admin/directory backfill]", error);
  }

  try {
    if (tab === "customers") {
      const customers = await prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          ...(country ? { countryOfResidence: country } : {}),
        },
        orderBy: [{ customerNumber: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          customerNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          countryOfResidence: true,
          status: true,
          createdAt: true,
        },
      });

      const countryCounts = await prisma.user.groupBy({
        by: ["countryOfResidence"],
        where: { role: "CUSTOMER" },
        _count: { _all: true },
      });

      return NextResponse.json({
        tab,
        country,
        total: customers.length,
        countries: countryCounts
          .map((row) => ({
            iso2: row.countryOfResidence,
            name: worldCountryName(row.countryOfResidence),
            count: row._count._all,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        rows: customers.map((c) => ({
          id: c.id,
          code: c.customerNumber != null ? String(c.customerNumber) : "—",
          name: `${c.firstName} ${c.lastName}`.trim(),
          countryIso2: c.countryOfResidence,
          country: worldCountryName(c.countryOfResidence),
          email: c.email,
          phone: c.phone,
          status: c.status,
          createdAt: c.createdAt,
        })),
      });
    }

    const partners = await prisma.partner.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ sequentialNumber: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { firstName: true, lastName: true, status: true } },
        cars: { select: { status: true } },
        locations: {
          include: { airport: { include: { city: { include: { country: true } } } } },
        },
      },
    });

    const mapped = (partners as Array<Record<string, unknown> & {
      id: string;
      sequentialNumber: number | null;
      kind: string;
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      secondaryPhone?: string | null;
      messenger?: string;
      messengers?: unknown;
      operatingCountryIso2s?: unknown;
      representativeFirstName?: string | null;
      representativeLastName?: string | null;
      status: string;
      fleetSize: number;
      user?: { firstName?: string; lastName?: string } | null;
      cars: Array<{ status: string }>;
      locations: Array<{ airport: { city: { country: { iso2: string; name: unknown } } } }>;
    }>).map((p) => {
      const operating = parseIso2List(p.operatingCountryIso2s).map((iso2) => ({
        iso2,
        name: worldCountryName(iso2),
      }));
      const countries: Array<{ iso2: string; name: string }> = [
        ...new Map(
          [
            ...operating.map((c) => [c.iso2, c] as const),
            ...p.locations.map((loc) => {
              const iso2 = loc.airport.city.country.iso2;
              return [iso2, { iso2, name: countryLabelFromJson(loc.airport.city.country.name, iso2) }] as const;
            }),
          ],
        ).values(),
      ];
      return {
        id: p.id,
        code: formatPartnerCode(p.sequentialNumber) ?? "—",
        sequentialNumber: p.sequentialNumber,
        name: partnerDisplayName(p),
        kind: p.kind,
        companyName: p.companyName,
        contactName: p.contactName,
        firstName: p.representativeFirstName || p.user?.firstName || "",
        lastName: p.representativeLastName || p.user?.lastName || "",
        email: p.email,
        phone: displayInternationalPhone(p.phone),
        secondaryPhone: p.secondaryPhone ? displayInternationalPhone(p.secondaryPhone) : null,
        messengers: parsePartnerMessengers(p.messengers, p.messenger),
        status: p.status,
        countries,
        countryIso2s: countries.map((c) => c.iso2),
        country: countries.map((c) => c.name).join(", ") || "—",
        activeCars: p.cars.filter((car) => car.status === "APPROVED").length,
        fleetSize: p.fleetSize,
      };
    });

    const filtered = country
      ? mapped.filter((p) => p.countryIso2s.includes(country))
      : mapped;

    const countryCountMap = new Map<string, { iso2: string; name: string; count: number }>();
    for (const partner of mapped) {
      for (const c of partner.countries) {
        const current = countryCountMap.get(c.iso2) ?? { iso2: c.iso2, name: c.name, count: 0 };
        current.count += 1;
        countryCountMap.set(c.iso2, current);
      }
    }

    return NextResponse.json({
      tab,
      country,
      total: filtered.length,
      countries: [...countryCountMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
      rows: filtered,
    });
  } catch (error) {
    console.error("[admin/directory GET]", error);

    if (tab === "partners") {
      try {
        const { loadAdminPartnerRows, ACTIVE_PARTNER_STATUSES } = await import(
          "@/lib/server/admin-partner-rows"
        );
        const { readCompanySettingsFile } = await import(
          "@/lib/server/partner-company-settings-store"
        );
        const { partners, dbOffline, queryError } = await loadAdminPartnerRows();
        const active = partners.filter((p) => ACTIVE_PARTNER_STATUSES.has(p.status));

        const mapped = await Promise.all(
          active.map(async (p) => {
            let countries: Array<{ iso2: string; name: string }> = [];
            try {
              const settings = await readCompanySettingsFile(p.id);
              const iso2s = Array.isArray(settings?.deliveryCountryIso2s)
                ? settings.deliveryCountryIso2s
                : [];
              countries = iso2s
                .map((iso2) => String(iso2 || "").trim().toUpperCase())
                .filter(Boolean)
                .map((iso2) => ({ iso2, name: worldCountryName(iso2) }));
            } catch {
              countries = [];
            }
            return {
              id: p.id,
              code: p.partnerCode ?? (p.sequentialNumber != null ? `PRT-${p.sequentialNumber}` : "—"),
              sequentialNumber: p.sequentialNumber,
              name: p.displayName,
              kind: p.kind,
              companyName: p.displayName,
              contactName: p.displayName,
              firstName: "",
              lastName: "",
              email: p.email,
              phone: p.phone,
              secondaryPhone: null as string | null,
              messengers: [] as string[],
              status: p.status,
              countries,
              countryIso2s: countries.map((c) => c.iso2),
              country: countries.map((c) => c.name).join(", ") || "—",
              activeCars: p.carCount || 0,
              fleetSize: p.fleetSize,
            };
          }),
        );

        const filtered = country
          ? mapped.filter((p) => p.countryIso2s.includes(country) || p.countryIso2s.length === 0)
          : mapped;

        // When country filter is set but local rows have no country data, still show them
        // so the directory is not empty while DB is offline.
        const rows =
          country && filtered.length === 0
            ? mapped.filter((p) => p.countryIso2s.length === 0)
            : filtered;

        const countryCountMap = new Map<string, { iso2: string; name: string; count: number }>();
        for (const partner of mapped) {
          for (const c of partner.countries) {
            const current = countryCountMap.get(c.iso2) ?? { iso2: c.iso2, name: c.name, count: 0 };
            current.count += 1;
            countryCountMap.set(c.iso2, current);
          }
        }

        return NextResponse.json({
          tab,
          country,
          total: rows.length,
          countries: [...countryCountMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
          rows,
          dbOffline: dbOffline || true,
          warning: queryError || "Database offline — showing local partner directory.",
        });
      } catch (fallbackError) {
        console.error("[admin/directory GET] fallback", fallbackError);
      }
    }

    return NextResponse.json({ error: "Could not load directory" }, { status: 500 });
  }
}
