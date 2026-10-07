import type { SearchAirportOption } from "@/components/search/airport-search";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { COUNTRY_PLACES } from "@/lib/catalog/country-places-data";

/** Main international airport cities shown in the heading. */
const MAX_CITIES = 4;

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

/** Local names for the main airport cities outside the localized airport catalog. */
const KA_CITY: Record<string, string> = {
  Tbilisi: "თბილისი", Kutaisi: "ქუთაისი", Batumi: "ბათუმი",
  Yerevan: "ერევანი", Gyumri: "გიუმრი",
  Baku: "ბაქო", Ganja: "განჯა", Nakhchivan: "ნახჭევანი", Lankaran: "ლენქორანი",
  Istanbul: "სტამბოლი", Antalya: "ანთალია", Ankara: "ანკარა", Izmir: "იზმირი", Trabzon: "ტრაპიზონი",
  Paris: "პარიზი", Nice: "ნიცა", Lyon: "ლიონი", Marseille: "მარსელი",
  Frankfurt: "ფრანკფურტი", Munich: "მიუნხენი", Berlin: "ბერლინი", Dusseldorf: "დიუსელდორფი",
  Rome: "რომი", Milan: "მილანი", Venice: "ვენეცია", Naples: "ნეაპოლი",
  Madrid: "მადრიდი", Barcelona: "ბარსელონა", Palma: "პალმა", Malaga: "მალაგა",
  London: "ლონდონი", Manchester: "მანჩესტერი", Edinburgh: "ედინბურგი", Birmingham: "ბირმინგემი",
  Warsaw: "ვარშავა", Krakow: "კრაკოვი", Gdansk: "გდანსკი", Wroclaw: "ვროცლავი",
  Kyiv: "კიევი", Lviv: "ლვოვი", Odesa: "ოდესა",
  "New York": "ნიუ-იორკი", Newark: "ნიუარკი", "Los Angeles": "ლოს-ანჯელესი", Chicago: "ჩიკაგო",
  Vienna: "ვენა", Salzburg: "ზალცბურგი", Innsbruck: "ინსბრუკი",
  Athens: "ათენი", Thessaloniki: "სალონიკი", Heraklion: "ჰერაკლიონი",
  Dubai: "დუბაი", "Abu Dhabi": "აბუ-დაბი", Sharjah: "შარჯა", Doha: "დოჰა",
  "Tel Aviv": "თელ-ავივი", Prague: "პრაღა", Amsterdam: "ამსტერდამი",
  Bucharest: "ბუქარესტი", Sofia: "სოფია", Varna: "ვარნა", Burgas: "ბურგასი", Budapest: "ბუდაპეშტი",
  Moscow: "მოსკოვი", "Saint Petersburg": "სანქტ-პეტერბურგი", Minsk: "მინსკი",
  Riga: "რიგა", Vilnius: "ვილნიუსი", Tallinn: "ტალინი", Brussels: "ბრიუსელი",
  Zurich: "ციურიხი", Geneva: "ჟენევა", Lisbon: "ლისაბონი", Porto: "პორტო", Faro: "ფარო",
  Copenhagen: "კოპენჰაგენი", Stockholm: "სტოკჰოლმი", Oslo: "ოსლო", Helsinki: "ჰელსინკი",
  Cairo: "კაირო", Larnaca: "ლარნაკა", Paphos: "პაფოსი", Chisinau: "კიშინიოვი",
  Belgrade: "ბელგრადი", Tashkent: "ტაშკენტი", Almaty: "ალმათი", Astana: "ასტანა",
};

