import { NextResponse } from "next/server";
import { getAdminSession, getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { getFileCar, isFileCarOwner } from "@/lib/server/partner-cars-store";
import {
  createCalendarBlock,
  deleteCalendarBlock,
  getCalendarBlock,
  updateCalendarBlock,
} from "@/lib/server/car-calendar-blocks-store";
import { carHasBookingConflict } from "@/lib/server/car-availability";

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
      partner = await prisma.partner.findFirst({ where: { email }, select: { id: true } });
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

async function partnerOwnsCar(
  session: { user: { id: string; email?: string | null } },
  partnerId: string,
  carId: string,
) {
  try {
    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: { partnerId: true },
    });
    if (car) return car.partnerId === partnerId;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const fileCar = await getFileCar(carId);
  return Boolean(fileCar && isFileCarOwner(fileCar, session.user));
}

export async function POST(req: Request) {
  const partnerSession = await getPartnerSession();
  const adminSession = await getAdminSession();
  const isAdmin = adminSession?.user.role === "ADMIN";
  if (!partnerSession?.user && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const carId = String(body.carId || "").trim();
  const from = String(body.from || "").trim();
  const to = String(body.to || "").trim();
  const label = String(body.label || "Rental office").trim() || "Rental office";
  const meta =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as Record<string, unknown>)
      : undefined;
  if (!carId || !from || !to) {
    return NextResponse.json({ error: "carId, from and to are required" }, { status: 400 });
  }
  const { pickupInstantTooSoon } = await import("@/lib/bookings/lead-time");
  if (pickupInstantTooSoon(new Date(from))) {
    return NextResponse.json(
      { error: "Pickup must be at least 2 hours from now" },
      { status: 400 },
    );
  }

  let partnerId = String(body.partnerId || "").trim();
  let source: "PARTNER" | "ADMIN" = "PARTNER";

  if (isAdmin && !partnerSession?.user) {
    source = "ADMIN";
    if (!partnerId) {
      try {
        const car = await prisma.car.findUnique({ where: { id: carId }, select: { partnerId: true } });
        partnerId = car?.partnerId || "";
      } catch {
        const fileCar = await getFileCar(carId);
        partnerId = fileCar?.partnerId || "";
      }
    }
    if (!partnerId) {
      return NextResponse.json({ error: "Partner not found for car" }, { status: 400 });
    }
  } else if (partnerSession?.user) {
    partnerId = (await resolvePartnerId(partnerSession)) || "";
    if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });
    const owns = await partnerOwnsCar(partnerSession, partnerId, carId);
    if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    source = isAdmin ? "ADMIN" : "PARTNER";
  }

  try {
    if (await carHasBookingConflict(carId, new Date(from), new Date(to))) {
      return NextResponse.json(
        { error: "Dates conflict with an existing booking on this car" },
        { status: 409 },
      );
    }
    const block = await createCalendarBlock({
      carId,
      partnerId,
      from,
      to,
      label,
      source,
      meta: meta as import("@/lib/server/car-calendar-blocks-store").CarCalendarBlockMeta | undefined,
    });
    return NextResponse.json({ block });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create block" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const partnerSession = await getPartnerSession();
  const adminSession = await getAdminSession();
  const isAdmin = adminSession?.user.role === "ADMIN";
  if (!partnerSession?.user && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (isAdmin && !partnerSession?.user) {
    const removed = await deleteCalendarBlock(id);
    return NextResponse.json({ ok: removed });
  }

  const partnerId = partnerSession ? await resolvePartnerId(partnerSession) : null;
  if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });
  const removed = await deleteCalendarBlock(id, partnerId);
  return NextResponse.json({ ok: removed });
}

export async function PATCH(req: Request) {
  const partnerSession = await getPartnerSession();
  const adminSession = await getAdminSession();
  const isAdmin = adminSession?.user.role === "ADMIN";
  if (!partnerSession?.user && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const from = body.from != null ? String(body.from).trim() : undefined;
  const to = body.to != null ? String(body.to).trim() : undefined;
  const label = body.label != null ? String(body.label).trim() : undefined;
  const meta =
    body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
      ? (body.meta as import("@/lib/server/car-calendar-blocks-store").CarCalendarBlockMeta)
      : undefined;

  try {
    const current = await getCalendarBlock(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const nextFrom = from != null ? new Date(from) : new Date(current.from);
    const nextTo = to != null ? new Date(to) : new Date(current.to);

    if (from != null && Math.abs(nextFrom.getTime() - new Date(current.from).getTime()) > 60_000) {
      const { pickupInstantTooSoon } = await import("@/lib/bookings/lead-time");
      if (pickupInstantTooSoon(nextFrom)) {
        return NextResponse.json(
          { error: "Pickup must be at least 2 hours from now" },
          { status: 400 },
        );
      }
    }

    if (from != null || to != null) {
      if (await carHasBookingConflict(current.carId, nextFrom, nextTo, { excludeBlockId: id })) {
        return NextResponse.json(
          { error: "Dates conflict with an existing booking on this car" },
          { status: 409 },
        );
      }
    }

    if (isAdmin && !partnerSession?.user) {
      const block = await updateCalendarBlock(id, { from, to, label, meta });
      if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ block });
    }

    const partnerId = partnerSession ? await resolvePartnerId(partnerSession) : null;
    if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });
    const block = await updateCalendarBlock(id, { from, to, label, meta }, partnerId);
    if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ block });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
      { status: 400 },
    );
  }
}
