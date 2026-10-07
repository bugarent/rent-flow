import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/brand";
import { formatBookingRef } from "@/lib/ids";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { sendPartnerMail } from "@/lib/mail";
import { isValidEmail, normalizeLogin } from "@/lib/crypto";
import { displayBookingCharges } from "@/lib/bookings/booking-money";
import { parsePartnerMessengers } from "@/lib/partner";
import { bookingBotMessage, reservationTelegramText, sendBookingNoticeToBot } from "@/lib/telegram/notify-booking-bot";
import { rentalDayCount } from "@/lib/cars/reserve-pricing";
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
  carPlate: string;
  depositPercent: number;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  extras: Array<{ label: string; priceEur: number }>;
};

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
  const facts = bookingBotMessage({
    headline: `${noticeHeadline(event)} · ${siteName}`,
    reference,
    carLabel: booking.carLabel,
    pickupIata: booking.pickupIata,
    dropoffIata: booking.dropoffIata,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    pickupAt: booking.pickupAt,
    dropoffAt: booking.dropoffAt,
    totalPriceEur: booking.totalPriceEur,
    paidEur: booking.depositPaidEur,
    dueOnSiteEur: booking.balanceDueEur,
  });
  const extrasLines = booking.extras.filter((ex) => ex.label.trim());
  const messengerLine = booking.messengers.map(messengerLabel).join(", ");
  const reason = String(extras?.cancellationReason || "").trim();
  const refundEur = Number(extras?.refundEur) || 0;

  return [
    facts,
    booking.flightNumber ? `რეისი: ${booking.flightNumber}` : null,
    `კლიენტი: ${`${booking.guestFirstName} ${booking.guestLastName}`.trim() || "—"}`,
    `ტელეფონი: ${booking.guestPhone || "—"}`,
    `ელფოსტა: ${booking.guestEmail || "—"}`,
    messengerLine ? `სოციალური ქსელი: ${messengerLine}` : null,
    extrasLines.length
      ? `მომსახურება:\n${extrasLines.map((ex) => `  ${ex.label} — €${Number(ex.priceEur || 0).toFixed(2)}`).join("\n")}`
      : "მომსახურება: არ არის არჩეული",
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

/** Emails name the car exactly as it was booked, even if the listing changed later. */
async function withBookedCar(booking: NoticeSnapshot): Promise<NoticeSnapshot> {
  try {
    const { readBookedTerms } = await import("@/lib/server/booking-terms-store");
    const car = (await readBookedTerms(booking.id))?.car;
    if (!car) return booking;
    const label = `${car.make} ${car.model} ${car.year || ""}`.replace(/\s+/g, " ").trim();
    return {
      ...booking,
      carLabel: label || booking.carLabel,
      carPlate: String(car.registrationNumber || "").trim() || booking.carPlate,
    };
  } catch {
    return booking;
  }
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
  input = { ...input, booking: await withBookedCar(input.booking) };
  const name = await siteName();
  const reference = formatBookingRef(input.booking.sequentialNumber);
  const days = rentalDayCount(input.booking.pickupAt.toISOString(), input.booking.dropoffAt.toISOString());
  const text = [
    noticeText(input.event, input.booking, name, {
      cancellationReason: input.cancellationReason,
      refundEur: input.refundEur,
    }),
    `ხანგრძლივობა: ${Math.max(1, days)} დღე`,
  ].join("\n");
  const subject = noticeSubject(input.event, reference);

  const recipients = [...input.partnerEmails, input.booking.guestEmail]
    .map((email) => String(email || "").trim())
    .filter(
      (email, index, all) =>
        isValidEmail(email) &&
        all.findIndex((item) => normalizeLogin(item) === normalizeLogin(email)) === index,
    );

  const sendEmails = async () => {
    if (!recipients.length) {
      console.warn(`[notify] ${input.event} ${reference}: no valid email recipients`);
      return;
    }
    let from = "";
    try {
      const { readBookingMailFrom } = await import("@/lib/server/booking-mail-from");
      from = (await readBookingMailFrom()).trim();
    } catch {
      /* fall back to SMTP_FROM */
    }
    const html = `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</div>`;
    const results = await Promise.allSettled(
      recipients.map((to) =>
        sendPartnerMail({
          to,
          ...(isValidEmail(from) ? { from, replyTo: from } : {}),
          subject,
          text,
          html,
          event: input.event,
          userId: input.userId,
          payload: {
            bookingId: input.booking.id,
            reference,
            role: normalizeLogin(to) === normalizeLogin(input.booking.guestEmail) ? "guest" : "partner",
            ...(input.cancellationReason ? { cancellationReason: input.cancellationReason } : {}),
            ...(input.refundEur != null ? { refundEur: input.refundEur } : {}),
          },
        }),
      ),
    );
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        console.error(`[notify] email to ${recipients[i]} failed`, result.reason);
      } else if (!result.value.sent) {
        console.error(`[notify] email to ${recipients[i]} was NOT sent (see [mail] log above)`);
      }
    });
  };

  const sendTelegram = async () => {
    try {
      const { getFxRates } = await import("@/lib/server/preferences");
      const rate = (await getFxRates()).eurUsd;
      const usd = Number.isFinite(rate) && rate > 0 ? rate : 1;
      const toUsd = (eur: number) => Math.round((Number(eur) || 0) * usd * 100) / 100;
      const charges = displayBookingCharges({
        totalPriceEur: input.booking.totalPriceEur,
        depositPaidEur: input.booking.depositPaidEur,
        balanceDueEur: input.booking.balanceDueEur,
      });
      const telegram = {
        event: input.event,
        reference: reference || String(input.booking.sequentialNumber || ""),
        carName: input.booking.carLabel.replace(/\s+(19|20)\d{2}$/, "").trim(),
        plate: String(input.booking.carPlate || "").trim(),
        pickupAt: input.booking.pickupAt,
        dropoffAt: input.booking.dropoffAt,
        pickupIata: input.booking.pickupIata,
        dropoffIata: input.booking.dropoffIata,
        totalUsd: toUsd(charges.totalEur),
        advanceUsd: toUsd(charges.paidEur),
        sitePercent: input.booking.depositPercent,
        siteUsd: toUsd(charges.siteFeeEur),
      };
      const partnerText = reservationTelegramText(telegram, false);
      const adminText = reservationTelegramText(telegram, true);
      const adminIds = new Set((await adminChatIds()).map((id) => id.trim()).filter(Boolean));
      const partnerIds = [...new Set(input.partnerChatIds.map((id) => id.trim()).filter((id) => id && !adminIds.has(id)))];
      const sentBotChat = await sendBookingNoticeToBot(adminText);
      for (const chatId of partnerIds) {
        await sendTelegramMessage(chatId, partnerText);
      }
      for (const chatId of adminIds) {
        if (sentBotChat && chatId === sentBotChat) continue;
        await sendTelegramMessage(chatId, adminText);
      }
    } catch (error) {
      console.warn("[notify] booking telegram failed", error);
    }
  };

  await Promise.allSettled([sendEmails(), sendTelegram()]);
}

