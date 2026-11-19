import type { Locale } from "@/lib/i18n/config";

export type LocationIntroCopy = {
  title: string;
  lead: string;
  /** Phrase inside `lead` that should be emphasised. */
  strong?: string;
  points: string[];
};

const KUT: Record<Locale, LocationIntroCopy> = {
  en: {
    title: "Driving from Kutaisi Airport",
    lead: "Kutaisi Airport is the gateway to Western Georgia. Distances below are typical times in normal traffic.",
    strong: "Western Georgia",
    points: [
      "A sedan or hybrid is ideal for Imereti, the Black Sea coast, and the highway to Tbilisi.",
      "Choose a 4x4 or AWD SUV for Mestia and Upper Svaneti, especially outside peak summer.",
    ],
  },
  ka: {
    title: "გზა ქუთაისის აეროპორტიდან",
    lead: "ქუთაისის აეროპორტი დასავლეთ საქართველოს კარიბჭეა. ქვემოთ მოცემული მანძილი ჩვეულებრივ მოძრაობაშია.",
    strong: "დასავლეთ საქართველოს",
    points: [
      "იმერეთის, შავი ზღვის სანაპიროს და თბილისის გზატკეცილისთვის სედანი ან ჰიბრიდი საუკეთესოა.",
      "მესტიასა და ზემო სვანეთში, განსაკუთრებით ზაფხულის სეზონის გარეთ, აირჩიეთ 4x4 ჯიპი.",
    ],
  },
  ru: {
    title: "Поездки из аэропорта Кутаиси",
    lead: "Аэропорт Кутаиси — ворота в Западную Грузию. Расстояния ниже — обычное время при нормальном движении.",
    strong: "Западную Грузию",
    points: [
      "Седан или гибрид удобен для Имеретии, побережья и трассы на Тбилиси.",
      "Для Местии и Верхней Сванетии, особенно вне лета, берите полноприводный внедорожник.",
    ],
  },
  de: {
    title: "Unterwegs ab Flughafen Kutaissi",
    lead: "Der Flughafen Kutaissi ist das Tor zu Westgeorgien. Die Entfernungen unten gelten bei normalem Verkehr.",
    strong: "Westgeorgien",
    points: [
      "Limousine oder Hybrid passen für Imeretien, die Küste und die Autobahn nach Tiflis.",
      "Für Mestia und Oberswanetien, besonders außerhalb des Sommers, einen 4x4-SUV wählen.",
    ],
  },
  es: {
    title: "Rutas desde el aeropuerto de Kutaisi",
    lead: "El aeropuerto de Kutaisi es la puerta al oeste de Georgia. Las distancias son tiempos habituales con tráfico normal.",
    strong: "oeste de Georgia",
    points: [
      "Un sedán o híbrido va bien por Imereti, la costa y la autopista a Tiflis.",
      "Para Mestia y la Alta Esvanetia, sobre todo fuera del verano, elija un SUV 4x4.",
    ],
  },
  fr: {
    title: "Prendre la route depuis l’aéroport de Koutaïssi",
    lead: "L’aéroport de Koutaïssi ouvre la Géorgie occidentale. Les distances ci-dessous valent par circulation normale.",
    strong: "Géorgie occidentale",
    points: [
      "Une berline ou une hybride convient pour l’Imérétie, la côte et l’autoroute vers Tbilissi.",
      "Pour Mestia et la Haute Svanétie, surtout hors été, prenez un SUV 4x4.",
    ],
  },
  it: {
    title: "In auto dall’aeroporto di Kutaisi",
    lead: "L’aeroporto di Kutaisi è la porta della Georgia occidentale. Le distanze sotto valgono con traffico normale.",
    strong: "Georgia occidentale",
    points: [
      "Berlina o ibrida per l’Imereti, la costa e l’autostrada per Tbilisi.",
      "Per Mestia e l’Alta Svanezia, soprattutto fuori estate, scegli un SUV 4x4.",
    ],
  },
  nl: {
    title: "Rijden vanaf luchthaven Koetaisi",
    lead: "Luchthaven Koetaisi is de poort naar West-Georgië. Afstanden hieronder gelden bij normaal verkeer.",
    strong: "West-Georgië",
    points: [
      "Een sedan of hybride past bij Imereti, de kust en de snelweg naar Tbilisi.",
      "Kies voor Mestia en Opper-Svanetië, vooral buiten de zomer, een 4x4 SUV.",
    ],
  },
  pl: {
    title: "Trasy z lotniska Kutaisi",
    lead: "Lotnisko Kutaisi to brama do zachodniej Gruzji. Odległości poniżej to zwykły czas przy normalnym ruchu.",
    strong: "zachodniej Gruzji",
    points: [
      "Sedan albo hybryda pasuje do Imeretii, wybrzeża i autostrady do Tbilisi.",
      "Do Mestii i Górnej Swanetii, zwłaszcza poza latem, wybierz SUV-a 4x4.",
    ],
  },
  tr: {
    title: "Kutaisi Havalimanı'ndan yollar",
    lead: "Kutaisi Havalimanı Batı Gürcistan'ın kapısıdır. Aşağıdaki mesafeler normal trafikteki sürelerdir.",
    strong: "Batı Gürcistan'ın",
    points: [
      "İmereti, sahil ve Tiflis otoyolu için sedan veya hibrit uygundur.",
      "Mestia ve Yukarı Svaneti için, özellikle yaz dışında, 4x4 SUV seçin.",
    ],
  },
  ar: {
    title: "القيادة من مطار كوتايسي",
    lead: "مطار كوتايسي بوابة غرب جورجيا. المسافات أدناه أوقات معتادة في حركة عادية.",
    strong: "غرب جورجيا",
    points: [
      "السيدان أو الهجين يناسب إيميريتي والساحل والطريق السريع إلى تبليسي.",
      "لمستيا وأعالي سفانيتي، خصوصًا خارج الصيف، اختر SUV دفع رباعي.",
    ],
  },
  zh: {
    title: "从库塔伊西机场出发",
    lead: "库塔伊西机场是西格鲁吉亚的门户。下面的距离是正常路况下的大致时间。",
    strong: "西格鲁吉亚",
    points: [
      "伊梅列季、黑海海岸和通往第比利斯的公路适合轿车或混动。",
      "去梅斯蒂亚和上斯瓦涅季，尤其在夏季以外，请选择四驱 SUV。",
    ],
  },
  ko: {
    title: "쿠타이시 공항에서 출발",
    lead: "쿠타이시 공항은 서부 조지아의 관문입니다. 아래 거리는 보통 교통에서의 시간입니다.",
    strong: "서부 조지아",
    points: [
      "이메레티, 흑해 해안, 트빌리시 고속도로는 세단이나 하이브리드가 알맞습니다.",
      "메스티아와 상스바네티는 여름 성수기 외에 4x4 SUV를 고르세요.",
    ],
  },
  th: {
    title: "ขับจากสนามบินคูไตซี",
    lead: "สนามบินคูไตซีคือประตูสู่จอร์เจียตะวันตก ระยะด้านล่างเป็นเวลาปกติเมื่อการจราจรไม่หนาแน่น",
    strong: "จอร์เจียตะวันตก",
    points: [
      "ซีดานหรือไฮบริดเหมาะกับอิเมเรติ ชายฝั่ง และทางหลวงไปทบิลิซี",
      "ไปเมสเตียและสวาเนติบน โดยเฉพาะนอกฤดูร้อน เลือก SUV ขับเคลื่อนสี่ล้อ",
    ],
  },
};

export function locationIntro(code: string, locale: string): LocationIntroCopy | null {
  if (code.trim().toUpperCase() !== "KUT") return null;
  const row = KUT[locale as Locale] ?? KUT.en;
  return { title: row.title, lead: row.lead, strong: row.strong, points: [] };
}
