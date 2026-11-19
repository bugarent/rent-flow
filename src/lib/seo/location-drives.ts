import type { Locale } from "@/lib/i18n/config";
import { cityDisplayName } from "@/lib/i18n/place-label";

export type DriveLine = {
  title: string;
  distance: string;
  tip: string;
  also?: string;
};

type Tip = "sedan" | "standard" | "crossover" | "highway" | "mountain" | "either";
type Name = { en: string } & Partial<Record<Locale, string>>;
type Spot = { name: string | Name; km: string; time: string; tip: Tip; also?: { name: string | Name; km: string; time: string } };

const TIPS: Record<Locale, Record<Tip, string>> = {
  en: {
    sedan: "A sedan or crossover works well.",
    standard: "Any standard car works well.",
    crossover: "A reliable car or crossover is enough.",
    highway: "A sedan or hybrid is ideal.",
    mountain: "A 4x4 or AWD SUV is strongly recommended, especially outside peak summer.",
    either: "A sedan, hybrid, or SUV all work well.",
  },
  ka: {
    sedan: "სედანი ან კროსოვერი კარგად გამოდგება.",
    standard: "ჩვეულებრივი მანქანა საკმარისია.",
    crossover: "საიმედო მანქანა ან კროსოვერი საკმარისია.",
    highway: "სედანი ან ჰიბრიდი საუკეთესო არჩევანია.",
    mountain: "4x4 ან სრულამძრავიანი ჯიპი მკაცრად რეკომენდებულია, განსაკუთრებით ზაფხულის სეზონის გარეთ.",
    either: "სედანიც, ჰიბრიდიც და ჯიპიც კარგად გამოდგება.",
  },
  ru: {
    sedan: "Подойдут седан или кроссовер.",
    standard: "Подойдёт обычный автомобиль.",
    crossover: "Достаточно надёжной машины или кроссовера.",
    highway: "Идеальны седан или гибрид.",
    mountain: "Полноприводный внедорожник особенно нужен вне пика лета.",
    either: "Подойдут седан, гибрид и внедорожник.",
  },
  de: {
    sedan: "Limousine oder Crossover passen.",
    standard: "Ein normales Auto reicht.",
    crossover: "Ein zuverlässiges Auto oder ein Crossover reicht.",
    highway: "Limousine oder Hybrid sind ideal.",
    mountain: "Ein 4x4-SUV ist besonders außerhalb des Hochsommers zu empfehlen.",
    either: "Limousine, Hybrid oder SUV passen alle.",
  },
  es: {
    sedan: "Un sedán o un crossover va bien.",
    standard: "Cualquier coche normal va bien.",
    crossover: "Basta un coche fiable o un crossover.",
    highway: "Un sedán o un híbrido es lo ideal.",
    mountain: "Un SUV 4x4 es muy recomendable, sobre todo fuera del verano.",
    either: "Sirven un sedán, un híbrido o un SUV.",
  },
  fr: {
    sedan: "Une berline ou un crossover convient.",
    standard: "Une voiture standard convient.",
    crossover: "Une voiture fiable ou un crossover suffit.",
    highway: "Une berline ou une hybride est idéale.",
    mountain: "Un SUV 4x4 est fortement conseillé, surtout hors été.",
    either: "Berline, hybride ou SUV conviennent.",
  },
  it: {
    sedan: "Vanno bene berlina o crossover.",
    standard: "Va bene un’auto normale.",
    crossover: "Bastano un’auto affidabile o un crossover.",
    highway: "Berlina o ibrida sono l’ideale.",
    mountain: "Un SUV 4x4 è consigliato, soprattutto fuori estate.",
    either: "Vanno bene berlina, ibrida o SUV.",
  },
  nl: {
    sedan: "Een sedan of crossover volstaat.",
    standard: "Een gewone auto volstaat.",
    crossover: "Een betrouwbare auto of crossover is genoeg.",
    highway: "Een sedan of hybride is ideaal.",
    mountain: "Een 4x4 SUV is sterk aan te raden, vooral buiten de zomer.",
    either: "Sedan, hybride of SUV kan allebei.",
  },
  pl: {
    sedan: "Sedan albo crossover wystarczy.",
    standard: "Zwykłe auto wystarczy.",
    crossover: "Wystarczy pewne auto albo crossover.",
    highway: "Sedan albo hybryda są najlepsze.",
    mountain: "SUV 4x4 jest mocno zalecany, zwłaszcza poza latem.",
    either: "Sedan, hybryda i SUV pasują.",
  },
  tr: {
    sedan: "Sedan veya crossover yeter.",
    standard: "Standart bir araç yeter.",
    crossover: "Güvenilir bir araç veya crossover yeter.",
    highway: "Sedan veya hibrit idealdir.",
    mountain: "Özellikle yaz dışında 4x4 SUV önerilir.",
    either: "Sedan, hibrit ve SUV uygundur.",
  },
  ar: {
    sedan: "تناسب السيدان أو الكروس أوفر.",
    standard: "أي سيارة عادية تناسب.",
    crossover: "تكفي سيارة موثوقة أو كروس أوفر.",
    highway: "السيدان أو الهجين هو الأنسب.",
    mountain: "SUV دفع رباعي موصى به بشدة، خصوصًا خارج الصيف.",
    either: "تناسب السيدان والهجين والـ SUV.",
  },
  zh: {
    sedan: "轿车或跨界车即可。",
    standard: "普通车即可。",
    crossover: "可靠的车或跨界车即可。",
    highway: "轿车或混动最合适。",
    mountain: "尤其在夏季以外，强烈建议四驱 SUV。",
    either: "轿车、混动或 SUV 都可以。",
  },
  ko: {
    sedan: "세단이나 크로스오버가 알맞습니다.",
    standard: "일반 차량이면 됩니다.",
    crossover: "믿을 수 있는 차나 크로스오버면 됩니다.",
    highway: "세단이나 하이브리드가 알맞습니다.",
    mountain: "여름 성수기 밖에는 4x4 SUV를 권합니다.",
    either: "세단, 하이브리드, SUV 모두 가능합니다.",
  },
  th: {
    sedan: "ซีดานหรือครอสโอเวอร์ใช้ได้ดี",
    standard: "รถทั่วไปใช้ได้",
    crossover: "รถที่เชื่อถือได้หรือครอสโอเวอร์เพียงพอ",
    highway: "ซีดานหรือไฮบริดเหมาะที่สุด",
    mountain: "แนะนำ SUV ขับเคลื่อนสี่ล้อ โดยเฉพาะนอกฤดูร้อน",
    either: "ซีดาน ไฮบริด หรือ SUV ใช้ได้ทั้งหมด",
  },
};