/** Partner mailbox(es): account email plus the email saved in company settings. */
async function resolvePartnerEmails(input: {
  partnerId?: string | null;
  emails: Array<string | null | undefined>;
}): Promise<string[]> {
  const list = input.emails.map((e) => String(e || "").trim()).filter(Boolean);
  const pid = String(input.partnerId || "").trim();
  if (pid) {
    try {
      const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
      const { parseCompanySettings } = await import("@/lib/partners/company-settings");
      const ids = [pid, pid.replace(/^file-partner-/, "")].filter((id, i, all) => id && all.indexOf(id) === i);
      for (const id of ids) {
        const settings = await readCompanySettingsFile(id);
        if (!settings) continue;
        const company = parseCompanySettings(settings, { email: list[0] || undefined });
        if (company.email) list.push(String(company.email).trim());
        break;
      }
    } catch (error) {
      console.warn("[notify] partner company email lookup failed", error);
    }
  }
  return list.filter(
    (email, index, all) =>
      isValidEmail(email) && all.findIndex((item) => normalizeLogin(item) === normalizeLogin(email)) === index,
  );
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
  const partnerEmails = await resolvePartnerEmails({
    partnerId: partner.id,
    emails: [partner.email, partner.user?.email],
  });
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
      carPlate: String(booking.car.registrationNumber || "").trim(),
      depositPercent: Number(booking.depositPercent) || 0,
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
    let carPlate = "";
    let partnerEmail = "";
    let dbPartnerId = "";
    const chatIds = new Set<string>();
    try {
      const car = await prisma.car.findUnique({
        where: { id: booking.carId },
        select: {
          make: true,
          model: true,
          year: true,
          registrationNumber: true,
          partner: { select: { id: true, email: true, telegramChatId: true } },
        },
      });
      if (car) {
        carLabel = `${car.make} ${car.model} ${car.year}`.replace(/\s+/g, " ").trim();
        carPlate = String(car.registrationNumber || "").trim();
      }
      partnerEmail = car?.partner?.email?.trim() || "";
      dbPartnerId = car?.partner?.id || "";
      const partnerChat = car?.partner?.telegramChatId?.trim();
      if (partnerChat) chatIds.add(partnerChat);
      if (car?.partner) {
        for (const chatId of await listStoredPartnerChatIds({
          partnerId: car.partner.id,
          email: partnerEmail,
        })) {
          chatIds.add(chatId);
        }
      }
    } catch (error) {
      console.warn("[notify] prisma car lookup failed", error);
    }
    await deliverBookingNotice({
      event,
      partnerEmails: await resolvePartnerEmails({ partnerId: dbPartnerId, emails: [partnerEmail] }),
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
        messengers: parsePartnerMessengers(booking.guestMessengers, booking.guestMessenger),
        carLabel,
        carPlate,
        depositPercent: Number(booking.depositPercent) || 0,
        totalPriceEur: Number(booking.totalPriceEur) || 0,
        depositPaidEur: Number(booking.depositPaidEur) || 0,
        balanceDueEur: Number(booking.balanceDueEur) || 0,
        extras: (booking.extras || []).map((extra) => ({
          label: extra.label,
          priceEur: Number(extra.priceEur) || 0,
        })),
      },
    });
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
    partnerEmails: await resolvePartnerEmails({ partnerId: fileCar.partnerId, emails: [partnerEmail] }),
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
      carPlate: String(fileCar.registrationNumber || "").trim(),
      depositPercent: Number(booking.depositPercent) || 0,
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
