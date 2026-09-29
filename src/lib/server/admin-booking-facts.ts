import "server-only";

import { fullName, toNumber } from "@/lib/utils";
import { formatPartnerCode } from "@/lib/ids";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { composeLocationAddress, findSearchPlace } from "@/lib/catalog/search-places";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { parseCarDetails } from "@/lib/cars/car-details";
import { countriesFromCarDescription } from "@/lib/cars/listing-meta";
import {
  resolveEffectiveCategorySlug,
  type ListingFilterCategory,
} from "@/lib/cars/listing-filter-match";
import { listHomepageCategories } from "@/lib/server/homepage-categories-store";
import { listAllFileBookings } from "@/lib/server/customer-bookings-store";
import { listFileCars } from "@/lib/server/partner-cars-store";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { readCompanySettingsFile } from "@/lib/server/partner-company-settings-store";
import {
  listRetainedBookingFacts,
  saveRetainedBookingFact,
} from "@/lib/server/retained-booking-facts";

export type AdminBookingFact = {
  id: string;
  sequentialNumber: number;
  status: string;
  createdAt: string;
  pickupAt: string;
  dropoffAt: string;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  guestName: string;
  carMake: string;
  carModel: string;
  carTitle: string;
  carLabel: string;
  categorySlug: string | null;
  pickupIata: string;
  pickupTitle: string;
  partnerName: string;
  partnerCode: string;
  countryIso2: string;
  countryLabel: string;
};

async function adminCarCategories(): Promise<ListingFilterCategory[]> {
  try {
    const rows = await listHomepageCategories();
    return rows
      .filter((row) => row.isActive)
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        mappedModels: row.mappedModels,
      }));
  } catch (error) {
    console.warn("[admin-booking-facts] categories", error);
    return [];
  }
}

/** Category the administrator's list assigned to this car, not a name guess. */
function assignedCategorySlug(
  car: {
    make?: string | null;
    model?: string | null;
    categorySlug?: string | null;
    description?: string | null;
  },
  categories: ListingFilterCategory[],
) {
  return resolveEffectiveCategorySlug(
    {
      make: car.make || "",
      model: car.model || "",
      categorySlug: car.categorySlug || null,
      categoryLabel: null,
      description: car.description || "",
    },
    categories,
  );
}

function airportTitle(iata: string, address: string) {
  const code = iata.trim().toUpperCase();
  const place = address.trim();
  const city = findSearchPlace(code)?.cityName || "";
  const full = place ? composeLocationAddress(city, place) : "";
  if (full && code) return `${full} (${code})`;
  return full || code || "—";
}

