import type { Locale } from "@/lib/i18n/config";
import { cityDisplayName, regionName } from "@/lib/i18n/place-label";
import { COUNTRY_PLACES } from "@/lib/catalog/country-places-data";
import { COUNTRY_NAMES_KA } from "@/lib/catalog/country-names-ka";

/** Country shown on the homepage cover before a visitor picks one (main market, what Google sees). */
export const DEFAULT_HERO_COUNTRY = "GE";

const MAX_AIRPORTS = 3;

/** Order the airports are named in, where it differs from the country seed list. */
const AIRPORT_ORDER: Record<string, string[]> = {
  GE: ["TBS", "BUS", "KUT"],
};

/** Russian needs the prepositional case of the country ("в Грузии"). */
const RU_COUNTRY_IN: Record<string, string> = {
  GE: "в Грузии",
  AM: "в Армении",
  AZ: "в Азербайджане",
  ME: "в Черногории",
  RS: "в Сербии",
  TR: "в Турции",
  AL: "в Албании",
  XK: "в Косово",
  MK: "в Северной Македонии",
  HR: "в Хорватии",
  IT: "в Италии",
  GR: "в Греции",
  BG: "в Болгарии",
  RO: "в Румынии",
  ES: "в Испании",
  FR: "во Франции",
  DE: "в Германии",
  PL: "в Польше",
  AE: "в ОАЭ",
  CY: "на Кипре",
  BA: "в Боснии и Герцеговине",
  SI: "в Словении",
  HU: "в Венгрии",
  PT: "в Португалии",
  UA: "в Украине",
  IL: "в Израиле",
};

/** Georgian genitive that the simple rule gets wrong (vowel drop). */
const KA_GENITIVE: Record<string, string> = {
  ერევანი: "ერევნის",
};

/** "საქართველო" → "საქართველოში", "სომხეთი" → "სომხეთში". */
function kaInCountry(name: string): string {
  return name.endsWith("ი") ? `${name.slice(0, -1)}ში` : `${name}ში`;
}

/** "თბილისი" → "თბილისის", "ტირანა" → "ტირანის", "ბაქო" → "ბაქოს". */
function kaGenitive(name: string): string {
  if (KA_GENITIVE[name]) return KA_GENITIVE[name];
  if (/[ია]$/.test(name)) return `${name.slice(0, -1)}ის`;
  if (/[ეოუ]$/.test(name)) return `${name}ს`;
  return `${name}ის`;
}

/** "Ереван" → "Еревана", "Гянджа" → "Гянджи", "Тбилиси" stays. */
function ruGenitive(name: string): string {
  if (/[иоуеэюы]$/i.test(name) || /\s/.test(name)) return name;
  if (/[гкхжчшщ]а$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}ы`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/й$/i.test(name)) return `${name.slice(0, -1)}я`;
  return `${name}а`;
}

const GEORGIAN = /^[\u10A0-\u10FF\s-]+$/;
const CYRILLIC = /^[\u0400-\u04FF\s-]+$/;

function joinList(items: string[], and: string, comma = ", ", gap = " "): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(comma)}${gap}${and}${gap}${items[items.length - 1]}`;
}

/** English city names of the country's main airports, active ones first, at most three. */
export function countryAirportCities(iso2: string, activeIatas: string[] = []): string[] {
  const code = iso2.toUpperCase();
  const seeds = COUNTRY_PLACES[code]?.airports ?? [];
  const order = AIRPORT_ORDER[code] ?? seeds.map((s) => s[0]);
  const rank = (iata: string) => {
    const i = order.indexOf(iata);
    return i === -1 ? order.length : i;
  };
  const active = new Set(activeIatas.map((c) => c.toUpperCase()));
  const pool = active.size ? seeds.filter((s) => active.has(s[0])) : seeds;
  const cities: string[] = [];
  for (const [, city] of [...pool].sort((a, b) => rank(a[0]) - rank(b[0]))) {
    if (city && !cities.includes(city)) cities.push(city);
    if (cities.length >= MAX_AIRPORTS) break;
  }
  return cities;
}

