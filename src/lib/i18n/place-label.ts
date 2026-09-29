import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import type { Locale } from "@/lib/i18n/config";

/** Airport names for locales that are not stored on the catalog record. */
const EXTRA: Record<string, Partial<Record<Locale, string>>> = {
  TBS: {
    es: "Aeropuerto internacional de Tiflis",
    it: "Aeroporto internazionale di Tbilisi",
    nl: "Internationale luchthaven Tbilisi",
    tr: "Tiflis Uluslararası Havalimanı",
    zh: "第比利斯国际机场",
    ko: "트빌리시 국제공항",
    th: "สนามบินนานาชาติทบิลิซี",
  },
  KUT: {
    es: "Aeropuerto internacional de Kutaisi",
    it: "Aeroporto internazionale di Kutaisi",
    nl: "Internationale luchthaven Koetaisi",
    tr: "Kutaisi Uluslararası Havalimanı",
    zh: "库塔伊西国际机场",
    ko: "쿠타이시 국제공항",
    th: "สนามบินนานาชาติคูไตซี",
  },
  BUS: {
    es: "Aeropuerto internacional de Batumi",
    it: "Aeroporto internazionale di Batumi",
    nl: "Internationale luchthaven Batoemi",
    tr: "Batum Uluslararası Havalimanı",
    zh: "巴统国际机场",
    ko: "바투미 국제공항",
    th: "สนามบินนานาชาติบาตูมี",
  },
  IST: {
    es: "Aeropuerto de Estambul",
    it: "Aeroporto di Istanbul",
    nl: "Luchthaven Istanbul",
    tr: "İstanbul Havalimanı",
    zh: "伊斯坦布尔机场",
    ko: "이스탄불 공항",
    th: "สนามบินอิสตันบูล",
  },
  AYT: {
    es: "Aeropuerto de Antalya",
    it: "Aeroporto di Antalya",
    nl: "Luchthaven Antalya",
    tr: "Antalya Havalimanı",
    zh: "安塔利亚机场",
    ko: "안탈리아 공항",
    th: "สนามบินอันตัลยา",
  },
  EVN: {
    es: "Aeropuerto internacional Zvartnots",
    it: "Aeroporto internazionale di Zvartnots",
    nl: "Internationale luchthaven Zvartnots",
    tr: "Zvartnots Uluslararası Havalimanı",
    zh: "兹瓦尔特诺茨国际机场",
    ko: "즈바르트노츠 국제공항",
    th: "สนามบินนานาชาติซวาร์ตโนตส์",
  },
  GYD: {
    es: "Aeropuerto internacional Heydar Aliyev",
    it: "Aeroporto internazionale Heydar Aliyev",
    nl: "Internationale luchthaven Heydar Aliyev",
    tr: "Haydar Aliyev Uluslararası Havalimanı",
    zh: "盖达尔·阿利耶夫国际机场",
    ko: "헤이다르 알리예프 국제공항",
    th: "สนามบินนานาชาติเฮย์ดาร์ อาลิเยฟ",
  },
  WAW: {
    es: "Aeropuerto Chopin de Varsovia",
    it: "Aeroporto Chopin di Varsavia",
    nl: "Luchthaven Warschau Chopin",
    tr: "Varşova Chopin Havalimanı",
    zh: "华沙肖邦机场",
    ko: "바르샤바 쇼팽 공항",
    th: "สนามบินวอร์ซอ โชแปง",
  },
  CDG: {
    es: "París Charles de Gaulle",
    it: "Parigi Charles de Gaulle",
    nl: "Parijs Charles de Gaulle",
    tr: "Paris Charles de Gaulle",
    zh: "巴黎戴高乐机场",
    ko: "파리 샤를 드골",
    th: "ปารีส ชาร์ล เดอ โกล",
  },
  FRA: {
    es: "Aeropuerto de Fráncfort",
    it: "Aeroporto di Francoforte",
    nl: "Luchthaven Frankfurt",
    tr: "Frankfurt Havalimanı",
    zh: "法兰克福机场",
    ko: "프랑크푸르트 공항",
    th: "สนามบินแฟรงก์เฟิร์ต",
  },
  MXP: {
    es: "Milán Malpensa",
    it: "Milano Malpensa",
    nl: "Milaan Malpensa",
    tr: "Milano Malpensa",
    zh: "米兰马尔彭萨机场",
    ko: "밀라노 말펜사",
    th: "มิลาน มัลเปนซา",
  },
  BCN: {
    es: "Barcelona El Prat",
    it: "Barcellona El Prat",
    nl: "Barcelona El Prat",
    tr: "Barselona El Prat",
    zh: "巴塞罗那埃尔普拉特机场",
    ko: "바르셀로나 엘프라트",
    th: "บาร์เซโลนา เอลปรัต",
  },
  ATH: {
    es: "Atenas internacional",
    it: "Atene internazionale",
    nl: "Athene internationaal",
    tr: "Atina Uluslararası",
    zh: "雅典国际机场",
    ko: "아테네 국제공항",
    th: "สนามบินนานาชาติเอเธนส์",
  },
  AMS: {
    es: "Ámsterdam Schiphol",
    it: "Amsterdam Schiphol",
    nl: "Amsterdam Schiphol",
    tr: "Amsterdam Schiphol",
    zh: "阿姆斯特丹史基浦机场",
    ko: "암스테르담 스키폴",
    th: "อัมสเตอร์ดัม สคิปโฮล",
  },
  PRG: {
    es: "Praga Václav Havel",
    it: "Praga Václav Havel",
    nl: "Praag Václav Havel",
    tr: "Prag Václav Havel",
    zh: "布拉格瓦茨拉夫·哈维尔机场",
    ko: "프라하 바츨라프 하벨",
    th: "ปราก วาตสลาฟ ฮาเวล",
  },
  OTP: {
    es: "Bucarest Otopeni",
    it: "Bucarest Otopeni",
    nl: "Boekarest Otopeni",
    tr: "Bükreş Otopeni",
    zh: "布加勒斯特奥托佩尼机场",
    ko: "부쿠레슈티 오토페니",
    th: "บูคาเรสต์ โอโตเปนี",
  },
  SOF: {
    es: "Aeropuerto de Sofía",
    it: "Aeroporto di Sofia",
    nl: "Luchthaven Sofia",
    tr: "Sofya Havalimanı",
    zh: "索非亚机场",
    ko: "소피아 공항",
    th: "สนามบินโซเฟีย",
  },
  LHR: {
    es: "Londres Heathrow",
    it: "Londra Heathrow",
    nl: "Londen Heathrow",
    tr: "Londra Heathrow",
    zh: "伦敦希思罗机场",
    ko: "런던 히스로",
    th: "ลอนดอน ฮีทโธรว์",
  },
  DXB: {
    es: "Dubái internacional",
    it: "Dubai internazionale",
    nl: "Dubai internationaal",
    tr: "Dubai Uluslararası",
    zh: "迪拜国际机场",
    ko: "두바이 국제공항",
    th: "สนามบินนานาชาติดูไบ",
  },
  TLV: {
    es: "Tel Aviv Ben Gurión",
    it: "Tel Aviv Ben Gurion",
    nl: "Tel Aviv Ben Gurion",
    tr: "Tel Aviv Ben Gurion",
    zh: "特拉维夫本-古里安机场",
    ko: "텔아비브 벤구리온",
    th: "เทลอาวีฟ เบน กูเรียน",
  },
  KBP: {
    es: "Kiev Borýspil",
    it: "Kiev Boryspil",
    nl: "Kiev Boryspil",
    tr: "Kiev Boryspil",
    zh: "基辅鲍里斯波尔机场",
    ko: "키이우 보리스필",
    th: "เคียฟ บอริสปิล",
  },
};

