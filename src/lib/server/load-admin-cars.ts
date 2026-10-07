import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCars } from "@/lib/server/partner-cars-store";
import { listFilePartnerApplications } from "@/lib/server/partner-applications-store";
import { parseCarDetails } from "@/lib/cars/car-details";
import { normalizeRegistrationNumber } from "@/lib/cars/registration-number";
import { bodyTypeFromCarDescription, countriesFromCarDescription } from "@/lib/cars/listing-meta";
import { formatPartnerCode } from "@/lib/ids";
import { listingSearchBlockers, type SearchBlocker } from "@/lib/cars/listing-visibility";
import { normalizeLocationCode } from "@/lib/catalog/search-places";
import { listDeliveryLocations } from "@/lib/server/delivery-locations";
import { listExpiredInsuranceCarIds } from "@/lib/server/car-insurance-store";

function uniqueAirports(codes: string[]): string[] {
  return [...new Set(codes.map((c) => c.trim().toUpperCase()).filter(Boolean))].sort();
}

export type AdminCarRow = {
  id: string;
  /** State license plate — listing code shown at the top of each card. */
  listingCode: string;
  make: string;
  model: string;
  year: number;
  title: string;
  status: string;
  dailyRateEur: number;
  partnerName: string;
  partnerId: string;
  partnerEmail: string;
  partnerPhone: string;
  /** Site-assigned partner code from registration, e.g. PRT-1000 */
  partnerCode: string;
  country: string;
  bodyType: string;
  photoUrl: string;
  source: "file" | "db";
  updatedAt: string;
  /** Pickup airports (IATA) where customers can find this listing. */
  searchAirports: string[];
  /** Reasons the listing is missing from customer search; empty when it is searchable. */
  searchBlockers: SearchBlocker[];
};

type PartnerLookup = {
  code: string;
  phone: string;
  email: string;
  name: string;
};

function plateFromCar(registrationNumber: string | null | undefined, description: string): string {
  const fromField = normalizeRegistrationNumber(registrationNumber || "");
  if (fromField) return fromField;
  const details = parseCarDetails(description);
  return normalizeRegistrationNumber(String(details?.plate || "")) || "—";
}

function normEmail(email: string | null | undefined) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

async function buildPartnerLookup(): Promise<{
  byId: Map<string, PartnerLookup>;
  byEmail: Map<string, PartnerLookup>;
  dbOffline: boolean;
}> {
  const byId = new Map<string, PartnerLookup>();
  const byEmail = new Map<string, PartnerLookup>();
  let dbOffline = false;

  const put = (id: string | null | undefined, email: string, row: PartnerLookup) => {
    if (id) byId.set(id, row);
    const e = normEmail(email);
    if (e) byEmail.set(e, row);
  };

  try {
    const filePartners = await listFilePartnerApplications();
    for (const p of filePartners) {
      const code = formatPartnerCode(p.sequentialNumber) || "";
      if (!code && !p.phone && !p.email) continue;
      put(p.id, p.email, {
        code,
        phone: p.phone || "",
        email: p.email || "",
        name: p.companyName || p.contactName || p.email || "",
      });
    }
  } catch (error) {
    console.warn("[admin/cars] file partners", error);
  }

  try {
    const partners = await prisma.partner.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        companyName: true,
        sequentialNumber: true,
      },
    });
    for (const p of partners) {
      put(p.id, p.email, {
        code: formatPartnerCode(p.sequentialNumber) || "",
        phone: p.phone || "",
        email: p.email || "",
        name: p.companyName || p.email || "",
      });
    }
  } catch (error) {
    if (isDbOfflineError(error)) dbOffline = true;
    else console.warn("[admin/cars] prisma partners", error);
  }

  return { byId, byEmail, dbOffline };
}

function resolvePartner(
  car: Pick<AdminCarRow, "partnerId" | "partnerEmail" | "partnerName" | "partnerPhone" | "partnerCode">,
  byId: Map<string, PartnerLookup>,
  byEmail: Map<string, PartnerLookup>,
): Pick<AdminCarRow, "partnerCode" | "partnerPhone" | "partnerEmail" | "partnerName"> {
  const hit = byId.get(car.partnerId) || byEmail.get(normEmail(car.partnerEmail)) || null;
  return {
    partnerCode: car.partnerCode || hit?.code || "",
    partnerPhone: car.partnerPhone || hit?.phone || "",
    partnerEmail: car.partnerEmail || hit?.email || "",
    partnerName: car.partnerName !== "—" ? car.partnerName : hit?.name || car.partnerName,
  };
}

