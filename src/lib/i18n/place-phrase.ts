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

const NON_LATIN: Partial<Record<Locale, RegExp>> = {
  ka: /[\u10A0-\u10FF]/,
  ru: /[\u0400-\u04FF]/,
  ar: /[\u0600-\u06FF]/,
  zh: /[\u4E00-\u9FFF]/,
  ko: /[\uAC00-\uD7AF]/,
  th: /[\u0E00-\u0E7F]/,
};

function hasLatin(value: string): boolean {
  return /[A-Za-z\u00C0-\u024F]/.test(value);
}

function inTargetScript(locale: Locale, value: string): boolean {
  const script = NON_LATIN[locale];
  if (!script) return true;
  return script.test(value) && !hasLatin(value);
}

/** Last resort so a selected non-Latin language never keeps the English spelling. */
function transliteratePlace(locale: Locale, english: string): string {
  const map = TRANSLIT[locale];
  if (!map) return english;
  const lower = english.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let out = "";
  for (let i = 0; i < lower.length; ) {
    const three = lower.slice(i, i + 3);
    const two = lower.slice(i, i + 2);
    if (map[three]) {
      out += map[three];
      i += 3;
    } else if (map[two]) {
      out += map[two];
      i += 2;
    } else {
      const ch = lower[i];
      out += map[ch] ?? (ch === " " || ch === "-" || ch === "'" ? ch : "");
      i += 1;
    }
  }
  return out.replace(/\s+/g, " ").trim() || english;
}

function letters(rows: Array<[string, string]>): Record<string, string> {
  return Object.fromEntries(rows);
}

const TRANSLIT: Partial<Record<Locale, Record<string, string>>> = {
  ka: letters([
    ["sh", "შ"], ["ch", "ჩ"], ["kh", "ხ"], ["zh", "ჟ"], ["ts", "ც"], ["dz", "ძ"], ["gh", "ღ"], ["ph", "ფ"], ["th", "თ"],
    ["a", "ა"], ["b", "ბ"], ["c", "კ"], ["d", "დ"], ["e", "ე"], ["f", "ფ"], ["g", "გ"], ["h", "ჰ"], ["i", "ი"],
    ["j", "ჯ"], ["k", "კ"], ["l", "ლ"], ["m", "მ"], ["n", "ნ"], ["o", "ო"], ["p", "პ"], ["q", "ქ"], ["r", "რ"],
    ["s", "ს"], ["t", "ტ"], ["u", "უ"], ["v", "ვ"], ["w", "ვ"], ["x", "ქს"], ["y", "ი"], ["z", "ზ"],
  ]),
  ru: letters([
    ["sh", "ш"], ["ch", "ч"], ["kh", "х"], ["zh", "ж"], ["ts", "ц"], ["ya", "я"], ["yu", "ю"], ["yo", "ё"], ["ye", "е"],
    ["ph", "ф"], ["th", "т"],
    ["a", "а"], ["b", "б"], ["c", "к"], ["d", "д"], ["e", "е"], ["f", "ф"], ["g", "г"], ["h", "х"], ["i", "и"],
    ["j", "дж"], ["k", "к"], ["l", "л"], ["m", "м"], ["n", "н"], ["o", "о"], ["p", "п"], ["q", "к"], ["r", "р"],
    ["s", "с"], ["t", "т"], ["u", "у"], ["v", "в"], ["w", "в"], ["x", "кс"], ["y", "и"], ["z", "з"],
  ]),
  ar: letters([
    ["sh", "ش"], ["ch", "تش"], ["kh", "خ"], ["zh", "ج"], ["th", "ث"], ["ph", "ف"],
    ["a", "ا"], ["b", "ب"], ["c", "ك"], ["d", "د"], ["e", "ي"], ["f", "ف"], ["g", "غ"], ["h", "ه"], ["i", "ي"],
    ["j", "ج"], ["k", "ك"], ["l", "ل"], ["m", "م"], ["n", "ن"], ["o", "و"], ["p", "ب"], ["q", "ق"], ["r", "ر"],
    ["s", "س"], ["t", "ت"], ["u", "و"], ["v", "ف"], ["w", "و"], ["x", "كس"], ["y", "ي"], ["z", "ز"],
  ]),
  zh: letters([
    ["sh", "什"], ["ch", "奇"], ["kh", "赫"], ["zh", "日"], ["th", "特"], ["ph", "夫"],
    ["a", "阿"], ["b", "布"], ["c", "克"], ["d", "德"], ["e", "厄"], ["f", "夫"], ["g", "格"], ["h", "赫"], ["i", "伊"],
    ["j", "杰"], ["k", "克"], ["l", "尔"], ["m", "姆"], ["n", "恩"], ["o", "奥"], ["p", "普"], ["q", "克"], ["r", "尔"],
    ["s", "斯"], ["t", "特"], ["u", "乌"], ["v", "夫"], ["w", "乌"], ["x", "克斯"], ["y", "伊"], ["z", "兹"],
  ]),
  ko: letters([
    ["sh", "시"], ["ch", "치"], ["kh", "흐"], ["zh", "지"], ["th", "트"], ["ph", "프"],
    ["a", "아"], ["b", "브"], ["c", "크"], ["d", "드"], ["e", "에"], ["f", "프"], ["g", "그"], ["h", "흐"], ["i", "이"],
    ["j", "지"], ["k", "크"], ["l", "르"], ["m", "므"], ["n", "느"], ["o", "오"], ["p", "프"], ["q", "크"], ["r", "르"],
    ["s", "스"], ["t", "트"], ["u", "우"], ["v", "브"], ["w", "우"], ["x", "크스"], ["y", "이"], ["z", "즈"],
  ]),
  th: letters([
    ["sh", "ช"], ["ch", "ช"], ["kh", "ค"], ["zh", "ซ"], ["th", "ท"], ["ph", "ฟ"],
    ["a", "า"], ["b", "บ"], ["c", "ค"], ["d", "ด"], ["e", "เ"], ["f", "ฟ"], ["g", "ก"], ["h", "ฮ"], ["i", "ิ"],
    ["j", "จ"], ["k", "ค"], ["l", "ล"], ["m", "ม"], ["n", "น"], ["o", "โ"], ["p", "ป"], ["q", "ค"], ["r", "ร"],
    ["s", "ซ"], ["t", "ท"], ["u", "ุ"], ["v", "ว"], ["w", "ว"], ["x", "คซ"], ["y", "ย"], ["z", "ซ"],
  ]),
};

/** City name in the selected language. Latin stays only when that language uses it. */
export function placeNameInLocale(locale: string, english: string): string {
  const lang = asLocale(locale);
  const raw = String(english || "").trim();
  if (!raw) return raw;
  const shown = cityDisplayName(lang, raw);
  if (shown && shown !== raw && inTargetScript(lang, shown)) return shown;
  const exo = driveExonym(lang, raw);
  if (exo && inTargetScript(lang, exo)) return exo;
  if (NON_LATIN[lang] && hasLatin(exo || shown || raw)) return transliteratePlace(lang, raw);
  return exo || shown || raw;
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
