import type { Locale } from "@/lib/i18n/config";
import { regionName } from "@/lib/i18n/place-label";

/** Country shown on the homepage cover before a visitor picks one (main market, what Google sees). */
export const DEFAULT_HERO_COUNTRY = "GE";

/** Up to three of the country's biggest tourist places, in English (used by most languages). */
const TOP_PLACES: Record<string, [string, string, string]> = {
  GE: ["Tbilisi", "Batumi", "Kutaisi"],
  AM: ["Yerevan", "Gyumri", "Dilijan"],
  AZ: ["Baku", "Gabala", "Sheki"],
  ME: ["Budva", "Kotor", "Podgorica"],
  RS: ["Belgrade", "Novi Sad", "Niš"],
  TR: ["Istanbul", "Antalya", "Cappadocia"],
};

/** Georgian and Russian need the locative forms, so their sentences are written out per country. */
const WRITTEN: Partial<Record<Locale, Record<string, string>>> = {
  ka: {
    GE: "მანქანების გაქირავება საქართველოში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან თბილისში, ბათუმსა და ქუთაისში",
    AM: "მანქანების გაქირავება სომხეთში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან ერევანში, გიუმრისა და დილიჟანში",
    AZ: "მანქანების გაქირავება აზერბაიჯანში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან ბაქოში, გაბალასა და შექში",
    ME: "მანქანების გაქირავება მონტენეგროში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან ბუდვაში, კოტორსა და პოდგორიცაში",
    RS: "მანქანების გაქირავება სერბეთში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან ბელგრადში, ნოვი სადსა და ნიშში",
    TR: "მანქანების გაქირავება თურქეთში — საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან სტამბოლში, ანტალიასა და კაპადოკიაში",
  },
  ru: {
    GE: "Аренда авто в Грузии — лучшие местные цены от проверенных партнёров в Тбилиси, Батуми и Кутаиси",
    AM: "Аренда авто в Армении — лучшие местные цены от проверенных партнёров в Ереване, Гюмри и Дилижане",
    AZ: "Аренда авто в Азербайджане — лучшие местные цены от проверенных партнёров в Баку, Габале и Шеки",
    ME: "Аренда авто в Черногории — лучшие местные цены от проверенных партнёров в Будве, Которе и Подгорице",
    RS: "Аренда авто в Сербии — лучшие местные цены от проверенных партнёров в Белграде, Нови-Саде и Нише",
    TR: "Аренда авто в Турции — лучшие местные цены от проверенных партнёров в Стамбуле, Анталье и Каппадокии",
  },
};