function countryTitle(locale: Locale, code: string): string {
  const name = regionName(locale, code, code);
  switch (locale) {
    case "ka":
      return `მანქანების გაქირავება ${kaInCountry(COUNTRY_NAMES_KA[code] || name)}`;
    case "ru":
      return RU_COUNTRY_IN[code] ? `Аренда авто ${RU_COUNTRY_IN[code]}` : `Аренда авто: ${name}`;
    case "de":
      return `Mietwagen in ${name}`;
    case "es":
      return `Alquiler de coches en ${name}`;
    case "fr":
      return `Location de voiture : ${name}`;
    case "it":
      return `Noleggio auto in ${name}`;
    case "nl":
      return `Autoverhuur in ${name}`;
    case "pl":
      return `Wynajem samochodów: ${name}`;
    case "tr":
      return `${name} araç kiralama`;
    case "ar":
      return `تأجير السيارات في ${name}`;
    case "zh":
      return `${name}租车`;
    case "ko":
      return `${name} 렌터카`;
    case "th":
      return `เช่ารถใน${name}`;
    default:
      return `Car rental in ${name}`;
  }
}

function airportLine(locale: Locale, englishCities: string[]): string {
  const cities = englishCities.map((city) => cityDisplayName(locale, city));
  const one = cities.length === 1;
  switch (locale) {
    case "ka":
      return cities.every((c) => GEORGIAN.test(c))
        ? `მანქანის გაქირავება ${joinList(cities.map(kaGenitive), "და")} აეროპორტში.`
        : `მანქანის გაქირავება აეროპორტებში: ${joinList(cities, "და")}.`;
    case "ru":
      return cities.every((c) => CYRILLIC.test(c))
        ? `Аренда авто в ${one ? "аэропорту" : "аэропортах"} ${joinList(cities.map(ruGenitive), "и")}.`
        : `Аренда авто в аэропортах: ${joinList(cities, "и")}.`;
    case "de":
      return `Mietwagen ${one ? "am Flughafen" : "an den Flughäfen"} ${joinList(cities, "und")}.`;
    case "es":
      return `Alquiler de coches en ${one ? "el aeropuerto" : "los aeropuertos"} de ${joinList(cities, "y")}.`;
    case "fr":
      return `Location de voiture ${one ? "à l’aéroport" : "aux aéroports"} de ${joinList(cities, "et")}.`;
    case "it":
      return `Noleggio auto ${one ? "all’aeroporto" : "negli aeroporti"} di ${joinList(cities, "e")}.`;
    case "nl":
      return `Autoverhuur op ${one ? "de luchthaven" : "de luchthavens"} van ${joinList(cities, "en")}.`;
    case "pl":
      return `Wynajem samochodów ${one ? "na lotnisku" : "na lotniskach"}: ${joinList(cities, "i")}.`;
    case "tr":
      return `${joinList(cities, "ve")} ${one ? "havalimanında" : "havalimanlarında"} araç kiralama.`;
    case "ar":
      return `تأجير السيارات في ${one ? "مطار" : "مطارات"} ${cities.join(" و")}.`;
    case "zh":
      return `${joinList(cities, "和", "、", "")}机场租车。`;
    case "ko":
      return `${cities.join(", ")} 공항 렌터카.`;
    case "th":
      return `เช่ารถที่สนามบิน ${joinList(cities, "และ")}`;
    default:
      return `Car rental at ${joinList(cities, "and")} ${one ? "airport" : "airports"}.`;
  }
}

const WORLD_HEADLINE: Record<Locale, string> = {
  en: "Car rental at the airport",
  ka: "მანქანის გაქირავება აეროპორტში",
  de: "Mietwagen am Flughafen",
  es: "Alquiler de coches en el aeropuerto",
  fr: "Location de voiture à l’aéroport",
  it: "Noleggio auto in aeroporto",
  nl: "Autoverhuur op de luchthaven",
  pl: "Wynajem samochodów na lotnisku",
  tr: "Havalimanında araç kiralama",
  ru: "Аренда авто в аэропорту",
  ar: "تأجير السيارات في المطار",
  zh: "机场租车",
  ko: "공항 렌터카",
  th: "เช่ารถที่สนามบิน",
};

/** Cover title before a country is picked. */
export function worldHeroHeadline(locale: Locale): string {
  return WORLD_HEADLINE[locale] ?? WORLD_HEADLINE.en;
}

/**
 * Homepage cover headline for the country picked in search (Georgia until one is picked):
 * "Car rental in {country} — Car rental at {main airports}." in the visitor's language.
 * `activeIatas` are the airports currently offered in search; they decide which airports are named.
 */
export function countryHeroHeadline(locale: Locale, iso2: string, activeIatas: string[] = []): string {
  const code = (iso2 || DEFAULT_HERO_COUNTRY).toUpperCase();
  const title = countryTitle(locale, code);
  const cities = countryAirportCities(code, activeIatas);
  return cities.length ? `${title} — ${airportLine(locale, cities)}` : title;
}
