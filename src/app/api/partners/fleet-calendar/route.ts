import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import { listCalendarBlocksForCars } from "@/lib/server/car-calendar-blocks-store";
import { parsePartnerMessengers } from "@/lib/partner";
import { readAllBookingMessengers } from "@/lib/server/booking-messengers-store";
import { displayBookingCharges } from "@/lib/bookings/booking-money";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { composeLocationAddress, findSearchPlace } from "@/lib/catalog/search-places";

function localizeName(name: unknown, locale = "en"): string {
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    const map = name as Record<string, string>;
    return map[locale] || map.en || map.ka || Object.values(map)[0] || "";
  }
  return "";
}

function airportLabel(
  airport: { iata: string; name: unknown } | null | undefined,
  fallback: string,
  locale: string,
) {
  if (!airport) return fallback || "—";
  const n = localizeName(airport.name, locale);
  return n ? `${n} (${airport.iata})` : airport.iata;
}

/** Prefer concrete address (airport / office / city), then airport name. */
function placeLabel(
  airport: { iata: string; name: unknown } | null | undefined,
  address: string | null | undefined,
  locale: string,
  fallback = "—",
) {
  const addr = String(address || "").trim();
  if (addr) {
    const city = findSearchPlace(String(airport?.iata || ""))?.cityName || "";
    return composeLocationAddress(city, addr);
  }
  const fromAirport = airportLabel(airport, "", locale);
  if (fromAirport && fromAirport !== "—") return fromAirport;
  return fallback;
}