function splitCode(label: string) {
  const match = label.match(/^(.*)\s+\(([A-Z0-9-]{2,12})\)$/);
  if (!match) return { base: label.trim(), code: "" };
  return { base: match[1].trim(), code: match[2] };
}

function withCode(name: string, code: string) {
  return code ? `${name} (${code})` : name;
}

/** Show a catalog airport or country label in the selected language. */
export function placeLabel(locale: string, label: string): string {
  const raw = String(label || "").trim();
  if (!raw) return raw;
  const { base, code } = splitCode(raw);
  const airport =
    CATALOG_AIRPORTS.find((item) => item.iata === code) ||
    CATALOG_AIRPORTS.find((item) => item.name.en === base);
  if (!airport) return raw;
  const stored = airport.name[locale as Locale];
  if (stored) return withCode(stored, code || airport.iata);
  const extra = EXTRA[airport.iata]?.[locale as Locale];
  if (extra) return withCode(extra, code || airport.iata);
  return raw;
}

const REGION_TAG: Record<string, string> = { zh: "zh-CN", ko: "ko-KR", th: "th-TH", ar: "ar", ka: "ka-GE" };

/** Country name from ISO code, in the selected language. */
export function regionName(locale: string, iso2: string, fallback: string): string {
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return fallback;
  try {
    const tag = REGION_TAG[locale] || locale || "en";
    const name = new Intl.DisplayNames([tag], { type: "region" }).of(code);
    return name && name !== code ? name : fallback;
  } catch {
    return fallback;
  }
}