const RU_CITY: Record<string, string> = {
  Yerevan: "Ереван", Gyumri: "Гюмри",
  Baku: "Баку", Ganja: "Гянджа", Nakhchivan: "Нахичевань", Lankaran: "Ленкорань",
  Istanbul: "Стамбул", Antalya: "Анталья", Ankara: "Анкара", Izmir: "Измир", Trabzon: "Трабзон",
  Paris: "Париж", Nice: "Ницца", Lyon: "Лион", Marseille: "Марсель",
  Frankfurt: "Франкфурт", Munich: "Мюнхен", Berlin: "Берлин", Dusseldorf: "Дюссельдорф",
  Rome: "Рим", Milan: "Милан", Venice: "Венеция", Naples: "Неаполь",
  Madrid: "Мадрид", Barcelona: "Барселона", Palma: "Пальма", Malaga: "Малага",
  London: "Лондон", Manchester: "Манчестер", Edinburgh: "Эдинбург", Birmingham: "Бирмингем",
  Warsaw: "Варшава", Krakow: "Краков", Gdansk: "Гданьск", Wroclaw: "Вроцлав",
  Kyiv: "Киев", Lviv: "Львов", Odesa: "Одесса",
  "New York": "Нью-Йорк", Newark: "Ньюарк", "Los Angeles": "Лос-Анджелес", Chicago: "Чикаго",
  Vienna: "Вена", Salzburg: "Зальцбург", Innsbruck: "Инсбрук",
  Athens: "Афины", Thessaloniki: "Салоники", Heraklion: "Ираклион",
  Dubai: "Дубай", "Abu Dhabi": "Абу-Даби", Sharjah: "Шарджа", Doha: "Доха",
  "Tel Aviv": "Тель-Авив", Prague: "Прага", Amsterdam: "Амстердам",
  Bucharest: "Бухарест", Sofia: "София", Varna: "Варна", Burgas: "Бургас", Budapest: "Будапешт",
  Moscow: "Москва", "Saint Petersburg": "Санкт-Петербург", Minsk: "Минск",
  Riga: "Рига", Vilnius: "Вильнюс", Tallinn: "Таллин", Brussels: "Брюссель",
  Zurich: "Цюрих", Geneva: "Женева", Lisbon: "Лиссабон", Porto: "Порту", Faro: "Фару",
  Copenhagen: "Копенгаген", Stockholm: "Стокгольм", Oslo: "Осло", Helsinki: "Хельсинки",
  Cairo: "Каир", Larnaca: "Ларнака", Paphos: "Пафос", Chisinau: "Кишинёв",
  Belgrade: "Белград", Tashkent: "Ташкент", Almaty: "Алматы", Astana: "Астана",
};

const CITY_NAMES: Record<string, Record<string, string>> = { ka: KA_CITY, ru: RU_CITY };

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

function localizedCity(englishCity: string, iata: string, locale: string) {
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === iata.toUpperCase());
  const names = catalog?.cityName as Record<string, string | undefined> | undefined;
  if (names?.[locale]) return names[locale] as string;
  return CITY_NAMES[locale]?.[englishCity] || englishCity;
}

/** Biggest international airport cities of a country (seed lists are ordered by size). */
function majorAirportCities(iso2: string, options: SearchAirportOption[]) {
  const seeded = COUNTRY_PLACES[iso2]?.airports ?? [];
  const fromSeed = seeded.map(([iata, city]) => ({ iata, city }));
  const fromActive = options
    .filter((o) => o.kind !== "city" && o.countryIso2?.toUpperCase() === iso2)
    .map((o) => ({ iata: o.iata, city: cityFromLabel(o.label) }));
  const seen = new Set<string>();
  const out: Array<{ iata: string; city: string }> = [];
  for (const entry of fromSeed.length ? fromSeed : fromActive) {
    const key = entry.city.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
    if (out.length >= MAX_CITIES) break;
  }
  return out;
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

/** Search-page heading naming the country's main international airports, or null when unknown. */
export function carsSearchHeading(input: {
  locale: string;
  options: SearchAirportOption[];
  countryIso2: string;
}): string | null {
  const iso2 = input.countryIso2.trim().toUpperCase();
  if (!iso2) return null;
  const cities = majorAirportCities(iso2, input.options);
  if (!cities.length) return null;

  const names = cities.map(({ city, iata }) => localizedCity(city, iata, input.locale));
  const template = TEMPLATES[input.locale] ?? TEMPLATES.en;
  const listed = input.locale === "ka" ? names.map(georgianGenitive) : names;
  const list = joinList(listed, input.locale);
  return names.length === 1 ? template.one(list) : template.many(list);
}