const DISTANCE: Record<Locale, (km: string, time: string) => string> = {
  en: (km, time) => `About ${km} km, about ${time}.`,
  ka: (km, time) => `დაახლოებით ${km} კმ, დაახლოებით ${time}.`,
  ru: (km, time) => `Около ${km} км, около ${time}.`,
  de: (km, time) => `Etwa ${km} km, etwa ${time}.`,
  es: (km, time) => `Unos ${km} km, unos ${time}.`,
  fr: (km, time) => `Environ ${km} km, environ ${time}.`,
  it: (km, time) => `Circa ${km} km, circa ${time}.`,
  nl: (km, time) => `Ongeveer ${km} km, ongeveer ${time}.`,
  pl: (km, time) => `Około ${km} km, około ${time}.`,
  tr: (km, time) => `Yaklaşık ${km} km, yaklaşık ${time}.`,
  ar: (km, time) => `حوالي ${km} كم، حوالي ${time}.`,
  zh: (km, time) => `约 ${km} 公里，约 ${time}。`,
  ko: (km, time) => `약 ${km} km, 약 ${time}.`,
  th: (km, time) => `ประมาณ ${km} กม. ประมาณ ${time}`,
};

const ALSO: Record<Locale, (place: string, km: string, time: string) => string> = {
  en: (place, km, time) => `${place} is about ${km} km, about ${time}.`,
  ka: (place, km, time) => `${place} — დაახლოებით ${km} კმ, დაახლოებით ${time}.`,
  ru: (place, km, time) => `${place} — около ${km} км, около ${time}.`,
  de: (place, km, time) => `${place}: etwa ${km} km, etwa ${time}.`,
  es: (place, km, time) => `${place}: unos ${km} km, unos ${time}.`,
  fr: (place, km, time) => `${place} : environ ${km} km, environ ${time}.`,
  it: (place, km, time) => `${place}: circa ${km} km, circa ${time}.`,
  nl: (place, km, time) => `${place}: ongeveer ${km} km, ongeveer ${time}.`,
  pl: (place, km, time) => `${place}: około ${km} km, około ${time}.`,
  tr: (place, km, time) => `${place}: yaklaşık ${km} km, yaklaşık ${time}.`,
  ar: (place, km, time) => `${place}: حوالي ${km} كم، حوالي ${time}.`,
  zh: (place, km, time) => `${place}：约 ${km} 公里，约 ${time}。`,
  ko: (place, km, time) => `${place}: 약 ${km} km, 약 ${time}.`,
  th: (place, km, time) => `${place}: ประมาณ ${km} กม. ประมาณ ${time}`,
};