function formatHour(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function resolvePartnerId(session: {
  user: { id: string; email?: string | null };
}): Promise<string | null> {
  const email = normalizeLogin(session.user.email || "");
  try {
    let partner = await prisma.partner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (partner) return partner.id;
    if (email) {
      partner = await prisma.partner.findFirst({
        where: { email },
        select: { id: true },
      });
      if (partner) return partner.id;
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const local = loadLocalPartner();
  if (
    local &&
    (session.user.id === LOCAL_PARTNER_ID ||
      session.user.id === local.id ||
      (email && normalizeLogin(local.email) === email))
  ) {
    return local.id;
  }
  return `file-partner-${session.user.id}`;
}

export async function GET(req: Request) {
  try {
    const session = await getPartnerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const fromRaw = url.searchParams.get("from");
    const toRaw = url.searchParams.get("to");
    const locale = url.searchParams.get("locale") || "en";
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    const from = fromRaw ? new Date(fromRaw) : new Date();
    const to = toRaw ? new Date(toRaw) : new Date(from.getTime() + 45 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const partnerId = await resolvePartnerId(session);

    // Flip expired-insurance APPROVED cars to remodeation before painting the calendar.
    try {
      const { applyExpiredInsuranceRemoderation } = await import(
        "@/lib/server/car-insurance-expiry"
      );
      const previewIds: string[] = [];
      try {
        if (partnerId && !partnerId.startsWith("file-partner-")) {
          const ids = await prisma.car.findMany({
            where: { partnerId },
            select: { id: true },
          });
          previewIds.push(...ids.map((c) => c.id));
        }
      } catch {
        /* offline — file cars still checked below */
      }
      const filePreview = await listFileCarsForPartner({
        userId: session.user.id,
        email: session.user.email,
        partnerId: partnerId || undefined,
      });
      for (const c of filePreview) {
        if (!previewIds.includes(c.id)) previewIds.push(c.id);
      }
      if (previewIds.length) {
        await applyExpiredInsuranceRemoderation({ carIds: previewIds });
      }
    } catch (error) {
      console.warn("[fleet-calendar] insurance expiry", error);
    }

    type CarOut = {
      id: string;
      label: string;
      make: string;
      model: string;
      year: number;
      title: string;
      status: string;
      registrationNumber: string | null;
      hiddenReason: string | null;
      rejectionNote: string | null;
    };
    const byId = new Map<string, CarOut>();
    let offline = false;

    try {
      if (partnerId && !partnerId.startsWith("file-partner-")) {
        const cars = await prisma.car.findMany({
          where: { partnerId },
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
            status: true,
            registrationNumber: true,
            hiddenReason: true,
          },
          orderBy: [{ make: "asc" }, { model: "asc" }, { year: "desc" }],
        });
        for (const c of cars) {
          byId.set(c.id, {
            id: c.id,
            label: c.title?.trim() || `${c.make} ${c.model}`,
            make: c.make,
            model: c.model,
            year: c.year,
            title: c.title,
            status: c.status,
            registrationNumber: c.registrationNumber ?? null,
            hiddenReason: c.hiddenReason ?? null,
            rejectionNote: null,
          });
        }
      }
    } catch (error) {
      if (!isDbOfflineError(error)) throw error;
      offline = true;
    }

    const fileCars = await listFileCarsForPartner({
      userId: session.user.id,
      email: session.user.email,
      partnerId: partnerId || undefined,
    });
    for (const c of fileCars) {
      if (byId.has(c.id)) {
        const existing = byId.get(c.id)!;
        if (!existing.hiddenReason && c.hiddenReason) {
          existing.hiddenReason = c.hiddenReason;
        }
        // Prefer fresher file status when insurance expiry remodeated the file copy.
        if (c.status === "PENDING_REMODERATION" && existing.status === "APPROVED") {
          existing.status = c.status;
          existing.hiddenReason = c.hiddenReason ?? existing.hiddenReason;
        }
        continue;
      }
      byId.set(c.id, {
        id: c.id,
        label: c.title?.trim() || `${c.make} ${c.model}`,
        make: c.make,
        model: c.model,
        year: c.year,
        title: c.title,
        status: c.status,
        registrationNumber: c.registrationNumber ?? null,
        hiddenReason: c.hiddenReason ?? null,
        rejectionNote: null,
      });
    }

    const cars = [...byId.values()].sort((a, b) =>
      `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`),
    );

    try {
      const { readCarRejectionNotices } = await import("@/lib/server/car-rejection-store");
      const notices = await readCarRejectionNotices(cars.map((c) => c.id));
      for (const car of cars) {
        const notice = notices.get(car.id);
        if (notice?.note) car.rejectionNote = notice.note;
        else if (car.status === "REJECTED" && car.hiddenReason) car.rejectionNote = car.hiddenReason;
      }
    } catch {
      for (const car of cars) {
        if (car.status === "REJECTED" && car.hiddenReason) car.rejectionNote = car.hiddenReason;
      }
    }

    try {
      const { isInsuranceExpired, readCarInsuranceDocs } = await import(
        "@/lib/server/car-insurance-store"
      );
      const { INSURANCE_EXPIRY_REASON } = await import("@/lib/cars/insurance-expiry-reason");
      const docs = await readCarInsuranceDocs(cars.map((car) => car.id));
      for (const car of cars) {
        if (car.status !== "PENDING" && car.status !== "PENDING_REMODERATION") continue;
        const expires = docs.get(car.id)?.insuranceExpiresAt;
        if (expires && isInsuranceExpired(expires)) {
          car.hiddenReason = INSURANCE_EXPIRY_REASON;
        }
      }
    } catch (error) {
      console.warn("[fleet-calendar] insurance reason", error);
    }

    const carIds = cars.map((c) => c.id);

    let mapped: Array<Record<string, unknown>> = [];
    if (carIds.length && !offline) {
      try {
        const bookings = await prisma.booking.findMany({
          where: {
            carId: { in: carIds },
            // Cancelled bookings free the calendar — do not show red bars.
            status: { notIn: ["UNFULFILLED", "CANCELLED"] },
            pickupAt: { lt: to },
            bufferEndsAt: { gt: from },
          },
          include: {
            pickupAirport: { select: { iata: true, name: true } },
            dropoffAirport: { select: { iata: true, name: true } },
            car: { select: { make: true, model: true, year: true, registrationNumber: true } },
            extras: {
              select: { id: true, label: true, priceEur: true, extraServiceId: true },
            },
          },
          orderBy: { pickupAt: "asc" },
        });

        const messengerMap = await readAllBookingMessengers();
        mapped = bookings
          .map((b) => {
            const guestName = `${b.guestFirstName} ${b.guestLastName}`.trim();
            const pickupLabel = placeLabel(b.pickupAirport, b.pickupAddress, locale);
            const dropoffLabel = placeLabel(b.dropoffAirport, b.dropoffAddress, locale);
            const pickupHour = formatHour(b.pickupAt);
            const dropoffHour = formatHour(b.dropoffAt);
            const totalPriceEur = Number(b.totalPriceEur);
            const depositPaidEur = Number(b.depositPaidEur);
            const balanceDueEur = Number(b.balanceDueEur);
            const extras = (b.extras || []).map((ex) => ({
              id: ex.extraServiceId || ex.id,
              label: ex.label,
              priceEur: Number(ex.priceEur),
            }));
            const extrasTotal = extras.reduce((sum, ex) => sum + ex.priceEur, 0);
            const charges = displayBookingCharges({
              totalPriceEur,
              depositPaidEur,
              balanceDueEur,
            });
            const rentalEstimate = Math.max(
              0,
              roundMoney(charges.tripEur - extrasTotal),
            );
            const messengers = parsePartnerMessengers(messengerMap[b.id], b.guestMessenger);
            return {
              id: b.id,
              sequentialNumber: b.sequentialNumber,
              carId: b.carId,
              status: b.status,
              kind: "booking" as const,
              pickupAt: b.pickupAt.toISOString(),
              dropoffAt: b.dropoffAt.toISOString(),
              bufferEndsAt: b.bufferEndsAt.toISOString(),
              createdAt: b.createdAt.toISOString(),
              guestName,
              guestFirstName: b.guestFirstName,
              guestLastName: b.guestLastName,
              guestEmail: b.guestEmail,
              guestPhone: b.guestPhone,
              guestMessenger: messengers[0] || b.guestMessenger,
              messengers,
              flightNumber: b.flightNumber,
              pickupAddress: b.pickupAddress ? pickupLabel : "",
              dropoffAddress: b.dropoffAddress ? dropoffLabel : "",
              pickupLabel,
              dropoffLabel,
              barLabel: `${pickupHour} ${pickupLabel}`,
              endLabel: `${dropoffLabel} ${dropoffHour}`,
              carLabel: `${b.car.make} ${b.car.model}`.trim(),
              registrationNumber: b.car.registrationNumber || "",
              totalPriceEur,
              depositPercent: b.depositPercent,
              depositPaidEur,
              balanceDueEur,
              rentalEstimateEur: rentalEstimate,
              extras,
            };
          })
          .filter((b) => {
            if (!q) return true;
            const digits = q.replace(/^[#dD]+/, "").replace(/\D/g, "") || q;
            const ref = String(b.sequentialNumber);
            return (
              ref === digits ||
              ref.includes(digits) ||
              `d${ref}`.includes(q) ||
              b.guestEmail.toLowerCase().includes(q) ||
              b.guestName.toLowerCase().includes(q) ||
              b.guestPhone.toLowerCase().includes(q) ||
              b.flightNumber.toLowerCase().includes(q)
            );
          });
      } catch (error) {
        if (!isDbOfflineError(error)) throw error;
        offline = true;
      }
    }

    const blocks = await listCalendarBlocksForCars(carIds, from, to);
    const blockBars = blocks.map((b) => {
      const startHour = formatHour(b.from);
      const endHour = formatHour(b.to);
      const total = Number(b.meta?.totalAmount || 0) || 0;
      const payNow = Number(b.meta?.payNow || 0) || 0;
      const payOnPickup = Number(b.meta?.payOnPickup || 0) || 0;
      const pickupLabel =
        String(b.meta?.pickupAddress || b.meta?.pickupCity || b.label || "").trim() || "—";
      const dropoffLabel =
        String(b.meta?.dropoffAddress || b.meta?.dropoffCity || b.label || "").trim() || "—";
      return {
        id: b.id,
        sequentialNumber: 0,
        carId: b.carId,
        status: "BLOCKED",
        kind: "block" as const,
        pickupAt: b.from,
        dropoffAt: b.to,
        bufferEndsAt: b.to,
        createdAt: b.createdAt,
        guestName: b.meta?.guestName || b.label,
        guestFirstName: b.meta?.guestName || b.label,
        guestLastName: "",
        guestEmail: b.meta?.guestEmail || "",
        guestPhone: b.meta?.guestPhone || "",
        guestMessenger: (b.meta?.messengers || [])[0] || "",
        flightNumber: "",
        pickupAddress: b.meta?.pickupAddress || "",
        dropoffAddress: b.meta?.dropoffAddress || "",
        pickupLabel,
        dropoffLabel,
        barLabel: `${startHour} ${pickupLabel}`,
        endLabel: `${dropoffLabel} ${endHour}`,
        source: b.source,
        carLabel: "",
        registrationNumber: "",
        totalPriceEur: total,
        depositPercent: Number(b.meta?.deposit || 0) || 0,
        depositPaidEur: payNow,
        balanceDueEur: payOnPickup,
        rentalEstimateEur: total,
        extras: [] as Array<{ id: string; label: string; priceEur: number }>,
        pickupNote: b.meta?.pickupNote || "",
        dropoffNote: b.meta?.dropoffNote || "",
        messengers: b.meta?.messengers || [],
        dateOfBirth: b.meta?.dateOfBirth || "",
      };
    });

    // Site bookings saved to file store (when DB was offline) — show as green booking bars.
    let fileBookingBars: Array<Record<string, unknown>> = [];
    try {
      const { listFileBookingsForCars } = await import("@/lib/server/customer-bookings-store");
      const fileBookings = await listFileBookingsForCars(carIds, from, to, {
        includeCancelled: false,
      });
      const mappedIds = new Set(mapped.map((b) => String(b.id)));
      for (const b of fileBookings) {
        if (b.status === "UNFULFILLED" || b.status === "CANCELLED") continue;
        if (mappedIds.has(b.id)) continue;
        const known = byId.get(b.carId);
        const guestName = `${b.guestFirstName} ${b.guestLastName}`.trim();
        const pickupHour = formatHour(b.pickupAt);
        const dropoffHour = formatHour(b.dropoffAt);
        const pickupLabel = b.pickupAddress
          ? composeLocationAddress(findSearchPlace(b.pickupAirportIata)?.cityName, b.pickupAddress)
          : String(b.pickupAirportIata || "—").trim() || "—";
        const dropoffLabel = b.dropoffAddress
          ? composeLocationAddress(findSearchPlace(b.dropoffAirportIata)?.cityName, b.dropoffAddress)
          : String(b.dropoffAirportIata || "—").trim() || "—";
        fileBookingBars.push({
          id: b.id,
          sequentialNumber: b.sequentialNumber,
          carId: b.carId,
          status: b.status,
          kind: "booking" as const,
          pickupAt: b.pickupAt,
          dropoffAt: b.dropoffAt,
          bufferEndsAt: b.bufferEndsAt,
          createdAt: b.createdAt,
          guestName,
          guestFirstName: b.guestFirstName,
          guestLastName: b.guestLastName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          guestMessenger: parsePartnerMessengers(b.guestMessengers, b.guestMessenger)[0] || b.guestMessenger,
          messengers: parsePartnerMessengers(b.guestMessengers, b.guestMessenger),
          flightNumber: b.flightNumber,
          pickupAddress: b.pickupAddress ? pickupLabel : "",
          dropoffAddress: b.dropoffAddress ? dropoffLabel : "",
          pickupLabel,
          dropoffLabel,
          barLabel: `${pickupHour} ${pickupLabel}`,
          endLabel: `${dropoffLabel} ${dropoffHour}`,
          carLabel: known ? `${known.make} ${known.model}`.trim() : "",
          registrationNumber: known?.registrationNumber || "",
          totalPriceEur: b.totalPriceEur,
          depositPercent: b.depositPercent,
          depositPaidEur: b.depositPaidEur,
          balanceDueEur: b.balanceDueEur,
          rentalEstimateEur: (() => {
            const extrasSum = (b.extras || []).reduce(
              (sum, ex) => sum + (Number(ex.priceEur) || 0),
              0,
            );
            const charges = displayBookingCharges({
              totalPriceEur: Number(b.totalPriceEur) || 0,
              depositPaidEur: Number(b.depositPaidEur) || 0,
              balanceDueEur: Number(b.balanceDueEur) || 0,
            });
            return Math.max(0, roundMoney(charges.tripEur - extrasSum));
          })(),
          extras: (b.extras || []).map((ex) => ({
            id: ex.id,
            label: ex.label,
            priceEur: Number(ex.priceEur) || 0,
          })),
          source: "website",
        });
      }
    } catch (error) {
      console.warn("[partners/fleet-calendar] file bookings", error);
    }

    const allBars = [...mapped, ...fileBookingBars, ...blockBars];
    let updatedIds = new Set<string>();
    try {
      const { listPartnerUpdatedBookingIds } = await import(
        "@/lib/server/partner-booking-update-store"
      );
      // Read-only on calendar GET — pruning writes made every open slower.
      updatedIds = new Set(await listPartnerUpdatedBookingIds());
    } catch {
      /* optional */
    }

    const bookingsWithFlags = allBars.map((b) => {
      const id = String((b as { id?: string }).id || "");
      const kind = (b as { kind?: string }).kind;
      return {
        ...b,
        updatedUnread: kind !== "block" && updatedIds.has(id),
      };
    });

    return NextResponse.json(
      {
        range: { from: from.toISOString(), to: to.toISOString() },
        offline,
        partnerId,
        cars,
        bookings: bookingsWithFlags,
        blocks: blockBars,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[partners/fleet-calendar]", error);
    return NextResponse.json({ error: "Could not load calendar" }, { status: 500 });
  }
}
