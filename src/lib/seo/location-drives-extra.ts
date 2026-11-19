import type { Locale } from "@/lib/i18n/config";

/**
 * Extra nearby drives for location pages that were missing a list, or only
 * named a neighbouring city. Distances are typical road figures in normal traffic.
 * Unknown languages fall back to English inside the drive renderer.
 */
type Tip = "sedan" | "standard" | "crossover" | "highway" | "mountain" | "either";
type Name = { en: string } & Partial<Record<Locale, string>>;
type Spot = {
  name: string | Name;
  km: string;
  time: string;
  tip: Tip;
  also?: { name: string | Name; km: string; time: string };
};

function named(en: string, extra: Partial<Record<Locale, string>>): Name {
  return { en, ...extra };
}

const JVARI = named("Jvari Monastery", { ka: "ჯვრის მონასტერი", ru: "Монастырь Джвари" });
const NEKRESI = named("Nekresi Monastery", { ka: "ნეკრესის მონასტერი", ru: "Монастырь Некреси" });
const GREMI = named("Gremi", { ka: "გრემი", ru: "Греми" });
const ATENI = named("Ateni Sioni", { ka: "ატენის სიონი", ru: "Атенский Сиони" });
const SAPARA = named("Sapara Monastery", { ka: "საფარის მონასტერი", ru: "Монастырь Сапара" });
const NOKALAKEVI = named("Nokalakevi", { ka: "ნოქალაქევი", ru: "Нокалакеви" });
const DMANISI = named("Dmanisi", { ka: "დმანისი", ru: "Дманиси" });
const GAREJA = named("David Gareja", { ka: "დავითგარეჯა", ru: "Давид-Гареджа" });
const ANAKLIA = named("Anaklia", { ka: "ანაკლია", ru: "Анаклия" });
const UREKI = named("Ureki", { ka: "ურეკი", ru: "Уреки" });
const SHEKVETILI = named("Shekvetili", { ka: "შეკვეთილი", ru: "Шекветили" });
const GARDEN = named("Batumi Botanical Garden", { ka: "ბათუმის ბოტანიკური ბაღი", ru: "Батумский ботанический сад" });
const MAKHUNTSETI = named("Makhuntseti Waterfall", { ka: "მახუნცეთის ჩანჩქერი", ru: "Водопад Махунцети" });
const BAKHMARO = named("Bakhmaro", { ka: "ბახმარო", ru: "Бахмаро" });
const SURAMI = named("Surami Fortress", { ka: "სურამის ციხე", ru: "Сурамская крепость" });
const GOYGOL = named("Lake Goygol", { ka: "გოიგოლის ტბა", ru: "Озеро Гёйгёль" });
const MARMASHEN = named("Marmashen", { ka: "მარმაშენი", ru: "Мармашен" });
const TATEV = named("Tatev Monastery", { ka: "ტათევის მონასტერი", ru: "Монастырь Татев" });
const OSTROG = named("Ostrog Monastery", { ka: "ოსტროგის მონასტერი", ru: "Монастырь Острог" });
const LOVCEN = named("Lovćen", { ka: "ლოვჩენი", ru: "Ловчен" });
const PERAST = named("Perast", { ka: "პერასტი", ru: "Пераст" });
const SVETI = named("Sveti Stefan", { ka: "სვეტი-სტეფანი", ru: "Свети-Стефан" });
const LAKE_SKADAR = named("Lake Skadar", { ka: "სკადარის ტბა", ru: "Скадарское озеро" });
const DURMITOR = named("Durmitor & Black Lake", { ka: "დურმიტორი და შავი ტბა", ru: "Дурмитор и Чёрное озеро" });
const KRUJA = named("Krujë", { ka: "კრუია", ru: "Круя" });
const BERAT = named("Berat", { ka: "ბერატი", ru: "Берат" });
const LLOGARA = named("Llogara Pass", { ka: "ლლოგარას უღელტეხილი", ru: "Перевал Ллогара" });
const SUMELA = named("Sumela Monastery", { ka: "სუმელას მონასტერი", ru: "Монастырь Сумела" });
const ULUDAQ = named("Uludağ", { ka: "ულუდაღი", ru: "Улудаг" });
const HIRKAN = named("Hirkan National Park", { ka: "ჰირკანის ეროვნული პარკი", ru: "Гирканский национальный парк" });
const ORDUBAD = named("Ordubad", { ka: "ორდუბადი", ru: "Ордубад" });
const YALIKAVAK = named("Yalıkavak", { ka: "იალიქავაქი", ru: "Ялыкавак" });
const FETHIYE = named("Fethiye & Ölüdeniz", { ka: "ფეთიე და ოლუდენიზი", ru: "Фетхие и Олюдениз" });
const MARMARIS = named("Marmaris", { ka: "მარმარისი", ru: "Мармарис" });
const SAPANCA = named("Lake Sapanca", { ka: "საფანჯის ტბა", ru: "Озеро Сапанджа" });
const BEYPAZARI = named("Beypazarı", { ka: "ბეიფაზარი", ru: "Бейпазары" });
const CAPE_GRECO = named("Cape Greco", { ka: "კეიპ გრეკო", ru: "Мыс Греко" });
const VARDZIA = named("Vardzia", { ka: "ვარძია", ru: "Вардзиа" });
const MARTVILI = named("Martvili Canyon", { ka: "მარტვილის კანიონი", ru: "Каньон Мартвили" });
const SEVAN = named("Lake Sevan", { ka: "სევანის ტბა", ru: "Озеро Севан" });
const KOURION = named("Kourion", { ka: "კურიონი", ru: "Курион" });
const GOBUSTAN = named("Gobustan", { ka: "გობუსტანი", ru: "Гобустан" });