/** `{country}` and `{a}`, `{b}`, `{c}` (places) are filled in. */
const TEMPLATES: Record<Locale, { three: string; two: string; one: string }> = {
  en: {
    three: "Car rental in {country} — best local prices from trusted partners in {a}, {b} and {c}",
    two: "Car rental in {country} — best local prices from trusted partners in {a} and {b}",
    one: "Car rental in {country} — best local prices from trusted partners in {a}",
  },
  ka: {
    three: "მანქანების გაქირავება — {country}: საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან: {a}, {b} და {c}",
    two: "მანქანების გაქირავება — {country}: საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან: {a} და {b}",
    one: "მანქანების გაქირავება — {country}: საუკეთესო ადგილობრივი ფასები სანდო პარტნიორებისგან: {a}",
  },
  ru: {
    three: "Аренда авто — {country}: лучшие местные цены от проверенных партнёров: {a}, {b} и {c}",
    two: "Аренда авто — {country}: лучшие местные цены от проверенных партнёров: {a} и {b}",
    one: "Аренда авто — {country}: лучшие местные цены от проверенных партнёров: {a}",
  },
  de: {
    three: "Mietwagen {country} — beste lokale Preise von geprüften Partnern in {a}, {b} und {c}",
    two: "Mietwagen {country} — beste lokale Preise von geprüften Partnern in {a} und {b}",
    one: "Mietwagen {country} — beste lokale Preise von geprüften Partnern in {a}",
  },
  es: {
    three: "Alquiler de coches en {country}: los mejores precios locales de socios de confianza en {a}, {b} y {c}",
    two: "Alquiler de coches en {country}: los mejores precios locales de socios de confianza en {a} y {b}",
    one: "Alquiler de coches en {country}: los mejores precios locales de socios de confianza en {a}",
  },
  fr: {
    three: "Location de voiture — {country} : meilleurs prix locaux de partenaires fiables à {a}, {b} et {c}",
    two: "Location de voiture — {country} : meilleurs prix locaux de partenaires fiables à {a} et {b}",
    one: "Location de voiture — {country} : meilleurs prix locaux de partenaires fiables à {a}",
  },
  it: {
    three: "Noleggio auto — {country}: i migliori prezzi locali da partner affidabili a {a}, {b} e {c}",
    two: "Noleggio auto — {country}: i migliori prezzi locali da partner affidabili a {a} e {b}",
    one: "Noleggio auto — {country}: i migliori prezzi locali da partner affidabili a {a}",
  },
  nl: {
    three: "Autoverhuur in {country} — de beste lokale prijzen van betrouwbare partners in {a}, {b} en {c}",
    two: "Autoverhuur in {country} — de beste lokale prijzen van betrouwbare partners in {a} en {b}",
    one: "Autoverhuur in {country} — de beste lokale prijzen van betrouwbare partners in {a}",
  },
  pl: {
    three: "Wynajem samochodów — {country}: najlepsze lokalne ceny od zaufanych partnerów: {a}, {b} i {c}",
    two: "Wynajem samochodów — {country}: najlepsze lokalne ceny od zaufanych partnerów: {a} i {b}",
    one: "Wynajem samochodów — {country}: najlepsze lokalne ceny od zaufanych partnerów: {a}",
  },
  tr: {
    three: "{country} araç kiralama — {a}, {b} ve {c} için güvenilir ortaklardan en iyi yerel fiyatlar",
    two: "{country} araç kiralama — {a} ve {b} için güvenilir ortaklardan en iyi yerel fiyatlar",
    one: "{country} araç kiralama — {a} için güvenilir ortaklardan en iyi yerel fiyatlar",
  },
  ar: {
    three: "تأجير السيارات في {country} — أفضل الأسعار المحلية من شركاء موثوقين في {a} و{b} و{c}",
    two: "تأجير السيارات في {country} — أفضل الأسعار المحلية من شركاء موثوقين في {a} و{b}",
    one: "تأجير السيارات في {country} — أفضل الأسعار المحلية من شركاء موثوقين في {a}",
  },
  zh: {
    three: "{country}租车 — {a}、{b}和{c}可信合作伙伴提供的最优本地价格",
    two: "{country}租车 — {a}和{b}可信合作伙伴提供的最优本地价格",
    one: "{country}租车 — {a}可信合作伙伴提供的最优本地价格",
  },
  ko: {
    three: "{country} 렌터카 — {a}, {b}, {c}의 믿을 수 있는 파트너가 제공하는 최고의 현지 가격",
    two: "{country} 렌터카 — {a}, {b}의 믿을 수 있는 파트너가 제공하는 최고의 현지 가격",
    one: "{country} 렌터카 — {a}의 믿을 수 있는 파트너가 제공하는 최고의 현지 가격",
  },
  th: {
    three: "เช่ารถใน{country} — ราคาท้องถิ่นที่ดีที่สุดจากพาร์ทเนอร์ที่เชื่อถือได้ใน {a}, {b} และ {c}",
    two: "เช่ารถใน{country} — ราคาท้องถิ่นที่ดีที่สุดจากพาร์ทเนอร์ที่เชื่อถือได้ใน {a} และ {b}",
    one: "เช่ารถใน{country} — ราคาท้องถิ่นที่ดีที่สุดจากพาร์ทเนอร์ที่เชื่อถือได้ใน {a}",
  },
};

/**
 * Homepage cover headline for the country picked in search (Georgia until one is picked).
 * `fallbackPlaces` are the country's own pickup places, used for countries without a written list.
 */
export function countryHeroHeadline(
  locale: Locale,
  iso2: string,
  fallbackPlaces: string[] = [],
): string {
  const code = (iso2 || DEFAULT_HERO_COUNTRY).toUpperCase();
  const written = WRITTEN[locale]?.[code];
  if (written) return written;
  const places = (TOP_PLACES[code] ?? fallbackPlaces).filter(Boolean).slice(0, 3);
  const country = regionName(locale, code, code);
  const set = TEMPLATES[locale] ?? TEMPLATES.en;
  const template = places.length >= 3 ? set.three : places.length === 2 ? set.two : set.one;
  if (!places.length) return template.split(" — ")[0].replace("{country}", country);
  return template
    .replace("{country}", country)
    .replace("{a}", places[0] ?? "")
    .replace("{b}", places[1] ?? "")
    .replace("{c}", places[2] ?? "");
}
