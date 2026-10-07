import type { SearchAirportOption } from "@/components/search/airport-search";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";

const MAX_AIRPORTS = 5;

type Template = { one: (list: string) => string; many: (list: string) => string };

const TEMPLATES: Record<string, Template> = {
  en: { one: (l) => `Car rental at ${l} Airport`, many: (l) => `Car rental at ${l} airports` },
  ka: { one: (l) => `მანქანის გაქირავება ${l} აეროპორტში`, many: (l) => `მანქანის გაქირავება ${l} აეროპორტებში` },
  ru: { one: (l) => `Аренда авто в аэропорту: ${l}`, many: (l) => `Аренда авто в аэропортах: ${l}` },
  fr: { one: (l) => `Location de voiture à l'aéroport de ${l}`, many: (l) => `Location de voiture aux aéroports : ${l}` },
  de: { one: (l) => `Mietwagen am Flughafen ${l}`, many: (l) => `Mietwagen an den Flughäfen ${l}` },
  pl: { one: (l) => `Wynajem samochodów na lotnisku: ${l}`, many: (l) => `Wynajem samochodów na lotniskach: ${l}` },
  ar: { one: (l) => `تأجير السيارات في مطار ${l}`, many: (l) => `تأجير السيارات في مطارات ${l}` },
  es: { one: (l) => `Alquiler de coches en el aeropuerto de ${l}`, many: (l) => `Alquiler de coches en los aeropuertos de ${l}` },
  it: { one: (l) => `Noleggio auto all'aeroporto di ${l}`, many: (l) => `Noleggio auto negli aeroporti di ${l}` },
  nl: { one: (l) => `Autohuur op de luchthaven ${l}`, many: (l) => `Autohuur op de luchthavens ${l}` },
  tr: { one: (l) => `${l} Havalimanı'nda araç kiralama`, many: (l) => `${l} havalimanlarında araç kiralama` },
  zh: { one: (l) => `${l}机场租车`, many: (l) => `${l}机场租车` },
  ko: { one: (l) => `${l} 공항 렌터카`, many: (l) => `${l} 공항 렌터카` },
  th: { one: (l) => `เช่ารถที่สนามบิน${l}`, many: (l) => `เช่ารถที่สนามบิน${l}` },
};

/** Georgian genitive ("თბილისი" → "თბილისის", "ბაქო" → "ბაქოს"). */
function georgianGenitive(name: string) {
  if (!/[\u10D0-\u10FF]$/.test(name)) return name;
  if (name === "ერევანი") return "ერევნის";
  if (/[აი]$/.test(name)) return `${name.slice(0, -1)}ის`;
  if (/[ოუე]$/.test(name)) return `${name}ს`;
  return `${name}ის`;
}

/** "Kutaisi · KUT – Kutaisi International Airport" / "Batumi (BUS)" → "Kutaisi" / "Batumi". */
function cityFromLabel(label: string) {
  return label.split(/\s[·(–-]\s?|\s\(/)[0]?.trim() || label.trim();
}

function cityName(option: SearchAirportOption, locale: string) {
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === option.iata.toUpperCase());
  const names = catalog?.cityName as Record<string, string | undefined> | undefined;
  return names?.[locale] || names?.en || cityFromLabel(option.label);
}

function joinList(items: string[], locale: string) {
  if (locale === "ka") {
    return items.length > 1 ? `${items.slice(0, -1).join(", ")} და ${items[items.length - 1]}` : items[0];
  }
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** Search-page heading naming the active airports of the chosen country, or null when unknown. */
export function carsSearchHeading(input: {
  locale: string;
  options: SearchAirportOption[];
  countryIso2: string;
}): string | null {
  const iso2 = input.countryIso2.trim().toUpperCase();
  if (!iso2) return null;
  const catalogOrder = (iata: string) => {
    const i = CATALOG_AIRPORTS.findIndex((a) => a.iata === iata.toUpperCase());
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const airports = input.options
    .filter((o) => o.kind !== "city" && o.countryIso2?.toUpperCase() === iso2)
    .sort((a, b) => catalogOrder(a.iata) - catalogOrder(b.iata) || a.label.localeCompare(b.label));
  const names = [...new Set(airports.map((o) => cityName(o, input.locale)))].slice(0, MAX_AIRPORTS);
  if (!names.length) return null;

  const template = TEMPLATES[input.locale] ?? TEMPLATES.en;
  const listed = input.locale === "ka" ? names.map(georgianGenitive) : names;
  const list = joinList(listed, input.locale);
  return names.length === 1 ? template.one(list) : template.many(list);
}
