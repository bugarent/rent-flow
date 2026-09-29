import type { Locale } from "@/lib/i18n/config";

export type LocalizedName = Partial<Record<Locale, string>> & { en: string };

export type CatalogAirport = {
  iata: string;
  icao?: string;
  citySlug: string;
  countryIso2: string;
  name: LocalizedName;
  cityName: LocalizedName;
  countryName: LocalizedName;
  isHub: boolean;
  latitude?: number;
  longitude?: number;
  timezone: string;
};

const ge: LocalizedName = {
  en: "Georgia",
  ka: "საქართველო",
  ru: "Грузия",
  fr: "Géorgie",
  de: "Georgien",
  pl: "Gruzja",
  ar: "جورجيا",
};

function loc(en: string, ka: string, ru: string, fr: string, de: string, pl: string, ar: string): LocalizedName {
  return { en, ka, ru, fr, de, pl, ar };
}

/** Hub airports always appear in search. International airports expand as partners are approved. */
export const CATALOG_AIRPORTS: CatalogAirport[] = [
  {
    iata: "TBS",
    icao: "UGTB",
    citySlug: "tbilisi",
    countryIso2: "GE",
    isHub: true,
    timezone: "Asia/Tbilisi",
    latitude: 41.6692,
    longitude: 44.9547,
    name: loc("Tbilisi International Airport", "თბილისის საერთაშორისო აეროპორტი", "Международный аэропорт Тбилиси", "Aéroport international de Tbilissi", "Flughafen Tiflis", "Port lotniczy Tbilisi", "مطار تبليسي الدولي"),
    cityName: loc("Tbilisi", "თბილისი", "Тбилиси", "Tbilissi", "Tiflis", "Tbilisi", "تبليسي"),
    countryName: ge,
  },
  {
    iata: "KUT",
    icao: "UGKO",
    citySlug: "kutaisi",
    countryIso2: "GE",
    isHub: true,
    timezone: "Asia/Tbilisi",
    latitude: 42.1767,
    longitude: 42.4826,
    name: loc("Kutaisi International Airport", "ქუთაისის საერთაშორისო აეროპორტი", "Международный аэропорт Кутаиси", "Aéroport international de Koutaïssi", "Flughafen Kutaissi", "Port lotniczy Kutaisi", "مطار كوتايسي الدولي"),
    cityName: loc("Kutaisi", "ქუთაისი", "Кутаиси", "Koutaïssi", "Kutaissi", "Kutaisi", "كوتايسي"),
    countryName: ge,
  },
  {
    iata: "BUS",
    icao: "UGSB",
    citySlug: "batumi",
    countryIso2: "GE",
    isHub: true,
    timezone: "Asia/Tbilisi",
    latitude: 41.6103,
    longitude: 41.5997,
    name: loc("Batumi International Airport", "ბათუმის საერთაშორისო აეროპორტი", "Международный аэропорт Батуми", "Aéroport international de Batoumi", "Flughafen Batumi", "Port lotniczy Batumi", "مطار باتومي الدولي"),
    cityName: loc("Batumi", "ბათუმი", "Батуми", "Batoumi", "Batumi", "Batumi", "باتومي"),
    countryName: ge,
  },
  {
    iata: "IST",
    citySlug: "istanbul",
    countryIso2: "TR",
    isHub: false,
    timezone: "Europe/Istanbul",
    name: loc("Istanbul Airport", "სტამბოლის აეროპორტი", "Аэропорт Стамбул", "Aéroport d'Istanbul", "Flughafen Istanbul", "Port lotniczy Stambuł", "مطار إسطنبول"),
    cityName: loc("Istanbul", "სტამბოლი", "Стамбул", "Istanbul", "Istanbul", "Stambuł", "إسطنبول"),
    countryName: loc("Turkey", "თურქეთი", "Турция", "Turquie", "Türkei", "Turcja", "تركيا"),
  },
  {
    iata: "AYT",
    citySlug: "antalya",
    countryIso2: "TR",
    isHub: false,
    timezone: "Europe/Istanbul",
    name: loc("Antalya Airport", "ანთალიის აეროპორტი", "Аэропорт Анталья", "Aéroport d'Antalya", "Flughafen Antalya", "Port lotniczy Antalya", "مطار أنطاليا"),
    cityName: loc("Antalya", "ანთალია", "Анталья", "Antalya", "Antalya", "Antalya", "أنطاليا"),
    countryName: loc("Turkey", "თურქეთი", "Турция", "Turquie", "Türkei", "Turcja", "تركيا"),
  },
  {
    iata: "EVN",
    citySlug: "yerevan",
    countryIso2: "AM",
    isHub: false,
    timezone: "Asia/Yerevan",
    name: loc("Zvartnots International Airport", "ზვარტნოცის აეროპორტი", "Аэропорт Звартноц", "Aéroport Zvartnots", "Flughafen Zvartnots", "Port lotniczy Zwartnoc", "مطار زفارتنوتس"),
    cityName: loc("Yerevan", "ერევანი", "Ереван", "Erevan", "Jerewan", "Erywań", "يريفان"),
    countryName: loc("Armenia", "სომხეთი", "Армения", "Arménie", "Armenien", "Armenia", "أرمينيا"),
  },
  {
    iata: "GYD",
    citySlug: "baku",
    countryIso2: "AZ",
    isHub: false,
    timezone: "Asia/Baku",
    name: loc("Heydar Aliyev International Airport", "ჰეიდარ ალიევის აეროპორტი", "Аэропорт Гейдар Алиев", "Aéroport Heydar Aliyev", "Flughafen Heydər Əliyev", "Port lotniczy Heydər Əliyev", "مطار حيدر علييف"),
    cityName: loc("Baku", "ბაქო", "Баку", "Bakou", "Baku", "Baku", "باكو"),
    countryName: loc("Azerbaijan", "აზერბაიჯანი", "Азербайджан", "Azerbaïdjan", "Aserbaidschan", "Azerbejdżan", "أذربيجان"),
  },
  {
    iata: "WAW",
    citySlug: "warsaw",
    countryIso2: "PL",
    isHub: false,
    timezone: "Europe/Warsaw",
    name: loc("Warsaw Chopin Airport", "ვარშავის აეროპორტი", "Аэропорт Шопен", "Aéroport Chopin", "Flughafen Warschau Chopin", "Lotnisko Chopina", "مطار وارسو شوبان"),
    cityName: loc("Warsaw", "ვარშავა", "Варшава", "Varsovie", "Warschau", "Warszawa", "وارسو"),
    countryName: loc("Poland", "პოლონეთი", "Польша", "Pologne", "Polen", "Polska", "بولندا"),
  },
  {
    iata: "CDG",
    citySlug: "paris",
    countryIso2: "FR",
    isHub: false,
    timezone: "Europe/Paris",
    name: loc("Paris Charles de Gaulle", "შარლ დე გოლი", "Шарль-де-Голль", "Paris Charles de Gaulle", "Paris Charles de Gaulle", "Paryż Charles de Gaulle", "باريس شارل ديغول"),
    cityName: loc("Paris", "პარიზი", "Париж", "Paris", "Paris", "Paryż", "باريس"),
    countryName: loc("France", "საფრანგეთი", "Франция", "France", "Frankreich", "Francja", "فرنسا"),
  },
  {
    iata: "FRA",
    citySlug: "frankfurt",
    countryIso2: "DE",
    isHub: false,
    timezone: "Europe/Berlin",
    name: loc("Frankfurt Airport", "ფრანკფურტის აეროპორტი", "Аэропорт Франкфурт", "Aéroport de Francfort", "Flughafen Frankfurt", "Port lotniczy Frankfurt", "مطار فرانكفورت"),
    cityName: loc("Frankfurt", "ფრანკფურტი", "Франкфурт", "Francfort", "Frankfurt", "Frankfurt", "فرانكفورت"),
    countryName: loc("Germany", "გერმანია", "Германия", "Allemagne", "Deutschland", "Niemcy", "ألمانيا"),
  },
  {
    iata: "MXP",
    citySlug: "milan",
    countryIso2: "IT",
    isHub: false,
    timezone: "Europe/Rome",
    name: loc("Milan Malpensa", "მილანის მალპენსა", "Милан Мальпенса", "Milan Malpensa", "Mailand Malpensa", "Mediolan Malpensa", "ميلان مالبينسا"),
    cityName: loc("Milan", "მილანი", "Милан", "Milan", "Mailand", "Mediolan", "ميلان"),
    countryName: loc("Italy", "იტალია", "Италия", "Italie", "Italien", "Włochy", "إيطاليا"),
  },
  {
    iata: "BCN",
    citySlug: "barcelona",
    countryIso2: "ES",
    isHub: false,
    timezone: "Europe/Madrid",
    name: loc("Barcelona El Prat", "ბარსელონა", "Барселона", "Barcelone", "Barcelona", "Barcelona", "برشلونة"),
    cityName: loc("Barcelona", "ბარსელონა", "Барселона", "Barcelone", "Barcelona", "Barcelona", "برشلونة"),
    countryName: loc("Spain", "ესპანეთი", "Испания", "Espagne", "Spanien", "Hiszpania", "إسبانيا"),
  },
  {
    iata: "ATH",
    citySlug: "athens",
    countryIso2: "GR",
    isHub: false,
    timezone: "Europe/Athens",
    name: loc("Athens International", "ათენი", "Афины", "Athènes", "Athen", "Ateny", "أثينا"),
    cityName: loc("Athens", "ათენი", "Афины", "Athènes", "Athen", "Ateny", "أثينا"),
    countryName: loc("Greece", "საბერძნეთი", "Греция", "Grèce", "Griechenland", "Grecja", "اليونان"),
  },
  {
    iata: "AMS",
    citySlug: "amsterdam",
    countryIso2: "NL",
    isHub: false,
    timezone: "Europe/Amsterdam",
    name: loc("Amsterdam Schiphol", "ამსტერდამი", "Амстердам", "Amsterdam", "Amsterdam", "Amsterdam", "أمستردام"),
    cityName: loc("Amsterdam", "ამსტერდამი", "Амстердам", "Amsterdam", "Amsterdam", "Amsterdam", "أمستردام"),
    countryName: loc("Netherlands", "ნიდერლანდები", "Нидерланды", "Pays-Bas", "Niederlande", "Holandia", "هولندا"),
  },
  {
    iata: "PRG",
    citySlug: "prague",
    countryIso2: "CZ",
    isHub: false,
    timezone: "Europe/Prague",
    name: loc("Prague Václav Havel", "პრაღა", "Прага", "Prague", "Prag", "Praga", "براغ"),
    cityName: loc("Prague", "პრაღა", "Прага", "Prague", "Prag", "Praga", "براغ"),
    countryName: loc("Czechia", "ჩეხეთი", "Чехия", "Tchéquie", "Tschechien", "Czechy", "التشيك"),
  },
  {
    iata: "OTP",
    citySlug: "bucharest",
    countryIso2: "RO",
    isHub: false,
    timezone: "Europe/Bucharest",
    name: loc("Bucharest Otopeni", "ბუქარესტი", "Бухарест", "Bucarest", "Bukarest", "Bukareszt", "بوخارست"),
    cityName: loc("Bucharest", "ბუქარესტი", "Бухарест", "Bucarest", "Bukarest", "Bukareszt", "بوخارست"),
    countryName: loc("Romania", "რუმინეთი", "Румыния", "Roumanie", "Rumänien", "Rumunia", "رومانيا"),
  },
  {
    iata: "SOF",
    citySlug: "sofia",
    countryIso2: "BG",
    isHub: false,
    timezone: "Europe/Sofia",
    name: loc("Sofia Airport", "სოფია", "София", "Sofia", "Sofia", "Sofia", "صوفيا"),
    cityName: loc("Sofia", "სოფია", "София", "Sofia", "Sofia", "Sofia", "صوفيا"),
    countryName: loc("Bulgaria", "ბულგარეთი", "Болгария", "Bulgarie", "Bulgarien", "Bułgaria", "بلغاريا"),
  },
  {
    iata: "LHR",
    citySlug: "london",
    countryIso2: "GB",
    isHub: false,
    timezone: "Europe/London",
    name: loc("London Heathrow", "ლონდონი", "Лондон", "Londres", "London", "Londyn", "لندن"),
    cityName: loc("London", "ლონდონი", "Лондон", "Londres", "London", "Londyn", "لندن"),
    countryName: loc("United Kingdom", "გაერთიანებული სამეფო", "Великобритания", "Royaume-Uni", "Vereinigtes Königreich", "Wielka Brytania", "المملكة المتحدة"),
  },
  {
    iata: "DXB",
    citySlug: "dubai",
    countryIso2: "AE",
    isHub: false,
    timezone: "Asia/Dubai",
    name: loc("Dubai International", "დუბაი", "Дубай", "Dubaï", "Dubai", "Dubaj", "دبي"),
    cityName: loc("Dubai", "დუბაი", "Дубай", "Dubaï", "Dubai", "Dubaj", "دبي"),
    countryName: loc("United Arab Emirates", "არაბთა გაერთიანებული საამიროები", "ОАЭ", "Émirats arabes unis", "VAE", "ZEA", "الإمارات"),
  },
  {
    iata: "TLV",
    citySlug: "tel-aviv",
    countryIso2: "IL",
    isHub: false,
    timezone: "Asia/Jerusalem",
    name: loc("Tel Aviv Ben Gurion", "თელ-ავივი", "Тель-Авив", "Tel-Aviv", "Tel Aviv", "Tel Awiw", "تل أبيب"),
    cityName: loc("Tel Aviv", "თელ-ავივი", "Тель-Авив", "Tel-Aviv", "Tel Aviv", "Tel Awiw", "تل أبيب"),
    countryName: loc("Israel", "ისრაელი", "Израиль", "Israël", "Israel", "Izrael", "إسرائيل"),
  },
  {
    iata: "KBP",
    citySlug: "kyiv",
    countryIso2: "UA",
    isHub: false,
    timezone: "Europe/Kyiv",
    name: loc("Kyiv Boryspil", "კიევი", "Киев", "Kiev", "Kiew", "Kijów", "كييف"),
    cityName: loc("Kyiv", "კიევი", "Киев", "Kiev", "Kiew", "Kijów", "كييف"),
    countryName: loc("Ukraine", "უკრაინა", "Украина", "Ukraine", "Ukraine", "Ukraina", "أوكرانيا"),
  },
];

