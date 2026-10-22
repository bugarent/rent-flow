import type { Locale } from "@/lib/i18n/config";

/** Google shows ~50–60 title characters and ~120–160 description characters. */
export const SEO_TITLE_RANGE = { min: 30, max: 60 } as const;
export const SEO_DESCRIPTION_RANGE = { min: 120, max: 160 } as const;
const BRAND = "RentAirportCars";

const DESCRIPTION_TEMPLATE: Record<Locale, string> = {
  en: "Rent a car at {airport} ({code}). Meet & greet at arrivals, verified local partners, transparent prices and free cancellation. Book online in minutes.",
  ka: "მანქანის ქირაობა {airport} ({code}). მიწოდება ჩამოსვლის დარბაზში, გადამოწმებული პარტნიორები, გამჭვირვალე ფასები და უფასო გაუქმება. დაჯავშნე ონლაინ.",
  ru: "Аренда авто в аэропорту {airport} ({code}): встреча в зоне прилёта, проверенные партнёры, прозрачные цены и бесплатная отмена. Бронируйте онлайн.",
  de: "Mietwagen am {airport} ({code}): Übergabe in der Ankunftshalle, geprüfte Partner, transparente Preise und kostenlose Stornierung. Jetzt online buchen.",
  es: "Alquiler de coches en {airport} ({code}): entrega en llegadas, socios verificados, precios claros y cancelación gratuita. Reserva online en minutos.",
  fr: "Location de voiture à {airport} ({code}) : remise en zone d'arrivée, partenaires vérifiés, prix transparents et annulation gratuite. Réservez en ligne.",
  it: "Noleggio auto a {airport} ({code}): consegna agli arrivi, partner verificati, prezzi trasparenti e cancellazione gratuita. Prenota online in pochi minuti.",
  nl: "Autoverhuur op {airport} ({code}): overdracht bij aankomst, geverifieerde partners, transparante prijzen en gratis annuleren. Boek direct online.",
  pl: "Wynajem samochodów: {airport} ({code}). Odbiór w hali przylotów, sprawdzeni partnerzy, jasne ceny i bezpłatne anulowanie. Rezerwuj online.",
  tr: "{airport} ({code}) araç kiralama: gelen yolcu salonunda teslim, onaylı yerel partnerler, şeffaf fiyatlar ve ücretsiz iptal. Hemen online rezervasyon.",
  ar: "تأجير السيارات في {airport} ({code}): استلام في صالة الوصول، شركاء موثوقون، أسعار واضحة وإلغاء مجاني. احجز عبر الإنترنت في دقائق.",
  zh: "{airport}（{code}）租车：到达大厅交车，认证本地合作伙伴，价格透明，免费取消。立即在线预订。",
  ko: "{airport}({code}) 렌터카: 도착 로비에서 차량 인도, 검증된 현지 파트너, 투명한 가격과 무료 취소. 지금 온라인으로 예약하세요.",
  th: "เช่ารถที่{airport} ({code}) รับรถที่โถงผู้โดยสารขาเข้า พาร์ทเนอร์ที่ผ่านการตรวจสอบ ราคาโปร่งใส ยกเลิกฟรี จองออนไลน์ได้ทันที",
};

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** Card heading without decorative emoji or a trailing "– Brand" part. */
function plainHeading(title: string): string {
  return title
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(new RegExp(`\\s*[–—|-]\\s*${BRAND}\\s*$`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "<heading> | RentAirportCars", dropping the brand when the heading alone fills the limit. */
export function autoSeoTitle(heading: string): string {
  const plain = plainHeading(heading);
  const branded = `${plain} | ${BRAND}`;
  return branded.length <= SEO_TITLE_RANGE.max ? branded : clip(plain, SEO_TITLE_RANGE.max);
}

/** First sentences of the page text; the language template when the text is too short. */
export function autoSeoDescription(input: {
  locale: Locale;
  airportName: string;
  code: string;
  infoText?: string;
}): string {
  const lead = String(input.infoText || "")
    .split(/\n+/)
    .map((line) => line.replace(/[\p{Extended_Pictographic}\uFE0F\u200B-\u200D\u2060\uFEFF]/gu, "").trim())
    .filter((line) => line.length > 40 && !new RegExp(`${BRAND}\\s*$`, "i").test(line))
    .map((line) => (/[.!?…:;。！？]$/.test(line) ? line : `${line}.`))
    .join(" ");
  if (lead.length >= SEO_DESCRIPTION_RANGE.min) return clip(lead, SEO_DESCRIPTION_RANGE.max);
  const template = DESCRIPTION_TEMPLATE[input.locale] ?? DESCRIPTION_TEMPLATE.en;
  const airport = plainHeading(input.airportName).replace(new RegExp(`\\s*\\(${input.code}\\)\\s*$`, "i"), "");
  return clip(
    template.replaceAll("{airport}", airport || input.code).replaceAll("{code}", input.code),
    SEO_DESCRIPTION_RANGE.max,
  );
}

export type LengthStatus = "empty" | "short" | "good" | "long";

/** Traffic-light status for the admin counters. */
export function seoLengthStatus(text: string, range: { min: number; max: number }): LengthStatus {
  const n = text.trim().length;
  if (!n) return "empty";
  if (n < range.min) return "short";
  if (n > range.max) return "long";
  return "good";
}