export const EXTRA_AIRPORTS: Record<string, Spot[]> = {
  BUS: [{ name: GARDEN, km: "15", time: "25 min", tip: "sedan" }],
  LWN: [
    { name: "Gyumri", km: "8", time: "15 min", tip: "sedan" },
    { name: MARMASHEN, km: "15", time: "25 min", tip: "sedan" },
    { name: "Yerevan", km: "125", time: "2 h", tip: "highway" },
  ],
  GNJ: [
    { name: "Ganja", km: "12", time: "20 min", tip: "sedan" },
    { name: GOYGOL, km: "35", time: "45 min", tip: "sedan" },
    { name: "Baku", km: "370", time: "4.5 h", tip: "highway" },
  ],
  GBB: [
    { name: "Gabala", km: "15", time: "20 min", tip: "sedan" },
    { name: "Shaki", km: "70", time: "1.5 h", tip: "crossover" },
    { name: "Baku", km: "220", time: "3.5 h", tip: "either" },
  ],
  LLK: [
    { name: "Lankaran", km: "8", time: "15 min", tip: "sedan" },
    { name: HIRKAN, km: "20", time: "30 min", tip: "sedan" },
    { name: "Baku", km: "280", time: "4 h", tip: "highway" },
  ],
  NAJ: [
    { name: "Nakhchivan", km: "5", time: "10 min", tip: "sedan" },
    { name: ORDUBAD, km: "70", time: "1.5 h", tip: "sedan" },
  ],
  TGD: [
    { name: "Podgorica", km: "12", time: "20 min", tip: "sedan" },
    { name: LAKE_SKADAR, km: "20", time: "25 min", tip: "sedan" },
    { name: "Cetinje", km: "35", time: "40 min", tip: "sedan" },
    { name: OSTROG, km: "50", time: "1 h", tip: "mountain" },
    { name: "Budva", km: "65", time: "1 h", tip: "highway" },
    { name: "Kotor", km: "90", time: "1.5 h", tip: "highway" },
  ],
  TIV: [
    { name: "Tivat", km: "5", time: "10 min", tip: "sedan" },
    { name: "Kotor", km: "15", time: "25 min", tip: "sedan" },
    { name: PERAST, km: "25", time: "35 min", tip: "standard" },
    { name: "Budva", km: "25", time: "30 min", tip: "sedan" },
    { name: "Herceg Novi", km: "30", time: "40 min", tip: "sedan" },
  ],
  TIA: [
    { name: "Tirana", km: "17", time: "30 min", tip: "sedan" },
    { name: KRUJA, km: "35", time: "40 min", tip: "sedan" },
    { name: "Durrës", km: "40", time: "40 min", tip: "highway" },
  ],
  BJV: [
    { name: "Bodrum", km: "36", time: "45 min", tip: "sedan" },
    { name: YALIKAVAK, km: "20", time: "30 min", tip: "sedan" },
  ],
  DLM: [
    { name: "Dalaman", km: "6", time: "10 min", tip: "sedan" },
    { name: FETHIYE, km: "50", time: "1 h", tip: "highway" },
    { name: MARMARIS, km: "95", time: "1.5 h", tip: "highway" },
  ],
  TZX: [
    { name: "Trabzon", km: "6", time: "15 min", tip: "sedan" },
    { name: SUMELA, km: "50", time: "1 h", tip: "mountain" },
    { name: "Rize", km: "75", time: "1 h 15 min", tip: "highway" },
  ],

  AMS: [
    { name: "Amsterdam", km: "18", time: "25 min", tip: "sedan" },
    { name: "Haarlem", km: "20", time: "25 min", tip: "sedan" },
    { name: "Utrecht", km: "50", time: "40 min", tip: "highway" },
    { name: "The Hague", km: "55", time: "50 min", tip: "highway" },
    { name: "Rotterdam", km: "70", time: "55 min", tip: "highway" },
  ],
  ATH: [
    { name: "Athens", km: "35", time: "40 min", tip: "sedan" },
    { name: "Piraeus", km: "45", time: "50 min", tip: "sedan" },
    { name: "Cape Sounion", km: "70", time: "1 h", tip: "sedan" },
    { name: "Corinth", km: "100", time: "1.5 h", tip: "highway" },
    { name: "Nafplio", km: "160", time: "2 h", tip: "highway" },
  ],
  BCN: [
    { name: "Barcelona", km: "15", time: "25 min", tip: "sedan" },
    { name: "Sitges", km: "45", time: "40 min", tip: "highway" },
    { name: "Montserrat", km: "60", time: "1 h", tip: "sedan" },
    { name: "Girona", km: "100", time: "1 h 15 min", tip: "highway" },
    { name: "Tarragona", km: "110", time: "1.5 h", tip: "highway" },
  ],
  CDG: [
    { name: "Paris", km: "30", time: "45 min", tip: "sedan" },
    { name: "Disneyland Paris", km: "40", time: "40 min", tip: "highway" },
    { name: "Versailles", km: "55", time: "1 h", tip: "highway" },
    { name: "Reims", km: "145", time: "1.5 h", tip: "highway" },
  ],
  DXB: [
    { name: "Dubai", km: "15", time: "25 min", tip: "sedan" },
    { name: "Palm Jumeirah", km: "30", time: "35 min", tip: "sedan" },
    { name: "Abu Dhabi", km: "140", time: "1.5 h", tip: "highway" },
    { name: "Sharjah", km: "25", time: "35 min", tip: "sedan" },
  ],
  FRA: [
    { name: "Frankfurt", km: "12", time: "20 min", tip: "sedan" },
    { name: "Mainz", km: "35", time: "35 min", tip: "highway" },
    { name: "Heidelberg", km: "90", time: "1 h", tip: "highway" },
    { name: "Cologne", km: "190", time: "2 h", tip: "highway" },
  ],
  KBP: [
    { name: "Kyiv", km: "35", time: "45 min", tip: "sedan" },
    { name: "Boryspil", km: "8", time: "15 min", tip: "sedan" },
    { name: "Chernihiv", km: "160", time: "2.5 h", tip: "highway" },
    { name: "Zhytomyr", km: "170", time: "2.5 h", tip: "highway" },
  ],
  LHR: [
    { name: "Central London", km: "25", time: "50 min", tip: "sedan" },
    { name: "Windsor", km: "20", time: "30 min", tip: "sedan" },
    { name: "Oxford", km: "70", time: "1 h 15 min", tip: "highway" },
    { name: "Brighton", km: "100", time: "1.5 h", tip: "highway" },
  ],
  MXP: [
    { name: "Milan", km: "50", time: "50 min", tip: "highway" },
    { name: "Como", km: "45", time: "45 min", tip: "sedan" },
    { name: "Bergamo", km: "60", time: "50 min", tip: "highway" },
    { name: "Turin", km: "150", time: "1.5 h", tip: "highway" },
  ],
  OTP: [
    { name: "Bucharest", km: "18", time: "30 min", tip: "sedan" },
    { name: "Sinaia", km: "130", time: "2 h", tip: "highway" },
    { name: "Brașov", km: "170", time: "2.5 h", tip: "highway" },
    { name: "Constanța", km: "230", time: "3 h", tip: "highway" },
  ],
  PRG: [
    { name: "Prague", km: "15", time: "30 min", tip: "sedan" },
    { name: "Karlštejn", km: "35", time: "40 min", tip: "sedan" },
    { name: "Kutná Hora", km: "80", time: "1 h", tip: "highway" },
    { name: "Český Krumlov", km: "170", time: "2.5 h", tip: "highway" },
  ],
  SOF: [
    { name: "Sofia", km: "10", time: "20 min", tip: "sedan" },
    { name: "Rila Monastery", km: "120", time: "2 h", tip: "crossover" },
    { name: "Plovdiv", km: "150", time: "1.5 h", tip: "highway" },
    { name: "Bansko", km: "160", time: "2.5 h", tip: "mountain" },
  ],
  TLV: [
    { name: "Tel Aviv", km: "20", time: "30 min", tip: "sedan" },
    { name: "Jaffa", km: "25", time: "35 min", tip: "sedan" },
    { name: "Jerusalem", km: "60", time: "1 h", tip: "highway" },
    { name: "Haifa", km: "100", time: "1.5 h", tip: "highway" },
  ],
  WAW: [
    { name: "Warsaw", km: "15", time: "30 min", tip: "sedan" },
    { name: "Łódź", km: "130", time: "1.5 h", tip: "highway" },
    { name: "Kraków", km: "300", time: "3.5 h", tip: "highway" },
    { name: "Gdańsk", km: "350", time: "4 h", tip: "highway" },
  ],
};