export const COUNTRIES_OF_RESIDENCE = [
  { iso2: "GE", name: ge },
  { iso2: "TR", name: loc("Turkey", "თურქეთი", "Турция", "Turquie", "Türkei", "Turcja", "تركيا") },
  { iso2: "AM", name: loc("Armenia", "სომხეთი", "Армения", "Arménie", "Armenien", "Armenia", "أرمينيا") },
  { iso2: "AZ", name: loc("Azerbaijan", "აზერბაიჯანი", "Азербайджан", "Azerbaïdjan", "Aserbaidschan", "Azerbejdżan", "أذربيجان") },
  { iso2: "PL", name: loc("Poland", "პოლონეთი", "Польша", "Pologne", "Polen", "Polska", "بولندا") },
  { iso2: "FR", name: loc("France", "საფრანგეთი", "Франция", "France", "Frankreich", "Francja", "فرنسا") },
  { iso2: "DE", name: loc("Germany", "გერმანია", "Гერმანია", "Allemagne", "Deutschland", "Niemcy", "ألمانيا") },
  { iso2: "GB", name: loc("United Kingdom", "გაერთიანებული სამეფო", "Великобритания", "Royaume-Uni", "Vereinigtes Königreich", "Wielka Brytania", "المملكة المتحدة") },
  { iso2: "US", name: loc("United States", "აშშ", "США", "États-Unis", "Vereinigte Staaten", "Stany Zjednoczone", "الولايات المتحدة") },
  { iso2: "AE", name: loc("United Arab Emirates", "არაბთა გაერთიანებული საამიროები", "ОАЭ", "Émirats arabes unis", "Vereinigte Arabische Emirate", "Zjednoczone Emiraty Arabskie", "الإمارات") },
  { iso2: "IL", name: loc("Israel", "ისრაელი", "Израиль", "Israël", "Israel", "Izrael", "إسرائيل") },
  { iso2: "UA", name: loc("Ukraine", "უკრაინა", "Украина", "Ukraine", "Ukraine", "Ukraina", "أوكرانيا") },
] as const;

export function airportsByCountry(airports: CatalogAirport[]) {
  const map = new Map<string, CatalogAirport[]>();
  for (const a of airports) {
    const list = map.get(a.countryIso2) ?? [];
    list.push(a);
    map.set(a.countryIso2, list);
  }
  return map;
}
