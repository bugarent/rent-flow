import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { getFileCar, isFileCarOwner } from "@/lib/server/partner-cars-store";
import {
  addBookingMessage,
  ensureSystemPaymentMessage,
  listBookingMessages,
} from "@/lib/server/booking-messages-store";

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

async function partnerCanAccessBooking(
  session: { user: { id: string; email?: string | null } },
  partnerId: string,
  bookingId: string,
): Promise<{ ok: boolean; createdAt?: string; depositPaidEur?: number }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        createdAt: true,
        depositPaidEur: true,
        car: { select: { partnerId: true, id: true } },
      },
    });
    if (booking) {
      if (booking.car.partnerId === partnerId) {
        return {
          ok: true,
          createdAt: booking.createdAt.toISOString(),
          depositPaidEur: Number(booking.depositPaidEur),
        };
      }
      const fileCar = await getFileCar(booking.car.id);
      if (fileCar && isFileCarOwner(fileCar, session.user)) {
        return {
          ok: true,
          createdAt: booking.createdAt.toISOString(),
          depositPaidEur: Number(booking.depositPaidEur),
        };
      }
      return { ok: false };
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  // Offline / calendar-block ids — allow partner messages keyed by any id they opened.
  return { ok: true };
}

export async function GET(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });

  const bookingId = new URL(req.url).searchParams.get("bookingId") || "";
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const access = await partnerCanAccessBooking(session, partnerId, bookingId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (access.createdAt && access.depositPaidEur != null && access.depositPaidEur > 0) {
    await ensureSystemPaymentMessage({
      bookingId,
      paidAt: access.createdAt,
      amountLabel: `€${access.depositPaidEur.toFixed(2)}`,
    }).catch(() => undefined);
  }

  const messages = await listBookingMessages(bookingId);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getPartnerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = await resolvePartnerId(session);
  if (!partnerId) return NextResponse.json({ error: "Partner profile required" }, { status: 403 });

  const body = await req.json();
  const bookingId = String(body.bookingId || "").trim();
  const text = String(body.body || "").trim();
  if (!bookingId || !text) {
    return NextResponse.json({ error: "bookingId and body required" }, { status: 400 });
  }

  const access = await partnerCanAccessBooking(session, partnerId, bookingId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const message = await addBookingMessage({
      bookingId,
      author: "partner",
      body: text,
    });
    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
