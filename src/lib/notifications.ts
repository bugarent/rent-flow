import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/brand";
import { formatBookingRef } from "@/lib/ids";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { sendPartnerMail } from "@/lib/mail";
import { normalizeLogin } from "@/lib/crypto";
import { storedTripAndPickupDue } from "@/lib/bookings/booking-money";
import { composeLocationAddress, findSearchPlace } from "@/lib/catalog/search-places";
import { parsePartnerMessengers } from "@/lib/partner";
import { getPlatformSettings } from "@/lib/server/platform-settings-store";
import {
  listStoredPartnerChatIds,
  rememberPartnerChat,
} from "@/lib/telegram/notify-chats";
import { resolveAdminTelegramChatIds } from "@/lib/telegram/notify-admin";
import type { FileBookingRecord } from "@/lib/server/customer-bookings-store";

export type BookingNoticeEvent = "BOOKING_NEW" | "BOOKING_EDITED" | "BOOKING_CANCELLED";

type NoticeSnapshot = {
  id: string;
  sequentialNumber: number;
  flightNumber: string;
  pickupAt: Date;
  dropoffAt: Date;
  pickupAddress: string;
  dropoffAddress: string;
  pickupIata: string;
  dropoffIata: string;
  guestFirstName: string;
  guestLastName: string;
  guestPhone: string;
  guestEmail: string;
  messengers: string[];
  carLabel: string;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  extras: Array<{ label: string; priceEur: number }>;
};

