import { LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { cityDisplayName } from "@/lib/i18n/place-label";
import { driveExonym } from "@/lib/seo/location-drive-exonyms";

/** Genitives the vowel-drop rule gets wrong. */
const KA_GENITIVE: Record<string, string> = {
  ერევანი: "ერევნის",
  ლარნაკა: "ლარნაკას",
};

function asLocale(locale: string): Locale {
  return isLocale(locale) ? locale : "en";
}

/** City name in the selected language. Latin stays only when that language uses it. */
export function placeNameInLocale(locale: string, english: string): string {
  const lang = asLocale(locale);
  const raw = String(english || "").trim();
  if (!raw) return raw;
  const shown = cityDisplayName(lang, raw);
  if (shown && shown !== raw) return shown;
  return driveExonym(lang, raw) || shown || raw;
}

/** "თბილისი" → "თბილისში", "ტირანა" → "ტირანაში". */
export function kaLocative(name: string): string {
  if (name.endsWith("ი")) return `${name.slice(0, -1)}ში`;
  return `${name}ში`;
}

/** "თბილისი" → "თბილისის", "ტირანა" → "ტირანის". */
export function kaGenitive(name: string): string {
  if (KA_GENITIVE[name]) return KA_GENITIVE[name];
  if (/[ია]$/.test(name)) return `${name.slice(0, -1)}ის`;
  if (/[ეოუ]$/.test(name)) return `${name}ს`;
  return `${name}ის`;
}

/** "Тирана" → "Тиране", "Тбилиси" stays, "София" → "Софии". */
export function ruIn(name: string): string {
  if (/ия$/i.test(name)) return `${name.slice(0, -2)}ии`;
  if (/[ая]$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/й$/i.test(name)) return `${name.slice(0, -1)}е`;
  if (/[бвгджзклмнпрстфхцчшщ]$/i.test(name)) return `${name}е`;
  return name;
}

/** "Тирана" → "Тираны", "Тбилиси" stays. */
export function ruGenitive(name: string): string {
  if (/[иоуеэюы]$/i.test(name) || /\s/.test(name)) return name;
  if (/[гкхжчшщ]а$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/а$/i.test(name)) return `${name.slice(0, -1)}ы`;
  if (/я$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/ь$/i.test(name)) return `${name.slice(0, -1)}и`;
  if (/й$/i.test(name)) return `${name.slice(0, -1)}я`;
  return `${name}а`;
}

/** "Tirana" → "Tiranie" for "w Tiranie". */
function plIn(name: string): string {
  if (/a$/i.test(name)) return `${name.slice(0, -1)}ie`;
  return name;
}

/** Card and landing heading: rental in the city, or at that city's airport. */
export function rentalPlaceTitle(
  locale: string,
  kind: "airport" | "city",
  englishCity: string,
  iata?: string,
): string {
  const lang = asLocale(locale);
  const city = placeNameInLocale(lang, englishCity);
  const code = String(iata || "").trim().toUpperCase();
  const airport = kind === "airport" && code;
  if (airport) {
    switch (lang) {
      case "ka":
        return `მანქანის დაქირავება ${kaGenitive(city)} აეროპორტში`;
      case "ru":
        return `Аренда авто в аэропорту ${ruGenitive(city)}`;
      case "de":
        return `Mietwagen am Flughafen ${city} (${code})`;
      case "es":
        return `Alquiler de coches en el aeropuerto de ${city} (${code})`;
      case "fr":
        return `Location de voiture à l'aéroport de ${city} (${code})`;
      case "it":
        return `Noleggio auto all'aeroporto di ${city} (${code})`;
      case "nl":
        return `Autoverhuur op de luchthaven ${city} (${code})`;
      case "pl":
        return `Wynajem aut na lotnisku w ${plIn(city)} (${code})`;
      case "tr":
        return `${city} havalimanı araç kiralama (${code})`;
      case "ar":
        return `تأجير سيارات في مطار ${city} (${code})`;
      case "zh":
        return `${city}机场租车 (${code})`;
      case "ko":
        return `${city} 공항 렌터카 (${code})`;
      case "th":
        return `เช่ารถสนามบิน${city} (${code})`;
      default:
        return `Car rental at ${city} Airport (${code})`;
    }
  }
  switch (lang) {
    case "ka":
      return `მანქანის დაქირავება ${kaLocative(city)}`;
    case "ru":
      return `Аренда авто в ${ruIn(city)}`;
    case "de":
      return `Mietwagen in ${city}`;
    case "es":
      return `Alquiler de coches en ${city}`;
    case "fr":
      return `Location de voiture à ${city}`;
    case "it":
      return `Noleggio auto a ${city}`;
    case "nl":
      return `Autoverhuur in ${city}`;
    case "pl":
      return `Wynajem aut w ${plIn(city)}`;
    case "tr":
      return `${city} araç kiralama`;
    case "ar":
      return `تأجير سيارات في ${city}`;
    case "zh":
      return `${city}租车`;
    case "ko":
      return `${city} 렌터카`;
    case "th":
      return `เช่ารถที่${city}`;
    default:
      return `Car rental in ${city}`;
  }
}

/** Button under a location card: "Cars in Tirana", "მანქანები ტირანაში". */
export function carsInPlaceLabel(locale: string, englishCity: string): string {
  const lang = asLocale(locale);
  const city = placeNameInLocale(lang, englishCity);
  switch (lang) {
    case "ka":
      return `მანქანები ${kaLocative(city)}`;
    case "ru":
      return `Авто в ${ruIn(city)}`;
    case "de":
      return `Autos in ${city}`;
    case "es":
      return `Coches en ${city}`;
    case "fr":
      return `Voitures à ${city}`;
    case "it":
      return `Auto a ${city}`;
    case "nl":
      return `Auto's in ${city}`;
    case "pl":
      return `Samochody w ${plIn(city)}`;
    case "tr":
      return `${city} araçları`;
    case "ar":
      return `سيارات في ${city}`;
    case "zh":
      return `${city}的汽车`;
    case "ko":
      return `${city} 차량`;
    case "th":
      return `รถใน${city}`;
    default:
      return `Cars in ${city}`;
  }
}

export function rentalPlaceTitles(
  kind: "airport" | "city",
  englishCity: string,
  iata?: string,
): Record<Locale, string> {
  const titles = {} as Record<Locale, string>;
  for (const locale of LOCALES) titles[locale] = rentalPlaceTitle(locale, kind, englishCity, iata);
  return titles;
}

export function carsInPlaceLabels(englishCity: string): Record<Locale, string> {
  const labels = {} as Record<Locale, string>;
  for (const locale of LOCALES) labels[locale] = carsInPlaceLabel(locale, englishCity);
  return labels;
}
