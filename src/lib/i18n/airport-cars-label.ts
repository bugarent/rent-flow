import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { placeLabel } from "@/lib/i18n/place-label";

/** Georgian uses the locative ("in Kutaisi"), not the city name alone. */
const PLACE_IN: Record<string, Partial<Record<Locale, string>>> = {
  KUT: { ka: "ქუთაისში" },
  TBS: { ka: "თბილისში" },
  BUS: { ka: "ბათუმში" },
};

const TEMPLATE: Record<Locale, string> = {
  en: "Cars in {place}",
  ka: "მანქანები {place}",
  ru: "Авто в {place}",
  de: "Autos in {place}",
  es: "Coches en {place}",
  fr: "Voitures à {place}",
  it: "Auto a {place}",
  nl: "Auto's in {place}",
  pl: "Samochody w {place}",
  tr: "{place} araçları",
  ar: "سيارات في {place}",
  zh: "{place}的汽车",
  ko: "{place} 차량",
  th: "รถใน{place}",
};

function asLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
}

/** Button under a popular card: "Cars in Kutaisi", "მანქანები ქუთაისში". A city uses its own name. */
export function airportCarsLabel(locale: string, iata: string, cityName?: string): string {
  const lang = asLocale(locale);
  const code = iata.trim().toUpperCase();
  const airport = CATALOG_AIRPORTS.find((item) => item.iata === code);
  const city = String(cityName || "").trim();
  const cityLabel =
    city && city.toUpperCase() !== code
      ? placeLabel(lang, `${city} (city)`).replace(/\s+\([^)]+\)\s*$/, "").trim()
      : "";
  const place =
    PLACE_IN[code]?.[lang] ||
    airport?.cityName[lang] ||
    airport?.cityName.en ||
    cityLabel ||
    code;
  return (TEMPLATE[lang] || TEMPLATE.en).replace("{place}", place);
}