export const EXTRA_CITIES: Record<string, Spot[]> = {
  Batumi: [
    { name: GARDEN, km: "9", time: "20 min", tip: "sedan" },
    { name: MAKHUNTSETI, km: "28", time: "40 min", tip: "sedan" },
  ],
  Mtskheta: [{ name: JVARI, km: "5", time: "10 min", tip: "standard" }],
  Gori: [{ name: ATENI, km: "12", time: "20 min", tip: "standard" }],
  Borjomi: [{ name: VARDZIA, km: "110", time: "2 h 15 min", tip: "crossover" }],
  Telavi: [
    { name: NEKRESI, km: "20", time: "30 min", tip: "crossover" },
    { name: GREMI, km: "20", time: "25 min", tip: "sedan" },
  ],
  Zugdidi: [{ name: ANAKLIA, km: "30", time: "35 min", tip: "sedan" }],
  Poti: [
    { name: ANAKLIA, km: "25", time: "30 min", tip: "sedan" },
    { name: MARTVILI, km: "70", time: "1.5 h", tip: "crossover" },
  ],
  Kobuleti: [
    { name: SHEKVETILI, km: "12", time: "20 min", tip: "sedan" },
    { name: UREKI, km: "20", time: "25 min", tip: "sedan" },
  ],
  Rustavi: [{ name: GAREJA, km: "70", time: "1 h 20 min", tip: "crossover" }],
  Akhaltsikhe: [{ name: SAPARA, km: "12", time: "20 min", tip: "sedan" }],
  Ozurgeti: [
    { name: SHEKVETILI, km: "25", time: "30 min", tip: "sedan" },
    { name: BAKHMARO, km: "50", time: "1.5 h", tip: "mountain" },
  ],
  Senaki: [{ name: NOKALAKEVI, km: "15", time: "20 min", tip: "sedan" }],
  Khashuri: [{ name: SURAMI, km: "10", time: "15 min", tip: "sedan" }],
  Marneuli: [{ name: DMANISI, km: "35", time: "45 min", tip: "sedan" }],
  Gyumri: [{ name: MARMASHEN, km: "10", time: "15 min", tip: "sedan" }],
  Ganja: [{ name: GOYGOL, km: "30", time: "40 min", tip: "sedan" }],
  Paphos: [{ name: KOURION, km: "20", time: "25 min", tip: "sedan" }],
  Istanbul: [{ name: SAPANCA, km: "150", time: "2 h", tip: "highway" }],
  Ankara: [{ name: BEYPAZARI, km: "100", time: "1.5 h", tip: "sedan" }],
  Protaras: [{ name: CAPE_GRECO, km: "8", time: "15 min", tip: "sedan" }],
  Vanadzor: [
    { name: "Dilijan", km: "40", time: "45 min", tip: "crossover" },
    { name: "Yerevan", km: "120", time: "2 h", tip: "highway" },
  ],
  Vagharshapat: [
    { name: "Yerevan", km: "20", time: "30 min", tip: "sedan" },
    { name: "Zvartnots", km: "8", time: "15 min", tip: "sedan" },
  ],
  Hrazdan: [
    { name: "Tsaghkadzor", km: "10", time: "15 min", tip: "sedan" },
    { name: SEVAN, km: "40", time: "40 min", tip: "sedan" },
    { name: "Yerevan", km: "50", time: "50 min", tip: "highway" },
  ],
  Kapan: [
    { name: "Goris", km: "65", time: "1 h 20 min", tip: "crossover" },
    { name: TATEV, km: "75", time: "1.5 h", tip: "mountain" },
  ],
  Armavir: [
    { name: "Vagharshapat", km: "15", time: "20 min", tip: "sedan" },
    { name: "Yerevan", km: "40", time: "40 min", tip: "highway" },
  ],
  Sumqayit: [
    { name: "Baku", km: "35", time: "40 min", tip: "sedan" },
    { name: GOBUSTAN, km: "80", time: "1.5 h", tip: "sedan" },
  ],
  Lankaran: [
    { name: HIRKAN, km: "15", time: "25 min", tip: "sedan" },
    { name: "Baku", km: "280", time: "4 h", tip: "highway" },
  ],
  Nakhchivan: [
    { name: ORDUBAD, km: "70", time: "1.5 h", tip: "sedan" },
    { name: "Julfa", km: "35", time: "40 min", tip: "sedan" },
  ],
  Shaki: [
    { name: "Kish", km: "5", time: "10 min", tip: "sedan" },
    { name: "Gabala", km: "80", time: "1.5 h", tip: "crossover" },
    { name: "Baku", km: "310", time: "4.5 h", tip: "highway" },
  ],
  Bodrum: [
    { name: YALIKAVAK, km: "18", time: "25 min", tip: "sedan" },
    { name: "Milas", km: "50", time: "1 h", tip: "highway" },
  ],
  Alanya: [
    { name: "Side", km: "70", time: "1 h", tip: "highway" },
    { name: "Antalya", km: "135", time: "1.5 h", tip: "highway" },
  ],
  Bursa: [
    { name: ULUDAQ, km: "35", time: "50 min", tip: "mountain" },
    { name: "Istanbul", km: "155", time: "2 h", tip: "highway" },
  ],
  Trabzon: [
    { name: SUMELA, km: "48", time: "1 h", tip: "mountain" },
    { name: "Rize", km: "75", time: "1 h 15 min", tip: "highway" },
  ],
  Podgorica: [
    { name: LAKE_SKADAR, km: "25", time: "30 min", tip: "sedan" },
    { name: "Cetinje", km: "30", time: "40 min", tip: "sedan" },
    { name: OSTROG, km: "45", time: "50 min", tip: "mountain" },
    { name: "Budva", km: "65", time: "1 h", tip: "highway" },
  ],
  Budva: [
    { name: SVETI, km: "8", time: "15 min", tip: "sedan" },
    { name: "Kotor", km: "25", time: "40 min", tip: "sedan" },
    { name: "Cetinje", km: "30", time: "40 min", tip: "sedan" },
  ],
  Kotor: [
    { name: PERAST, km: "15", time: "25 min", tip: "standard" },
    { name: "Tivat", km: "15", time: "25 min", tip: "sedan" },
    { name: LOVCEN, km: "25", time: "45 min", tip: "mountain" },
    { name: "Budva", km: "25", time: "40 min", tip: "sedan" },
  ],
  Tivat: [
    { name: "Kotor", km: "15", time: "25 min", tip: "sedan" },
    { name: "Budva", km: "25", time: "30 min", tip: "sedan" },
    { name: "Herceg Novi", km: "25", time: "35 min", tip: "sedan" },
  ],
  Cetinje: [
    { name: LOVCEN, km: "20", time: "30 min", tip: "mountain" },
    { name: "Budva", km: "30", time: "40 min", tip: "sedan" },
    { name: "Podgorica", km: "30", time: "40 min", tip: "sedan" },
  ],
  "Herceg Novi": [
    { name: "Kotor", km: "40", time: "50 min", tip: "sedan" },
    { name: "Tivat", km: "30", time: "40 min", tip: "sedan" },
  ],
  Bar: [
    { name: "Ulcinj", km: "30", time: "35 min", tip: "sedan" },
    { name: "Budva", km: "40", time: "45 min", tip: "highway" },
    { name: "Stari Bar", km: "5", time: "10 min", tip: "standard" },
  ],
  Ulcinj: [
    { name: "Bar", km: "30", time: "35 min", tip: "sedan" },
    { name: "Ada Bojana", km: "15", time: "20 min", tip: "sedan" },
  ],
  "Sveti Stefan": [
    { name: "Budva", km: "8", time: "15 min", tip: "sedan" },
    { name: "Kotor", km: "30", time: "45 min", tip: "sedan" },
  ],
  Žabljak: [
    { name: DURMITOR, km: "5", time: "10 min", tip: "sedan" },
    { name: "Podgorica", km: "130", time: "2.5 h", tip: "mountain" },
  ],
  Tirana: [
    { name: KRUJA, km: "30", time: "40 min", tip: "sedan" },
    { name: "Durrës", km: "35", time: "40 min", tip: "highway" },
    { name: BERAT, km: "120", time: "2 h", tip: "highway" },
    { name: "Shkodër", km: "100", time: "1.5 h", tip: "highway" },
  ],
  Durrës: [
    { name: "Tirana", km: "35", time: "40 min", tip: "highway" },
    { name: KRUJA, km: "45", time: "50 min", tip: "sedan" },
  ],
  Vlorë: [
    { name: LLOGARA, km: "50", time: "1 h 15 min", tip: "mountain" },
    { name: "Tirana", km: "160", time: "2.5 h", tip: "highway" },
  ],
  Shkodër: [
    { name: "Lake Shkodra", km: "10", time: "15 min", tip: "sedan" },
    { name: "Tirana", km: "100", time: "1.5 h", tip: "highway" },
  ],
};