export async function loadAdminBookingFacts(): Promise<AdminBookingFact[]> {
  const facts: AdminBookingFact[] = [];
  const seen = new Set<string>();
  const categories = await adminCarCategories();

  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.booking.findMany({
      include: {
        car: true,
        customer: true,
        pickupAirport: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const partnerIds = [
      ...new Set(rows.map((row) => row.car?.partnerId).filter((id): id is string => Boolean(id))),
    ];
    const partners = partnerIds.length
      ? await prisma.partner.findMany({
          where: { id: { in: partnerIds } },
          select: { id: true, companyName: true, sequentialNumber: true },
        })
      : [];
    const partnerById = new Map(partners.map((partner) => [partner.id, partner]));

    for (const row of rows) {
      seen.add(row.id);
      const partner = row.car?.partnerId ? partnerById.get(row.car.partnerId) : undefined;
      const iata = row.pickupAirport?.iata || "";
      const airportName =
        row.pickupAirport?.name &&
        typeof row.pickupAirport.name === "object" &&
        "en" in row.pickupAirport.name
          ? String((row.pickupAirport.name as { en?: string }).en || iata)
          : iata;
      facts.push({
        id: row.id,
        sequentialNumber: row.sequentialNumber || 0,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        pickupAt: row.pickupAt.toISOString(),
        dropoffAt: row.dropoffAt.toISOString(),
        totalPriceEur: toNumber(row.totalPriceEur),
        depositPaidEur: toNumber(row.depositPaidEur),
        balanceDueEur: toNumber(row.balanceDueEur),
        guestName:
          fullName(row.guestFirstName, row.guestLastName) ||
          fullName(row.customer?.firstName, row.customer?.lastName) ||
          row.guestEmail ||
          "—",
        carMake: row.car?.make || "",
        carModel: row.car?.model || "",
        carTitle: row.car?.title || "",
        carLabel: `${row.car?.make || ""} ${row.car?.model || ""}`.trim() || "—",
        categorySlug: row.car
          ? assignedCategorySlug(
              {
                make: row.car.make,
                model: row.car.model,
                categorySlug: row.car.categorySlug,
                description: row.car.description,
              },
              categories,
            )
          : null,
        pickupIata: iata,
        pickupTitle: airportTitle(iata, airportName),
        partnerName: partner?.companyName || "—",
        partnerCode: formatPartnerCode(partner?.sequentialNumber) ?? "",
        countryIso2: "XX",
        countryLabel: "Unknown",
      });
    }
  } catch (error) {
    if (!isDbOfflineError(error)) console.warn("[admin-booking-facts] prisma", error);
  }

  try {
    const [fileBookings, fileCars] = await Promise.all([listAllFileBookings(), listFileCars()]);
    const carById = new Map(fileCars.map((car) => [car.id, car]));
    const local = loadLocalPartner();
    const settingsCache = new Map<string, Awaited<ReturnType<typeof readCompanySettingsFile>>>();
    let deliveryIsoById = new Map<string, string>();
    try {
      const { listDeliveryLocations } = await import("@/lib/server/delivery-locations");
      const locations = await listDeliveryLocations({ activeOnly: false });
      deliveryIsoById = new Map(
        locations.map((loc) => [loc.id, String(loc.countryIso2 || "").toUpperCase()]),
      );
    } catch {
      /* optional */
    }

    async function companySettings(partnerId: string) {
      if (settingsCache.has(partnerId)) return settingsCache.get(partnerId) ?? null;
      const row = await readCompanySettingsFile(partnerId);
      settingsCache.set(partnerId, row);
      return row;
    }

    for (const booking of fileBookings) {
      if (seen.has(booking.id)) continue;
      const car = carById.get(booking.carId);
      let partnerName = car?.partnerName || car?.partnerEmail || car?.partnerId || "—";
      let partnerCode = "";
      const partnerIds = [
        car?.partnerId,
        car?.partnerId?.startsWith("file-partner-")
          ? car.partnerId.replace(/^file-partner-/, "")
          : "",
        LOCAL_PARTNER_ID,
      ].filter(Boolean) as string[];
      for (const partnerId of partnerIds) {
        const settings = await companySettings(partnerId);
        if (settings) {
          partnerName = settings.legalName || settings.title || partnerName;
          break;
        }
      }
      if (local && (!car?.partnerId || String(car.partnerId).includes("local-partner"))) {
        partnerName = local.companyName || partnerName;
        partnerCode = formatPartnerCode(local.sequentialNumber) ?? "";
      }

      let countryIso2 = "XX";
      let countryLabel = "Unknown";
      const details = parseCarDetails(car?.description);
      const places = Array.isArray(details?.pickupPlaces) ? details.pickupPlaces : [];
      for (const place of places) {
        if (!place || typeof place !== "object") continue;
        const row = place as { cityKey?: string; countryIso2?: string };
        const fromKey = String(row.cityKey || "").split("::")[0]?.trim().toUpperCase();
        const iso =
          (row.countryIso2 ? String(row.countryIso2).toUpperCase() : "") ||
          (fromKey.length === 2 ? fromKey : "");
        if (iso) {
          countryIso2 = iso;
          countryLabel = worldCountryName(iso) || iso;
          break;
        }
      }
      if (countryIso2 === "XX" && car?.deliveryPrices?.length) {
        for (const price of car.deliveryPrices) {
          const iso = deliveryIsoById.get(price.deliveryLocationId);
          if (iso) {
            countryIso2 = iso;
            countryLabel = worldCountryName(iso) || iso;
            break;
          }
        }
      }
      if (countryIso2 === "XX" && car?.description) {
        const label = countriesFromCarDescription(car.description);
        if (label && label !== "—") countryLabel = label;
      }

      const iata = booking.pickupAirportIata || "";
      seen.add(booking.id);
      facts.push({
        id: booking.id,
        sequentialNumber: booking.sequentialNumber || 0,
        status: booking.status,
        createdAt: booking.createdAt,
        pickupAt: booking.pickupAt,
        dropoffAt: booking.dropoffAt,
        totalPriceEur: toNumber(booking.totalPriceEur),
        depositPaidEur: toNumber(booking.depositPaidEur),
        balanceDueEur: toNumber(booking.balanceDueEur),
        guestName: fullName(booking.guestFirstName, booking.guestLastName) || booking.guestEmail || "—",
        carMake: car?.make || "",
        carModel: car?.model || "",
        carTitle: car?.title || "",
        carLabel: car ? `${car.make} ${car.model}`.trim() : booking.carId.slice(0, 8),
        categorySlug: car ? assignedCategorySlug(car, categories) : null,
        pickupIata: iata,
        pickupTitle: airportTitle(iata, booking.pickupAddress || ""),
        partnerName,
        partnerCode,
        countryIso2,
        countryLabel,
      });
    }
  } catch (error) {
    console.warn("[admin-booking-facts] file", error);
  }

  try {
    for (const fact of await listRetainedBookingFacts()) {
      if (seen.has(fact.id)) continue;
      seen.add(fact.id);
      facts.push(fact);
    }
  } catch (error) {
    console.warn("[admin-booking-facts] retained", error);
  }

  facts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return facts;
}

/** Freeze the booking for finance and statistics before it leaves the live list. */
export async function archiveBookingForReports(id: string): Promise<boolean> {
  const fact = (await loadAdminBookingFacts()).find((row) => row.id === id);
  if (!fact) return false;
  await saveRetainedBookingFact(fact);
  return true;
}
