import "server-only";

import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { composeLocationAddress, findSearchPlace } from "@/lib/catalog/search-places";
import { DEFAULT_AIRPORT_TIMEZONE, getZonedParts } from "@/lib/datetime/airport-timezone";
import { getActiveTelegramLiveBot } from "@/lib/server/telegram-live-bots-store";
import { sendTelegramMessageWithToken } from "@/lib/telegram/send-with-token";

export type BookingBotNotice = {
  carLabel: string;
  pickupIata: string;
  dropoffIata: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date;
  dropoffAt: Date;
  totalPriceEur: number;
  paidEur: number;
  dueOnSiteEur: number;
};

function money(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)} €`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function placeLine(iata: string, address: string) {
  const code = String(iata || "").trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((row) => row.iata === code);
  const place = findSearchPlace(code);
  const name = airport?.name.ka || airport?.name.en || place?.label || code;
  const city = airport?.cityName.ka || airport?.cityName.en || place?.cityName || "";
  const street = String(address || "").trim();
  const where = street ? composeLocationAddress(city || name, street) : name;
  if (!where) return code;
  if (!code || where.toUpperCase().includes(code)) return where;
  return `${where} (${code})`;
}

function whenLine(instant: Date, iata: string) {
  const code = String(iata || "").trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((row) => row.iata === code);
  const parts = getZonedParts(instant, airport?.timezone || DEFAULT_AIRPORT_TIMEZONE);
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

function dateOnly(instant: Date, iata: string) {
  const code = String(iata || "").trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((row) => row.iata === code);
  const parts = getZonedParts(instant, airport?.timezone || DEFAULT_AIRPORT_TIMEZONE);
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year}`;
}

function cityName(iata: string) {
  const code = String(iata || "").trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((row) => row.iata === code);
  return airport?.cityName.en || findSearchPlace(code)?.cityName || code || "—";
}

function usdAmount(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(2);
}

export type ReservationTelegramInput = {
  event: "BOOKING_NEW" | "BOOKING_EDITED" | "BOOKING_CANCELLED";
  reference: string;
  carName: string;
  plate: string;
  pickupAt: Date;
  dropoffAt: Date;
  pickupIata: string;
  dropoffIata: string;
  totalUsd: number;
  advanceUsd: number;
  /** Included only on the administrator copy. */
  sitePercent?: number;
  siteUsd?: number;
};

/** Partner copy, or the same text plus the site commission for the administrator. */
export function reservationTelegramText(input: ReservationTelegramInput, forAdmin = false) {
  const vehicle = [input.carName, input.plate].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || "—";
  const ref = input.reference.trim() || "—";
  const trip = `From ${dateOnly(input.pickupAt, input.pickupIata)} (${cityName(input.pickupIata)}) to ${dateOnly(input.dropoffAt, input.dropoffIata)} (${cityName(input.dropoffIata)})`;
  const total = `Total: ${usdAmount(input.totalUsd)} $`;
  const title =
    input.event === "BOOKING_CANCELLED"
      ? `Reservation cancelled No ${ref}`
      : input.event === "BOOKING_EDITED"
        ? `Reservation edited No ${ref}`
        : `New reservation: #${ref}`;
  const lines =
    input.event === "BOOKING_NEW"
      ? [title, `Car ${vehicle}`, trip, total, `Advance payment: ${usdAmount(input.advanceUsd)} $`]
      : [title, vehicle, trip, total];
  if (forAdmin) {
    const percent = Math.round(Number(input.sitePercent) || 0);
    lines.push(`Site commission: ${percent}% · ${usdAmount(input.siteUsd || 0)} $`);
  }
  return lines.join("\n");
}

export function bookingBotMessage(
  notice: BookingBotNotice & { headline?: string; reference?: string },
) {
  return [
    notice.headline?.trim() || "ახალი ჯავშანი",
    notice.reference?.trim() ? `რეფერენსი: ${notice.reference.trim()}` : null,
    `მანქანა: ${notice.carLabel.trim() || "—"}`,
    `აღების ადგილი: ${placeLine(notice.pickupIata, notice.pickupAddress) || "—"}`,
    `აღების თარიღი და დრო: ${whenLine(notice.pickupAt, notice.pickupIata)}`,
    `დაბრუნების ადგილი: ${placeLine(notice.dropoffIata, notice.dropoffAddress) || "—"}`,
    `დაბრუნების თარიღი და დრო: ${whenLine(notice.dropoffAt, notice.dropoffIata)}`,
    `სულ ჯავშანი: ${money(notice.totalPriceEur)}`,
    `გადახდილია: ${money(notice.paidEur)}`,
    `ადგილზე გადასახდელი: ${money(notice.dueOnSiteEur)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Sends the booking notice to the single bot saved in the admin homepage panel. */
export async function sendBookingNoticeToBot(text: string): Promise<string | null> {
  const body = text.trim();
  if (!body) return null;
  const bot = await getActiveTelegramLiveBot();
  const chatId = bot?.chatId.trim() || "";
  if (!bot?.botToken.trim() || !chatId) return null;
  const sent = await sendTelegramMessageWithToken(bot.botToken, chatId, body);
  if (!sent.ok) {
    console.warn("[booking-bot] telegram", sent.error);
    return null;
  }
  return chatId;
}

/** Sends a new-booking summary to the single bot saved in the admin homepage panel. */
export async function notifyBookingTelegramBot(notice: BookingBotNotice) {
  await sendBookingNoticeToBot(bookingBotMessage(notice));
}
