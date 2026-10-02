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

export function bookingBotMessage(notice: BookingBotNotice) {
  return [
    "ახალი ჯავშანი",
    `მანქანა: ${notice.carLabel.trim() || "—"}`,
    `აღების ადგილი: ${placeLine(notice.pickupIata, notice.pickupAddress) || "—"}`,
    `აღების თარიღი და დრო: ${whenLine(notice.pickupAt, notice.pickupIata)}`,
    `დაბრუნების ადგილი: ${placeLine(notice.dropoffIata, notice.dropoffAddress) || "—"}`,
    `დაბრუნების თარიღი და დრო: ${whenLine(notice.dropoffAt, notice.dropoffIata)}`,
    `სულ ჯავშანი: ${money(notice.totalPriceEur)}`,
    `გადახდილია: ${money(notice.paidEur)}`,
    `ადგილზე გადასახდელი: ${money(notice.dueOnSiteEur)}`,
  ].join("\n");
}

/** Sends a new-booking summary to the single bot saved in the admin homepage panel. */
export async function notifyBookingTelegramBot(notice: BookingBotNotice) {
  const bot = await getActiveTelegramLiveBot();
  if (!bot?.botToken.trim() || !bot.chatId.trim()) return;
  const sent = await sendTelegramMessageWithToken(bot.botToken, bot.chatId, bookingBotMessage(notice));
  if (!sent.ok) console.warn("[booking-bot] telegram", sent.error);
}
