import "server-only";

import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { normalizeLogin } from "@/lib/crypto";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { getFileCar, isFileCarOwner } from "@/lib/server/partner-cars-store";
import { getFileBooking } from "@/lib/server/customer-bookings-store";

export async function resolvePartnerId(session: {
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

export async function assertPartnerOwnsBooking(
  bookingId: string,
  partnerId: string,
  user: { id: string; email?: string | null },
): Promise<
  | { kind: "db"; booking: { id: string; carId: string } }
  | { kind: "file"; booking: NonNullable<Awaited<ReturnType<typeof getFileBooking>>> }
  | null
> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { car: { select: { partnerId: true, id: true } } },
    });
    if (booking) {
      const ownsDb = booking.car.partnerId === partnerId;
      const fileCar = ownsDb ? null : await getFileCar(booking.carId);
      const ownsFile = Boolean(fileCar && isFileCarOwner(fileCar, user));
      if (ownsDb || ownsFile) return { kind: "db", booking: { id: booking.id, carId: booking.carId } };
      return null;
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const fileBooking = await getFileBooking(bookingId);
  if (!fileBooking) return null;
  const fileCar = await getFileCar(fileBooking.carId);
  if (!fileCar || !isFileCarOwner(fileCar, user)) return null;
  return { kind: "file", booking: fileBooking };
}