function named(en: string, extra: Partial<Record<Locale, string>>): Name {
  return { en, ...extra };
}

const PROMETHEUS = named("Prometheus Cave & Sataplia", {
  ka: "პრომეთეს მღვიმე და სათაფლია",
  ru: "Пещера Прометея и Сатаплиа",
  de: "Prometheus-Höhle und Sataplia",
  fr: "Grotte de Prométhée et Sataplia",
  es: "Cueva de Prometeo y Sataplia",
  it: "Grotta di Prometeo e Sataplia",
  pl: "Jaskinia Prometeusza i Sataplia",
  tr: "Prometheus Mağarası ve Sataplia",
  nl: "Prometheusgrot en Sataplia",
});
const GELATI = named("Gelati Monastery & Bagrati Cathedral", {
  ka: "გელათის მონასტერი და ბაგრატის ტაძარი",
  ru: "Гелатский монастырь и храм Баграта",
  de: "Kloster Gelati und Bagrati-Kathedrale",
  fr: "Monastère de Ghélati et cathédrale de Bagrati",
  es: "Monasterio de Gelati y catedral de Bagrati",
  it: "Monastero di Gelati e cattedrale di Bagrati",
  pl: "Monastyr Gelati i katedra Bagrati",
  tr: "Gelati Manastırı ve Bagrati Katedrali",
  nl: "Klooster Gelati en kathedraal Bagrati",
});
const CANYONS = named("Martvili & Okatse Canyons", {
  ka: "მარტვილის და ოკაცეს კანიონები",
  ru: "Каньоны Мартвили и Окаце",
  de: "Schluchten von Martwili und Okaze",
  fr: "Canyons de Martvili et d’Okatse",
  es: "Cañones de Martvili y Okatse",
  it: "Canyon di Martvili e Okatse",
  pl: "Kaniony Martwili i Okace",
  tr: "Martvili ve Okatse Kanyonları",
  nl: "Canyons van Martvili en Okatse",
});
const COAST = named("Batumi & Black Sea Coast", {
  ka: "ბათუმი და შავი ზღვის სანაპირო",
  ru: "Батуми и побережье Чёрного моря",
  de: "Batumi und die Schwarzmeerküste",
  fr: "Batoumi et la côte de la mer Noire",
  es: "Batumi y la costa del mar Negro",
  it: "Batumi e la costa del Mar Nero",
  pl: "Batumi i wybrzeże Morza Czarnego",
  tr: "Batumi ve Karadeniz kıyısı",
  nl: "Batumi en de Zwarte Zeekust",
});
const KOBULETI = named("Kobuleti", { ka: "ქობულეთი", ru: "Кобулети" });
const MESTIA = named("Mestia & Upper Svaneti", {
  ka: "მესტია და ზემო სვანეთი",
  ru: "Местиа и Верхняя Сванетия",
  de: "Mestia und Oberswanetien",
  fr: "Mestia et la Haute Svanétie",
  es: "Mestia y la Alta Esvanetia",
  it: "Mestia e l’Alta Svanezia",
  pl: "Mestia i Górna Swanetia",
  tr: "Mestia ve Yukarı Svaneti",
  nl: "Mestia en Opper-Svanetië",
});
const KUTAISI_CENTRE = named("Kutaisi centre", { ka: "ქუთაისის ცენტრი", ru: "Центр Кутаиси", de: "Zentrum von Kutaissi", fr: "Centre de Koutaïssi" });
const UPLISTSIKHE = named("Uplistsikhe", { ka: "უფლისციხე", ru: "Уплисцихе" });
const VARDZIA = named("Vardzia", { ka: "ვარძია", ru: "Вардзиа" });
const BAKURIANI = named("Bakuriani", { ka: "ბაკურიანი", ru: "Бакуриани" });
const SIGHNAGHI = named("Sighnaghi", { ka: "სიღნაღი", ru: "Сигнахи" });
const KAZBEGI = named("Kazbegi", { ka: "ყაზბეგი", ru: "Казбеги" });
const TSINANDALI = named("Tsinandali", { ka: "წინანდალი", ru: "Цинандали" });
const GARNI = named("Garni & Geghard", { ka: "გარნი და გეღარდი", ru: "Гарни и Гегард" });
const SEVAN = named("Lake Sevan", { ka: "სევანის ტბა", ru: "Озеро Севан" });
const GOBUSTAN = named("Gobustan", { ka: "გობუსტანი", ru: "Гобустан" });
const SIDE = named("Side", { ka: "სიდე", ru: "Сиде" });
const ALANYA = named("Alanya", { ka: "ალანია", ru: "Аланья" });
const EPHESUS = named("Ephesus", { ka: "ეფესო", ru: "Эфес" });
const CAPPADOCIA = named("Cappadocia", { ka: "კაპადოკია", ru: "Каппадокия" });
const BURSA = named("Bursa", { ka: "ბურსა", ru: "Бурса" });
const TROODOS = named("Troodos", { ka: "ტროოდოსი", ru: "Троодос" });
const KOURION = named("Kourion", { ka: "კურიონი", ru: "Курион" });
const AYIA = named("Ayia Napa", { ka: "აია ნაპა", ru: "Айя-Напа" });
const PROTARAS = named("Protaras", { ka: "პროტარასი", ru: "Протарас" });

