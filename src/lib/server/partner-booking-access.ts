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
      const owns =
        booking.car.partnerId === partnerId ||
        (await partnerOwnsCar(booking.carId, partnerId, user));
      if (owns) return { kind: "db", booking: { id: booking.id, carId: booking.carId } };
      return null;
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }

  const fileBooking = await getFileBooking(bookingId);
  if (!fileBooking) return null;
  if (!(await partnerOwnsCar(fileBooking.carId, partnerId, user))) return null;
  return { kind: "file", booking: fileBooking };
}

/** Same ownership rules as the partner bookings list (file car ids, user, email, or DB car). */
async function partnerOwnsCar(
  carId: string,
  partnerId: string,
  user: { id: string; email?: string | null },
): Promise<boolean> {
  const fileCar = await getFileCar(carId);
  if (fileCar) {
    if (isFileCarOwner(fileCar, user)) return true;
    const ids = new Set([partnerId, `file-partner-${partnerId}`, user.id, `file-partner-${user.id}`]);
    if (ids.has(fileCar.partnerId) || ids.has(fileCar.partnerUserId)) return true;
  }
  try {
    const car = await prisma.car.findUnique({ where: { id: carId }, select: { partnerId: true } });
    if (car?.partnerId === partnerId) return true;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  return false;
}