export async function loadAdminCarRows(): Promise<{
  cars: AdminCarRow[];
  dbOffline: boolean;
}> {
  let dbOffline = false;
  const byId = new Map<string, AdminCarRow>();
  const [partnerLookup, locations, expiredIds] = await Promise.all([
    buildPartnerLookup(),
    listDeliveryLocations({ activeOnly: false }).catch(() => []),
    listExpiredInsuranceCarIds()
      .then((ids) => new Set(ids))
      .catch(() => new Set<string>()),
  ]);
  if (partnerLookup.dbOffline) dbOffline = true;
  const locationById = new Map(locations.map((loc) => [loc.id, loc]));

  try {
    const fileCars = await listFileCars();
    for (const c of fileCars) {
      const countries = countriesFromCarDescription(c.description);
      const searchAirports = uniqueAirports(
        (c.deliveryPrices || []).flatMap((row) => {
          const loc = locationById.get(row.deliveryLocationId);
          const iata = loc?.iata || normalizeLocationCode(row.deliveryLocationId) || "";
          const active = loc ? loc.isActive !== false : Boolean(iata);
          return active && iata ? [iata] : [];
        }),
      );
      const base = {
        id: c.id,
        listingCode: plateFromCar(c.registrationNumber, c.description),
        make: c.make,
        model: c.model,
        year: c.year,
        title: c.title || `${c.make} ${c.model}`.trim(),
        status: c.status,
        dailyRateEur: Number(c.dailyRateEur) || 0,
        partnerName: c.partnerName || c.partnerEmail || c.partnerId || "—",
        partnerId: c.partnerId,
        partnerEmail: c.partnerEmail || "",
        partnerPhone: "",
        partnerCode: "",
        country: countries[0] || "—",
        bodyType: bodyTypeFromCarDescription(c.description) || "—",
        photoUrl: c.photos?.[0] || "",
        source: "file" as const,
        updatedAt: c.updatedAt,
        searchAirports,
        searchBlockers: listingSearchBlockers({
          status: c.status,
          hiddenReason: c.hiddenReason,
          activeAirports: searchAirports,
          insuranceExpired: expiredIds.has(c.id),
        }),
      };
      byId.set(c.id, {
        ...base,
        ...resolvePartner(base, partnerLookup.byId, partnerLookup.byEmail),
      });
    }
  } catch (error) {
    console.warn("[admin/cars] file cars", error);
  }

  try {
    const rows = await prisma.car.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        deliveryPrices: {
          select: {
            deliveryLocation: { select: { isActive: true, airport: { select: { iata: true } } } },
          },
        },
        partner: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            sequentialNumber: true,
            status: true,
          },
        },
      },
    });
    for (const c of rows) {
      const existing = byId.get(c.id);
      const updatedAt = c.updatedAt.toISOString();
      if (existing && Date.parse(existing.updatedAt) >= Date.parse(updatedAt)) {
        // Keep file row, but still fill PRT / phone from DB partner when missing.
        if (c.partner && (!existing.partnerCode || !existing.partnerPhone)) {
          byId.set(c.id, {
            ...existing,
            partnerCode: existing.partnerCode || formatPartnerCode(c.partner.sequentialNumber) || "",
            partnerPhone: existing.partnerPhone || c.partner.phone || "",
            partnerEmail: existing.partnerEmail || c.partner.email || "",
            partnerName:
              existing.partnerName !== "—"
                ? existing.partnerName
                : c.partner.companyName || existing.partnerName,
          });
        }
        continue;
      }
      const countries = countriesFromCarDescription(c.description);
      const searchAirports = uniqueAirports(
        c.deliveryPrices.flatMap((row) =>
          row.deliveryLocation?.isActive && row.deliveryLocation.airport?.iata
            ? [row.deliveryLocation.airport.iata]
            : [],
        ),
      );
      const base = {
        id: c.id,
        listingCode: plateFromCar(c.registrationNumber, c.description),
        make: c.make,
        model: c.model,
        year: c.year,
        title: c.title || `${c.make} ${c.model}`.trim(),
        status: c.status,
        dailyRateEur: Number(c.dailyRateEur) || 0,
        partnerName: c.partner?.companyName || c.partnerId || "—",
        partnerId: c.partnerId,
        partnerEmail: c.partner?.email || "",
        partnerPhone: c.partner?.phone || "",
        partnerCode: formatPartnerCode(c.partner?.sequentialNumber) || "",
        country: countries[0] || "—",
        bodyType: bodyTypeFromCarDescription(c.description) || "—",
        photoUrl: c.photos[0]?.url || "",
        source: "db" as const,
        updatedAt,
        searchAirports,
        searchBlockers: listingSearchBlockers({
          status: String(c.status),
          hiddenReason: c.hiddenReason,
          partnerStatus: c.partner?.status ? String(c.partner.status) : null,
          activeAirports: searchAirports,
          insuranceExpired: expiredIds.has(c.id),
        }),
      };
      byId.set(c.id, {
        ...base,
        ...resolvePartner(base, partnerLookup.byId, partnerLookup.byEmail),
      });
    }
  } catch (error) {
    if (isDbOfflineError(error)) dbOffline = true;
    else console.warn("[admin/cars] prisma cars", error);
  }

  const cars = [...byId.values()]
    .map((car) => ({
      ...car,
      ...resolvePartner(car, partnerLookup.byId, partnerLookup.byEmail),
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return { cars, dbOffline };
}