const AIRPORTS: Record<string, Spot[]> = {
  KUT: [
    { name: KUTAISI_CENTRE, km: "18", time: "25 min", tip: "sedan" },
    { name: PROMETHEUS, km: "25–30", time: "30–35 min", tip: "sedan" },
    { name: GELATI, km: "25–30", time: "30–40 min", tip: "standard" },
    { name: CANYONS, km: "45–55", time: "45–60 min", tip: "crossover" },
    { name: COAST, km: "120", time: "2 h", tip: "highway", also: { name: KOBULETI, km: "100", time: "1 h 40 min" } },
    { name: MESTIA, km: "215", time: "4–4.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "230", time: "3.5 h", tip: "either" },
  ],
  TBS: [
    { name: "Tbilisi", km: "18", time: "30 min", tip: "sedan" },
    { name: "Mtskheta", km: "30", time: "40 min", tip: "sedan" },
    { name: KAZBEGI, km: "155", time: "3 h", tip: "mountain" },
    { name: SIGHNAGHI, km: "120", time: "2 h", tip: "sedan" },
    { name: "Borjomi", km: "170", time: "2.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "240", time: "3.5 h", tip: "either" },
    { name: "Batumi", km: "380", time: "6 h", tip: "highway" },
  ],
  BUS: [
    { name: "Batumi", km: "5", time: "15 min", tip: "sedan" },
    { name: KOBULETI, km: "30", time: "35 min", tip: "sedan" },
    { name: "Kutaisi", km: "120", time: "2 h", tip: "highway" },
    { name: MESTIA, km: "270", time: "6.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "370", time: "6 h", tip: "either" },
  ],
  EVN: [
    { name: "Yerevan", km: "12", time: "25 min", tip: "sedan" },
    { name: GARNI, km: "40", time: "50 min", tip: "sedan" },
    { name: SEVAN, km: "80", time: "1.5 h", tip: "sedan" },
    { name: "Dilijan", km: "110", time: "1.5 h", tip: "crossover" },
    { name: "Gyumri", km: "130", time: "2 h", tip: "highway" },
  ],
  GYD: [
    { name: "Baku", km: "25", time: "40 min", tip: "sedan" },
    { name: GOBUSTAN, km: "70", time: "1.5 h", tip: "sedan" },
    { name: "Gabala", km: "230", time: "3.5 h", tip: "either" },
    { name: "Ganja", km: "370", time: "4.5 h", tip: "highway" },
  ],
  LCA: [
    { name: "Larnaca", km: "8", time: "15 min", tip: "sedan" },
    { name: AYIA, km: "45", time: "40 min", tip: "sedan" },
    { name: PROTARAS, km: "55", time: "50 min", tip: "sedan" },
    { name: "Nicosia", km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Paphos", km: "140", time: "1.5 h", tip: "highway" },
  ],
  PFO: [
    { name: "Paphos", km: "15", time: "20 min", tip: "sedan" },
    { name: KOURION, km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Larnaca", km: "140", time: "1.5 h", tip: "highway" },
    { name: AYIA, km: "170", time: "2 h", tip: "highway" },
  ],
  IST: [
    { name: "Istanbul", km: "40", time: "50 min", tip: "sedan" },
    { name: BURSA, km: "150", time: "2 h", tip: "highway" },
  ],
  SAW: [
    { name: "Istanbul", km: "45", time: "1 h", tip: "sedan" },
    { name: BURSA, km: "120", time: "1.5 h", tip: "highway" },
  ],
  AYT: [
    { name: "Antalya", km: "15", time: "25 min", tip: "sedan" },
    { name: SIDE, km: "75", time: "1 h", tip: "highway" },
    { name: ALANYA, km: "135", time: "1.5 h", tip: "highway" },
  ],
  ADB: [
    { name: "Izmir", km: "18", time: "25 min", tip: "sedan" },
    { name: EPHESUS, km: "55", time: "50 min", tip: "sedan" },
    { name: "Cesme", km: "85", time: "1 h", tip: "highway" },
  ],
  ESB: [
    { name: "Ankara", km: "30", time: "35 min", tip: "sedan" },
    { name: CAPPADOCIA, km: "280", time: "3.5 h", tip: "highway" },
  ],
};

const CITY_DRIVES: Record<string, Spot[]> = {
  Kutaisi: [
    { name: PROMETHEUS, km: "20", time: "25 min", tip: "sedan" },
    { name: GELATI, km: "12", time: "20 min", tip: "standard" },
    { name: CANYONS, km: "45", time: "50 min", tip: "crossover" },
    { name: COAST, km: "140", time: "2.5 h", tip: "highway" },
    { name: MESTIA, km: "220", time: "4.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "220", time: "3.5 h", tip: "either" },
  ],
  Tbilisi: [
    { name: "Mtskheta", km: "25", time: "30 min", tip: "sedan" },
    { name: "Rustavi", km: "25", time: "30 min", tip: "sedan" },
    { name: UPLISTSIKHE, km: "80", time: "1 h", tip: "sedan" },
    { name: KAZBEGI, km: "150", time: "2.5 h", tip: "mountain" },
    { name: SIGHNAGHI, km: "110", time: "2 h", tip: "sedan" },
    { name: "Borjomi", km: "160", time: "2.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "220", time: "3.5 h", tip: "either" },
    { name: "Batumi", km: "370", time: "6 h", tip: "highway" },
  ],
  Batumi: [
    { name: KOBULETI, km: "25", time: "30 min", tip: "sedan" },
    { name: "Kutaisi", km: "140", time: "2.5 h", tip: "highway" },
    { name: MESTIA, km: "260", time: "6.5 h", tip: "mountain" },
    { name: "Tbilisi", km: "370", time: "6 h", tip: "either" },
  ],
  Mtskheta: [
    { name: "Tbilisi", km: "25", time: "30 min", tip: "sedan" },
    { name: KAZBEGI, km: "130", time: "2 h", tip: "mountain" },
    { name: "Gori", km: "70", time: "1 h", tip: "sedan" },
  ],
  Gori: [
    { name: UPLISTSIKHE, km: "15", time: "20 min", tip: "sedan" },
    { name: "Tbilisi", km: "80", time: "1 h", tip: "sedan" },
    { name: "Kutaisi", km: "150", time: "2.5 h", tip: "either" },
  ],
  Borjomi: [
    { name: BAKURIANI, km: "30", time: "40 min", tip: "mountain" },
    { name: "Akhaltsikhe", km: "50", time: "1 h", tip: "sedan" },
    { name: "Tbilisi", km: "160", time: "2.5 h", tip: "sedan" },
  ],
  Telavi: [
    { name: TSINANDALI, km: "10", time: "15 min", tip: "sedan" },
    { name: SIGHNAGHI, km: "40", time: "45 min", tip: "sedan" },
    { name: "Tbilisi", km: "100", time: "1.5 h", tip: "sedan" },
  ],
  Zugdidi: [
    { name: CANYONS, km: "40", time: "45 min", tip: "crossover" },
    { name: MESTIA, km: "140", time: "3.5 h", tip: "mountain" },
    { name: "Kutaisi", km: "100", time: "1.5 h", tip: "sedan" },
  ],
  Poti: [
    { name: "Batumi", km: "70", time: "1.5 h", tip: "sedan" },
    { name: "Kutaisi", km: "90", time: "1.5 h", tip: "sedan" },
  ],
  Kobuleti: [
    { name: "Batumi", km: "25", time: "30 min", tip: "sedan" },
    { name: "Kutaisi", km: "110", time: "2 h", tip: "highway" },
  ],
  Rustavi: [
    { name: "Tbilisi", km: "25", time: "30 min", tip: "sedan" },
    { name: "Mtskheta", km: "45", time: "50 min", tip: "sedan" },
  ],
  Akhaltsikhe: [
    { name: VARDZIA, km: "60", time: "1 h 15 min", tip: "crossover" },
    { name: "Borjomi", km: "50", time: "1 h", tip: "sedan" },
    { name: "Tbilisi", km: "200", time: "3.5 h", tip: "sedan" },
  ],
  Ozurgeti: [
    { name: "Batumi", km: "45", time: "50 min", tip: "sedan" },
    { name: "Kutaisi", km: "90", time: "1.5 h", tip: "sedan" },
  ],
  Senaki: [
    { name: CANYONS, km: "25", time: "30 min", tip: "crossover" },
    { name: "Kutaisi", km: "45", time: "40 min", tip: "sedan" },
  ],
  Khashuri: [
    { name: "Borjomi", km: "30", time: "30 min", tip: "sedan" },
    { name: "Gori", km: "45", time: "40 min", tip: "sedan" },
    { name: "Tbilisi", km: "120", time: "1.5 h", tip: "sedan" },
  ],
  Marneuli: [
    { name: "Tbilisi", km: "30", time: "40 min", tip: "sedan" },
    { name: "Mtskheta", km: "55", time: "1 h", tip: "sedan" },
  ],
  Yerevan: [
    { name: GARNI, km: "30", time: "40 min", tip: "sedan" },
    { name: SEVAN, km: "70", time: "1 h", tip: "sedan" },
    { name: "Dilijan", km: "100", time: "1.5 h", tip: "crossover" },
    { name: "Gyumri", km: "125", time: "1.5 h", tip: "highway" },
  ],
  Gyumri: [
    { name: "Yerevan", km: "125", time: "1.5 h", tip: "highway" },
  ],
  Baku: [
    { name: GOBUSTAN, km: "65", time: "1 h", tip: "sedan" },
    { name: "Gabala", km: "220", time: "3.5 h", tip: "either" },
    { name: "Ganja", km: "360", time: "4.5 h", tip: "highway" },
  ],
  Gabala: [
    { name: "Baku", km: "220", time: "3.5 h", tip: "either" },
    { name: "Sheki", km: "80", time: "1.5 h", tip: "crossover" },
  ],
  Ganja: [
    { name: "Baku", km: "360", time: "4.5 h", tip: "highway" },
  ],
  Larnaca: [
    { name: AYIA, km: "45", time: "40 min", tip: "sedan" },
    { name: PROTARAS, km: "50", time: "45 min", tip: "sedan" },
    { name: "Nicosia", km: "50", time: "45 min", tip: "sedan" },
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
  ],
  "Ayia Napa": [
    { name: PROTARAS, km: "15", time: "20 min", tip: "sedan" },
    { name: "Larnaca", km: "45", time: "40 min", tip: "sedan" },
    { name: "Limassol", km: "100", time: "1.5 h", tip: "highway" },
  ],
  Protaras: [
    { name: AYIA, km: "15", time: "20 min", tip: "sedan" },
    { name: "Larnaca", km: "50", time: "50 min", tip: "sedan" },
  ],
  Limassol: [
    { name: KOURION, km: "15", time: "20 min", tip: "sedan" },
    { name: TROODOS, km: "50", time: "1 h", tip: "mountain" },
    { name: "Larnaca", km: "70", time: "50 min", tip: "highway" },
    { name: "Paphos", km: "70", time: "50 min", tip: "highway" },
    { name: AYIA, km: "100", time: "1.5 h", tip: "highway" },
  ],
  Paphos: [
    { name: "Limassol", km: "70", time: "50 min", tip: "highway" },
    { name: "Larnaca", km: "140", time: "1.5 h", tip: "highway" },
    { name: AYIA, km: "170", time: "2 h", tip: "highway" },
  ],
  Nicosia: [
    { name: "Larnaca", km: "50", time: "45 min", tip: "sedan" },
    { name: TROODOS, km: "70", time: "1.5 h", tip: "mountain" },
    { name: "Limassol", km: "80", time: "1 h", tip: "highway" },
  ],
  Istanbul: [
    { name: BURSA, km: "150", time: "2 h", tip: "highway" },
  ],
  Antalya: [
    { name: SIDE, km: "70", time: "1 h", tip: "highway" },
    { name: ALANYA, km: "130", time: "1.5 h", tip: "highway" },
  ],
  Izmir: [
    { name: EPHESUS, km: "80", time: "1 h", tip: "sedan" },
    { name: "Cesme", km: "80", time: "1 h", tip: "highway" },
  ],
  Ankara: [
    { name: CAPPADOCIA, km: "280", time: "3.5 h", tip: "highway" },
  ],
};

function lang(locale: string): Locale {
  return locale in TIPS ? (locale as Locale) : "en";
}

function titleOf(locale: string, name: string | Name): string {
  const code = lang(locale);
  if (typeof name === "string") return cityDisplayName(code, name) || name;
  return name[code] || cityDisplayName(code, name.en) || name.en;
}

function lines(spots: Spot[], locale: string): DriveLine[] {
  const code = lang(locale);
  return spots
    .filter((spot) => spot.km !== "0")
    .map((spot) => ({
      title: titleOf(locale, spot.name),
      distance: DISTANCE[code](spot.km, spot.time),
      tip: TIPS[code][spot.tip],
      also: spot.also
        ? ALSO[code](titleOf(locale, spot.also.name), spot.also.km, spot.also.time)
        : undefined,
    }));
}

/** Drives for an airport code, or for a city when the page is not that airport. */
export function locationRouteLines(code: string, locale: string, cityName?: string): DriveLine[] {
  const direct = code.trim().toUpperCase();
  if (AIRPORTS[direct]) return lines(AIRPORTS[direct], locale);
  const city = (cityName || "").trim();
  if (city && CITY_DRIVES[city]) return lines(CITY_DRIVES[city], locale);
  return [];
}