function formatWhen(d: Date) {
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function messengerLabel(platform: string) {
  const key = platform.toUpperCase();
  if (key === "VIBER") return "ვიბერი";
  if (key === "WHATSAPP") return "ვაცაპი";
  if (key === "TELEGRAM") return "ტელეგრამი";
  return platform;
}

function noticeSubject(event: BookingNoticeEvent, reference: string | null) {
  const ref = reference ? ` · ${reference}` : "";
  if (event === "BOOKING_EDITED") return `მოხდა ცვლილება${ref}`;
  if (event === "BOOKING_CANCELLED") return `ჯავშანი გაუქმდა${ref}`;
  return `ახალი ჯავშანი${ref}`;
}

function noticePlace(iata: string, address: string) {
  const code = String(iata || "").trim();
  const street = String(address || "").trim();
  const city = findSearchPlace(code)?.cityName || "";
  const full = street ? composeLocationAddress(city, street) : "";
  return [code, full].filter(Boolean).join(" — ");
}

function noticeHeadline(event: BookingNoticeEvent) {
  if (event === "BOOKING_EDITED") return "მოხდა ცვლილება";
  if (event === "BOOKING_CANCELLED") return "ჯავშანი გაუქმდა";
  return "ახალი ჯავშანი";
}

function noticeText(
  event: BookingNoticeEvent,
  booking: NoticeSnapshot,
  siteName: string,
  extras?: { cancellationReason?: string; refundEur?: number },
) {
  const reference = formatBookingRef(booking.sequentialNumber) || `#${booking.sequentialNumber}`;
  const money = storedTripAndPickupDue({
    totalPriceEur: booking.totalPriceEur,
    depositPaidEur: booking.depositPaidEur,
    balanceDueEur: booking.balanceDueEur,
  });
  const pickup = noticePlace(booking.pickupIata, booking.pickupAddress);
  const dropoff = noticePlace(booking.dropoffIata, booking.dropoffAddress);
  const extrasLines = booking.extras.filter((ex) => ex.label.trim());
  const messengerLine = booking.messengers.map(messengerLabel).join(", ");
  const reason = String(extras?.cancellationReason || "").trim();
  const refundEur = Number(extras?.refundEur) || 0;

  return [
    `${noticeHeadline(event)} · ${siteName}`,
    `რეფერენსი: ${reference}`,
    `მანქანა: ${booking.carLabel}`,
    `აღება: ${pickup || "—"}`,
    `  ${formatWhen(booking.pickupAt)}`,
    `დაბრუნება: ${dropoff || "—"}`,
    `  ${formatWhen(booking.dropoffAt)}`,
    booking.flightNumber ? `რეისი: ${booking.flightNumber}` : null,
    `კლიენტი: ${`${booking.guestFirstName} ${booking.guestLastName}`.trim() || "—"}`,
    `ტელეფონი: ${booking.guestPhone || "—"}`,
    `ელფოსტა: ${booking.guestEmail || "—"}`,
    messengerLine ? `სოციალური ქსელი: ${messengerLine}` : null,
    extrasLines.length
      ? `მომსახურება:\n${extrasLines.map((ex) => `  ${ex.label} — €${Number(ex.priceEur || 0).toFixed(2)}`).join("\n")}`
      : "მომსახურება: არ არის არჩეული",
    `ჯამური ფასი: €${money.tripEur.toFixed(2)}`,
    `მანქანის აღებისას გადასახდელი: €${money.dueAtPickupEur.toFixed(2)}`,
    event === "BOOKING_CANCELLED" && reason ? `გაუქმების მიზეზი: ${reason}` : null,
    event === "BOOKING_CANCELLED" && refundEur > 0
      ? `დასაბრუნებელი (საიტის საკომისიო): €${refundEur.toFixed(2)}`
      : event === "BOOKING_CANCELLED"
        ? "დასაბრუნებელი: არ არის (საიტის საკომისიო არ ბრუნდება)"
        : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function siteName(): Promise<string> {
  try {
    const settings = await getPlatformSettings();
    return settings.telegramBotSiteName || SITE_NAME;
  } catch {
    return SITE_NAME;
  }
}

async function adminChatIds(): Promise<string[]> {
  return resolveAdminTelegramChatIds();
}

async function deliverBookingNotice(input: {
  event: BookingNoticeEvent;
  booking: NoticeSnapshot;
  partnerEmails: string[];
  partnerChatIds: string[];
  userId?: string | null;
  cancellationReason?: string;
  refundEur?: number;
}) {
  const name = await siteName();
  const reference = formatBookingRef(input.booking.sequentialNumber);
  const text = noticeText(input.event, input.booking, name, {
    cancellationReason: input.cancellationReason,
    refundEur: input.refundEur,
  });
  const subject = noticeSubject(input.event, reference);

  const emails = [...input.partnerEmails, input.booking.guestEmail]
    .map((email) => email.trim())
    .filter((email, index, all) => email && all.findIndex((item) => normalizeLogin(item) === normalizeLogin(email)) === index);

  for (const to of emails) {
    try {
      await sendPartnerMail({
        to,
        subject,
        text,
        event: input.event,
        userId: input.userId,
        payload: {
          bookingId: input.booking.id,
          reference,
          role: normalizeLogin(to) === normalizeLogin(input.booking.guestEmail) ? "guest" : "partner",
          ...(input.cancellationReason ? { cancellationReason: input.cancellationReason } : {}),
          ...(input.refundEur != null ? { refundEur: input.refundEur } : {}),
        },
      });
    } catch (error) {
      console.warn("[notify] email failed", error);
    }
  }

  if (input.event === "BOOKING_NEW") {
    try {
      const { notifyBookingTelegramBot } = await import("@/lib/telegram/notify-booking-bot");
      await notifyBookingTelegramBot({
        carLabel: input.booking.carLabel,
        pickupIata: input.booking.pickupIata,
        dropoffIata: input.booking.dropoffIata,
        pickupAddress: input.booking.pickupAddress,
        dropoffAddress: input.booking.dropoffAddress,
        pickupAt: input.booking.pickupAt,
        dropoffAt: input.booking.dropoffAt,
        totalPriceEur: input.booking.totalPriceEur,
        paidEur: input.booking.depositPaidEur,
        dueOnSiteEur: input.booking.balanceDueEur,
      });
    } catch (error) {
      console.warn("[notify] booking bot failed", error);
    }
  }

  const chats = [...new Set([...input.partnerChatIds, ...(await adminChatIds())].map((id) => id.trim()).filter(Boolean))];
  for (const chatId of chats) {
    const sent = await sendTelegramMessage(chatId, text);
    try {
      await prisma.notificationLog.create({
        data: {
          userId: input.userId ?? undefined,
          bookingId: input.booking.id,
          channel: "TELEGRAM",
          event: input.event,
          recipient: chatId,
          payload: {
            reference,
            ok: sent.ok,
            error: sent.error ?? null,
            ...(input.refundEur != null ? { refundEur: input.refundEur } : {}),
          },
        },
      });
    } catch {
      console.info("[notify] telegram", { chatId, ok: sent.ok, error: sent.error ?? null, event: input.event });
    }
  }
  if (!chats.length) {
    console.info("[notify] no telegram chat for partner or admin", { bookingId: input.booking.id, event: input.event });
  }
}

export async function notifyBookingEvent(
  bookingId: string,
  event: BookingNoticeEvent,
  opts?: { cancellationReason?: string; refundEur?: number },
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      extras: true,
      pickupAirport: true,
      dropoffAirport: true,
      car: { include: { partner: { include: { user: true } } } },
    },
  });
  if (!booking) return;

  const partner = booking.car.partner;
  const partnerEmails = [partner.email, partner.user?.email].filter(
    (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index,
  );
  const chatIds = new Set<string>();
  const prismaChat = partner.telegramChatId?.trim();
  if (prismaChat) {
    chatIds.add(prismaChat);
    await rememberPartnerChat({
      chatId: prismaChat,
      partnerId: partner.id,
      email: partner.email,
    });
  }
  for (const chatId of await listStoredPartnerChatIds({
    partnerId: partner.id,
    email: partner.email,
  })) {
    chatIds.add(chatId);
  }

  let messengers = parsePartnerMessengers(null, booking.guestMessenger);
  try {
    const { readBookingMessengers } = await import("@/lib/server/booking-messengers-store");
    const stored = await readBookingMessengers(booking.id);
    if (stored.length) messengers = stored;
  } catch {
    /* optional */
  }

  await deliverBookingNotice({
    event,
    userId: booking.customerId,
    partnerEmails,
    partnerChatIds: [...chatIds],
    cancellationReason: opts?.cancellationReason,
    refundEur: opts?.refundEur,
    booking: {
      id: booking.id,
      sequentialNumber: booking.sequentialNumber,
      flightNumber: booking.flightNumber,
      pickupAt: booking.pickupAt,
      dropoffAt: booking.dropoffAt,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupIata: booking.pickupAirport.iata,
      dropoffIata: booking.dropoffAirport.iata,
      guestFirstName: booking.guestFirstName,
      guestLastName: booking.guestLastName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      messengers,
      carLabel: `${booking.car.make} ${booking.car.model} ${booking.car.year}`.trim(),
      totalPriceEur: Number(booking.totalPriceEur),
      depositPaidEur: Number(booking.depositPaidEur),
      balanceDueEur: Number(booking.balanceDueEur),
      extras: (
        await (await import("@/lib/server/booking-info/extras")).hydrateBookingExtraLabels(
          booking.extras.map((extra) => ({
            id: extra.extraServiceId || extra.id || extra.label,
            label: extra.label,
            priceEur: Number(extra.priceEur),
          })),
        )
      ).map((extra) => ({
        label: extra.label,
        priceEur: Number(extra.priceEur),
      })),
    },
  });
}

/** Notify customer, partner, and admin for file-stored bookings. */
export async function notifyFileBookingEvent(
  booking: FileBookingRecord,
  event: BookingNoticeEvent = "BOOKING_NEW",
  opts?: { cancellationReason?: string; refundEur?: number },
) {
  const { getFileCar } = await import("@/lib/server/partner-cars-store");
  const fileCar = await getFileCar(booking.carId);
  if (!fileCar) {
    let carLabel = booking.carId;
    try {
      const car = await prisma.car.findUnique({
        where: { id: booking.carId },
        select: { make: true, model: true, year: true },
      });
      if (car) carLabel = `${car.make} ${car.model} ${car.year}`.replace(/\s+/g, " ").trim();
    } catch {
      /* booking notice still goes out with the car id */
    }
    if (event === "BOOKING_NEW") {
      try {
        const { notifyBookingTelegramBot } = await import("@/lib/telegram/notify-booking-bot");
        await notifyBookingTelegramBot({
          carLabel,
          pickupIata: booking.pickupAirportIata,
          dropoffIata: booking.dropoffAirportIata,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          pickupAt: new Date(booking.pickupAt),
          dropoffAt: new Date(booking.dropoffAt),
          totalPriceEur: Number(booking.totalPriceEur) || 0,
          paidEur: Number(booking.depositPaidEur) || 0,
          dueOnSiteEur: Number(booking.balanceDueEur) || 0,
        });
      } catch (error) {
        console.warn("[notify] booking bot failed", error);
      }
    }
    return;
  }

  const partnerEmail = (fileCar.partnerEmail || "").trim();
  const chatIds = new Set(
    await listStoredPartnerChatIds({
      partnerId: fileCar.partnerId,
      email: partnerEmail,
    }),
  );

  try {
    const email = normalizeLogin(partnerEmail);
    const partner = email
      ? await prisma.partner.findFirst({
          where: { email },
          select: { id: true, email: true, telegramChatId: true },
        })
      : null;
    const chatId = partner?.telegramChatId?.trim();
    if (chatId) {
      chatIds.add(chatId);
      await rememberPartnerChat({
        chatId,
        partnerId: partner?.id || fileCar.partnerId,
        email: partner?.email || partnerEmail,
      });
    }
  } catch (error) {
    console.warn("[notify] file booking telegram lookup failed", error);
  }

  let messengers = parsePartnerMessengers(booking.guestMessengers, booking.guestMessenger);
  try {
    const { readBookingMessengers } = await import("@/lib/server/booking-messengers-store");
    const stored = await readBookingMessengers(booking.id);
    if (stored.length) messengers = stored;
  } catch {
    /* optional */
  }

  await deliverBookingNotice({
    event,
    partnerEmails: partnerEmail ? [partnerEmail] : [],
    partnerChatIds: [...chatIds],
    cancellationReason: opts?.cancellationReason,
    refundEur: opts?.refundEur,
    booking: {
      id: booking.id,
      sequentialNumber: booking.sequentialNumber,
      flightNumber: booking.flightNumber,
      pickupAt: new Date(booking.pickupAt),
      dropoffAt: new Date(booking.dropoffAt),
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupIata: booking.pickupAirportIata,
      dropoffIata: booking.dropoffAirportIata,
      guestFirstName: booking.guestFirstName,
      guestLastName: booking.guestLastName,
      guestPhone: booking.guestPhone,
      guestEmail: booking.guestEmail,
      messengers,
      carLabel: `${fileCar.make} ${fileCar.model} ${fileCar.year}`.replace(/\s+/g, " ").trim(),
      totalPriceEur: Number(booking.totalPriceEur) || 0,
      depositPaidEur: Number(booking.depositPaidEur) || 0,
      balanceDueEur: Number(booking.balanceDueEur) || 0,
      extras: (
        await (await import("@/lib/server/booking-info/extras")).hydrateBookingExtraLabels(
          (booking.extras || []).map((extra) => ({
            id: extra.id,
            label: extra.label,
            priceEur: Number(extra.priceEur) || 0,
          })),
        )
      ).map((extra) => ({
        label: extra.label,
        priceEur: Number(extra.priceEur) || 0,
      })),
    },
  });
}

export async function sendReviewInvite(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  const token = crypto.randomUUID();
  await prisma.reviewInvite.upsert({
    where: { bookingId },
    create: { bookingId, token },
    update: { token, sentAt: new Date() },
  });
  await prisma.notificationLog.create({
    data: {
      userId: booking.customerId,
      bookingId,
      channel: "EMAIL",
      event: "REVIEW_INVITE",
      recipient: booking.guestEmail,
      payload: { token, path: `/reviews/${bookingId}` },
    },
  });
}
