import { SEO_SITE_NAME } from "@/lib/brand";
import type { Locale } from "@/lib/i18n/config";
import { findSearchPlace } from "@/lib/catalog/search-places";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";

const TAGLINE: Record<Locale, string> = {
  en: "Airport car rental",
  ka: "მანქანის ქირაობა აეროპორტში",
  ru: "Аренда авто в аэропортах",
  de: "Mietwagen am Flughafen",
  es: "Alquiler de coches en aeropuertos",
  fr: "Location de voiture à l'aéroport",
  it: "Noleggio auto in aeroporto",
  nl: "Autoverhuur op luchthavens",
  pl: "Wynajem aut na lotniskach",
  tr: "Havalimanı araç kiralama",
  ar: "تأجير السيارات في المطارات",
  zh: "机场租车",
  ko: "공항 렌터카",
  th: "เช่ารถที่สนามบิน",
};

const DESCRIPTION: Record<Locale, string> = {
  en: "{brand} — car rental at popular airports and places: {places}. Verified local partners, transparent prices, delivery to arrivals.",
  ka: "{brand} — მანქანის ქირაობა პოპულარულ აეროპორტებსა და ადგილებში: {places}. გადამოწმებული პარტნიორები, გამჭვირვალე ფასები, მიწოდება ჩამოსვლისას.",
  ru: "{brand} — аренда авто в популярных аэропортах и местах: {places}. Проверенные партнёры, прозрачные цены, подача к прилёту.",
  de: "{brand} — Mietwagen an beliebten Flughäfen und Orten: {places}. Geprüfte Partner, transparente Preise, Übergabe bei Ankunft.",
  es: "{brand} — alquiler de coches en aeropuertos y lugares populares: {places}. Socios verificados, precios claros, entrega a la llegada.",
  fr: "{brand} — location de voiture dans les aéroports et lieux populaires : {places}. Partenaires vérifiés, prix transparents, remise à l'arrivée.",
  it: "{brand} — noleggio auto negli aeroporti e luoghi più richiesti: {places}. Partner verificati, prezzi trasparenti, consegna all'arrivo.",
  nl: "{brand} — autoverhuur op populaire luchthavens en plaatsen: {places}. Geverifieerde partners, transparante prijzen, levering bij aankomst.",
  pl: "{brand} — wynajem aut na popularnych lotniskach i w miejscach: {places}. Sprawdzeni partnerzy, jasne ceny, podstawienie na przylot.",
  tr: "{brand} — popüler havalimanları ve yerlerde araç kiralama: {places}. Onaylı yerel partnerler, şeffaf fiyatlar, varışta teslim.",
  ar: "{brand} — تأجير السيارات في المطارات والأماكن الشائعة: {places}. شركاء موثوقون وأسعار واضحة وتسليم عند الوصول.",
  zh: "{brand} — 热门机场和地点租车：{places}。认证本地合作伙伴，价格透明，到达即交车。",
  ko: "{brand} — 인기 공항 및 장소 렌터카: {places}. 검증된 현지 파트너, 투명한 가격, 도착 시 차량 인도.",
  th: "{brand} — เช่ารถที่สนามบินและสถานที่ยอดนิยม: {places} พาร์ทเนอร์ที่ตรวจสอบแล้ว ราคาโปร่งใส ส่งรถเมื่อเดินทางถึง",
};

const POPULAR_LIST: Record<Locale, string> = {
  en: "popular airports and places",
  ka: "პოპულარული აეროპორტები და ადგილები",
  ru: "популярные аэропорты и места",
  de: "beliebte Flughäfen und Orte",
  es: "aeropuertos y lugares populares",
  fr: "aéroports et lieux populaires",
  it: "aeroporti e luoghi popolari",
  nl: "populaire luchthavens en plaatsen",
  pl: "popularne lotniska i miejsca",
  tr: "popüler havalimanları ve yerler",
  ar: "المطارات والأماكن الشائعة",
  zh: "热门机场和地点",
  ko: "인기 공항 및 장소",
  th: "สนามบินและสถานที่ยอดนิยม",
};

function countryName(iso2: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}

/** City names the airport catalog does not translate yet. */
const EXTRA_CITY_NAMES: Record<string, Partial<Record<Locale, string>>> = {
  TGD: { ka: "პოდგორიცა", ru: "Подгорица", ar: "بودغوريتسا" },
  TIV: { ka: "ტივატი", ru: "Тиват", ar: "تيفات" },
};

function cityName(code: string, locale: Locale): string {
  const catalog = CATALOG_AIRPORTS.find((item) => item.iata === code)?.cityName;
  const place = findSearchPlace(code);
  return catalog?.[locale] || EXTRA_CITY_NAMES[code]?.[locale] || catalog?.en || place?.cityName || place?.name || code;
}

/** "Kutaisi (KUT), Tbilisi (TBS), …" in the admin's card order, without duplicates. */
function placesLine(iatas: string[], locale: Locale): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const raw of iatas) {
    const code = raw.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    parts.push(`${cityName(code, locale)} (${code})`);
  }
  return parts.join(", ");
}

/** Homepage title/description that tie the brand name to the popular airports section. */
export function buildHomeSeo(locale: Locale, iatas: string[]): { title: string; description: string } {
  const countries = [
    ...new Set(iatas.map((code) => findSearchPlace(code)?.countryIso2.toUpperCase()).filter(Boolean)),
  ] as string[];
  const where = countries.map((iso) => countryName(iso, locale)).join(", ");
  const tagline = TAGLINE[locale] ?? TAGLINE.en;
  const title = `${SEO_SITE_NAME} – ${tagline}${where ? `: ${where}` : ""}`;
  const places = placesLine(iatas, locale);
  const description = (DESCRIPTION[locale] ?? DESCRIPTION.en)
    .replace("{brand}", SEO_SITE_NAME)
    .replace("{places}", places || where);
  return { title, description };
}

export function popularPlacesListName(locale: Locale): string {
  return `${SEO_SITE_NAME} – ${POPULAR_LIST[locale] ?? POPULAR_LIST.en}`;
}
