import type { Locale } from "@/lib/i18n/config";
import {
  allSearchPlaces,
  findSearchPlace,
  normalizeLocationCode,
  placeSlug,
  type SearchPlace,
} from "@/lib/catalog/search-places";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { cleanLocationAnchor } from "@/lib/seo/location-link-label";
import { cityDisplayName as translatedCityName } from "@/lib/i18n/place-label";
export {
  SEO_LANDING_LOCALES,
  SEO_LANDING_PREFIX,
  isSeoLandingLocale,
  parseSeoLandingPath,
  seoLandingLanguageAlternates,
  seoLandingPath,
  seoLandingPrefix,
  type SeoLandingLocale,
} from "@/lib/seo/location-landing-path";
import {
  SEO_LANDING_LOCALES,
  SEO_LANDING_PREFIX,
  isSeoLandingLocale,
  type SeoLandingLocale,
} from "@/lib/seo/location-landing-path";
import { createTtlCache } from "@/lib/server/ttl-cache";

export type SeoLocation = {
  /** Stable id = normalized place code (IATA or CITY-…). */
  code: string;
  kind: "airport" | "city";
  /** Latin URL slug, e.g. kutaisi-airport or yerevan. */
  slug: string;
  cityName: string;
  placeName: string;
  countryIso2: string;
  iata?: string;
};

export function locationSeoSlug(place: Pick<SearchPlace, "kind" | "cityName" | "code" | "iata">): string {
  const city = placeSlug(place.cityName || place.code);
  if (place.kind === "city") return city || placeSlug(place.code);
  const iata = (place.iata || place.code).toLowerCase();
  return city ? `${city}-airport` : `${iata}-airport`;
}

function cityDisplayName(code: string, locale: Locale): string {
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === code)?.cityName;
  if (catalog?.[locale]) return catalog[locale]!;
  if (catalog?.en) return catalog.en;
  return findSearchPlace(code)?.cityName || code;
}

function airportDisplayName(code: string, locale: Locale): string {
  const catalog = CATALOG_AIRPORTS.find((a) => a.iata === code)?.name;
  if (catalog?.[locale]) return catalog[locale]!;
  if (catalog?.en) return catalog.en;
  const place = findSearchPlace(code);
  return place?.name || code;
}

/** Build unique SEO locations from active bookable places (+ optional extras). */
export function buildSeoLocations(
  liveCodes: Array<{ code: string; kind?: "airport" | "city"; label?: string }> = [],
): SeoLocation[] {
  const bySlug = new Map<string, SeoLocation>();
  const add = (place: SearchPlace) => {
    const code = normalizeLocationCode(place.code);
    const slug = locationSeoSlug(place);
    if (!slug) return;
    if (bySlug.has(slug) && bySlug.get(slug)!.code !== code) {
      const alt = `${slug}-${placeSlug(code)}`;
      bySlug.set(alt, {
        code,
        kind: place.kind,
        slug: alt,
        cityName: place.cityName,
        placeName: place.name,
        countryIso2: place.countryIso2,
        iata: place.iata,
      });
      return;
    }
    bySlug.set(slug, {
      code,
      kind: place.kind,
      slug,
      cityName: place.cityName,
      placeName: place.name,
      countryIso2: place.countryIso2,
      iata: place.iata,
    });
  };

  for (const row of liveCodes) {
    const code = normalizeLocationCode(row.code);
    const place = findSearchPlace(code);
    if (place) {
      add(place);
      continue;
    }
    const kind = row.kind ?? (/^CITY-/i.test(code) ? "city" : "airport");
    add({
      code,
      kind,
      countryIso2: "",
      name: row.label || code,
      cityName: row.label || code,
      label: row.label || code,
      iata: kind === "airport" ? code : undefined,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

const seoLocationCache = createTtlCache<SeoLocation[]>(30_000);
let seoLocationInflight: Promise<SeoLocation[]> | null = null;

export async function listSeoLocations(): Promise<SeoLocation[]> {
  const cached = seoLocationCache.get();
  if (cached) return cached;
  if (!seoLocationInflight) {
    seoLocationInflight = loadSeoLocationList()
      .then((rows) => {
        const previous = seoLocationCache.peek();
        const value = rows.length ? rows : previous ?? rows;
        seoLocationCache.set(value);
        return value;
      })
      .finally(() => {
        seoLocationInflight = null;
      });
  }
  return seoLocationInflight;
}

async function loadSeoLocationList(): Promise<SeoLocation[]> {
  const codes: Array<{ code: string; kind?: "airport" | "city"; label?: string }> = [];
  const [live, homepage] = await Promise.all([
    (async () => {
      try {
        const { getSearchDeliveryAirports } = await import("@/lib/server/delivery-locations");
        return await getSearchDeliveryAirports();
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
        return await listHomepageAirports();
      } catch {
        return [];
      }
    })(),
  ]);
  for (const row of live) {
    codes.push({ code: row.iata, kind: row.kind, label: row.label });
  }
  for (const row of homepage) {
    if (!row.iata?.trim()) continue;
    codes.push({ code: row.iata, label: row.title });
  }
  // Always union catalog hubs. Live/homepage may be partial when Neon is slow;
  // cities from live still win via buildSeoLocations slug merge.
  for (const place of allSearchPlaces()) {
    if (place.kind === "airport" && CATALOG_AIRPORTS.some((a) => a.iata === place.iata)) {
      codes.push({ code: place.code, kind: place.kind, label: place.label });
    }
  }
  return buildSeoLocations(codes);
}

export function findSeoLocationBySlug(locations: SeoLocation[], slug: string): SeoLocation | null {
  const key = slug.trim().toLowerCase();
  return locations.find((row) => row.slug === key) ?? null;
}

export function findSeoLocationByCode(locations: SeoLocation[], code: string): SeoLocation | null {
  const key = normalizeLocationCode(code);
  if (!key) return null;
  return locations.find((row) => normalizeLocationCode(row.code) === key) ?? null;
}

export type LocationSeoCopy = {
  title: string;
  description: string;
  h1: string;
  lead: string;
  cta: string;
  popularTitle: string;
  breadcrumbHome: string;
  breadcrumbCountry: string;
  keywords: string[];
  anchor: string;
  /** Descriptive image alt (place name), not a promo slogan. */
  imageAlt: string;
};

/** Localized country label for breadcrumbs (catalog first, then Intl). */
export function countryDisplayName(iso2: string, locale: Locale): string {
  const key = iso2.trim().toUpperCase();
  if (!key) return "";
  const hit = CATALOG_AIRPORTS.find((a) => a.countryIso2 === key);
  if (hit) return hit.countryName[locale] || hit.countryName.en;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(key) || key;
  } catch {
    return key;
  }
}

function localizedCity(location: SeoLocation, locale: Locale): string {
  if (location.iata) return cityDisplayName(location.iata, locale) || location.cityName;
  if (locale === "ka" || locale === "ru") {
    return translatedCityName(locale, location.cityName) || location.cityName;
  }
  return location.cityName;
}

function localizedAirportLabel(location: SeoLocation, locale: Locale): string {
  if (location.kind === "city") return localizedCity(location, locale);
  const name = location.iata ? airportDisplayName(location.iata, locale) : location.placeName;
  const iata = location.iata || "";
  if (iata && !name.includes(iata)) return `${name} (${iata})`;
  return name;
}

type LandingFill = {
  city: string;
  airportCode: string;
  country: string;
  place: string;
  airport: boolean;
  anchor: string;
  imageAlt: string;
};

/** Title, description, and H1 for landing locales that are not Georgian or Russian. */
function landingMeta(locale: Locale, fill: LandingFill): LocationSeoCopy {
  const { city, airportCode, country, place, airport, anchor, imageAlt } = fill;
  const packs: Record<
    string,
    { title: [string, string]; description: [string, string]; h1: [string, string]; lead: string; cta: string; popular: string; home: string }
  > = {
    de: {
      title: [`Mietwagen am Flughafen ${city} (${airportCode})`, `Mietwagen in ${city}`],
      description: [
        `Mietwagen direkt von geprüften lokalen Anbietern am Flughafen ${city} (${airportCode}). Klare Preise, keine versteckten Gebühren.`,
        `Mietwagen direkt von geprüften lokalen Anbietern in ${city}. Klare Preise, keine versteckten Gebühren.`,
      ],
      h1: [`Mietwagen am Flughafen ${city}`, `Mietwagen in ${city}`],
      lead: `Vergleichen Sie Autos lokaler Partner in ${city}${airport ? " und am Flughafen" : ""}. Transparente Preise, Übergabe bei Ankunft.`,
      cta: "Autos ansehen",
      popular: "Beliebte Reiseziele",
      home: "Start",
    },
    es: {
      title: [`Alquiler de coches en el aeropuerto de ${city} (${airportCode})`, `Alquiler de coches en ${city}`],
      description: [
        `Alquile coches con operadores locales de confianza en el aeropuerto de ${city} (${airportCode}). Precios claros y sin cargos ocultos.`,
        `Alquile coches con operadores locales de confianza en ${city}. Precios claros y sin cargos ocultos.`,
      ],
      h1: [`Alquiler de coches en el aeropuerto de ${city}`, `Alquiler de coches en ${city}`],
      lead: `Compare coches de socios locales en ${city}${airport ? " y en el aeropuerto" : ""}. Precios transparentes y entrega a la llegada.`,
      cta: "Ver coches",
      popular: "Destinos populares",
      home: "Inicio",
    },
    fr: {
      title: [`Location de voiture à l'aéroport de ${city} (${airportCode})`, `Location de voiture à ${city}`],
      description: [
        `Louez une voiture auprès de partenaires locaux vérifiés à l'aéroport de ${city} (${airportCode}). Tarifs clairs, sans frais cachés.`,
        `Louez une voiture auprès de partenaires locaux vérifiés à ${city}. Tarifs clairs, sans frais cachés.`,
      ],
      h1: [`Location de voiture à l'aéroport de ${city}`, `Location de voiture à ${city}`],
      lead: `Comparez les voitures de partenaires locaux à ${city}${airport ? " et à l'aéroport" : ""}. Prix transparents, remise à l'arrivée.`,
      cta: "Voir les voitures",
      popular: "Destinations populaires",
      home: "Accueil",
    },
    it: {
      title: [`Noleggio auto all'aeroporto di ${city} (${airportCode})`, `Noleggio auto a ${city}`],
      description: [
        `Noleggia auto da partner locali verificati all'aeroporto di ${city} (${airportCode}). Prezzi chiari, senza costi nascosti.`,
        `Noleggia auto da partner locali verificati a ${city}. Prezzi chiari, senza costi nascosti.`,
      ],
      h1: [`Noleggio auto all'aeroporto di ${city}`, `Noleggio auto a ${city}`],
      lead: `Confronta le auto dei partner locali a ${city}${airport ? " e in aeroporto" : ""}. Prezzi trasparenti, consegna all'arrivo.`,
      cta: "Vedi le auto",
      popular: "Destinazioni popolari",
      home: "Home",
    },
    nl: {
      title: [`Autoverhuur op luchthaven ${city} (${airportCode})`, `Autoverhuur in ${city}`],
      description: [
        `Huur een auto bij gecontroleerde lokale partners op luchthaven ${city} (${airportCode}). Duidelijke prijzen, geen verborgen kosten.`,
        `Huur een auto bij gecontroleerde lokale partners in ${city}. Duidelijke prijzen, geen verborgen kosten.`,
      ],
      h1: [`Autoverhuur op luchthaven ${city}`, `Autoverhuur in ${city}`],
      lead: `Vergelijk auto's van lokale partners in ${city}${airport ? " en op de luchthaven" : ""}. Transparante prijzen, overdracht bij aankomst.`,
      cta: "Auto's bekijken",
      popular: "Populaire bestemmingen",
      home: "Home",
    },
    pl: {
      title: [`Wynajem aut na lotnisku ${city} (${airportCode})`, `Wynajem aut w ${city}`],
      description: [
        `Wypożycz auto od sprawdzonych lokalnych partnerów na lotnisku ${city} (${airportCode}). Jasne ceny, bez ukrytych opłat.`,
        `Wypożycz auto od sprawdzonych lokalnych partnerów w ${city}. Jasne ceny, bez ukrytych opłat.`,
      ],
      h1: [`Wynajem aut na lotnisku ${city}`, `Wynajem aut w ${city}`],
      lead: `Porównaj auta lokalnych partnerów w ${city}${airport ? " i na lotnisku" : ""}. Przejrzyste ceny, odbiór po przylocie.`,
      cta: "Zobacz auta",
      popular: "Popularne kierunki",
      home: "Strona główna",
    },
    tr: {
      title: [`${city} havalimanı araç kiralama (${airportCode})`, `${city} araç kiralama`],
      description: [
        `${city} havalimanında (${airportCode}) doğrulanmış yerel firmalardan araç kiralayın. Net fiyatlar, gizli ücret yok.`,
        `${city} şehrinde doğrulanmış yerel firmalardan araç kiralayın. Net fiyatlar, gizli ücret yok.`,
      ],
      h1: [`${city} havalimanında araç kiralama`, `${city} araç kiralama`],
      lead: `${city}${airport ? " ve havalimanında" : ""} yerel partnerlerin araçlarını karşılaştırın. Şeffaf fiyat, varışta teslim.`,
      cta: "Araçları gör",
      popular: "Popüler destinasyonlar",
      home: "Ana sayfa",
    },
    ar: {
      title: [`تأجير سيارات في مطار ${city} (${airportCode})`, `تأجير سيارات في ${city}`],
      description: [
        `احجز سيارة من شركاء محليين موثوقين في مطار ${city} (${airportCode}). أسعار واضحة بلا رسوم خفية.`,
        `احجز سيارة من شركاء محليين موثوقين في ${city}. أسعار واضحة بلا رسوم خفية.`,
      ],
      h1: [`تأجير سيارات في مطار ${city}`, `تأجير سيارات في ${city}`],
      lead: `قارن سيارات الشركاء المحليين في ${city}${airport ? " وفي المطار" : ""}. أسعار شفافة وتسليم عند الوصول.`,
      cta: "عرض السيارات",
      popular: "وجهات شائعة",
      home: "الرئيسية",
    },
    zh: {
      title: [`${city}机场（${airportCode}）租车`, `${city}租车`],
      description: [
        `在${city}机场（${airportCode}）向可信本地运营商直接租车。价格透明，无隐藏费用。`,
        `在${city}向可信本地运营商直接租车。价格透明，无隐藏费用。`,
      ],
      h1: [`${city}机场租车`, `${city}租车`],
      lead: `比较${city}${airport ? "及机场" : ""}本地合作方的车辆。价格透明，抵达即可交车。`,
      cta: "浏览车辆",
      popular: "热门目的地",
      home: "首页",
    },
    ko: {
      title: [`${city} 공항(${airportCode}) 렌터카`, `${city} 렌터카`],
      description: [
        `${city} 공항(${airportCode})에서 검증된 현지 업체 차량을 예약하세요. 투명한 요금, 숨은 비용 없음.`,
        `${city}에서 검증된 현지 업체 차량을 예약하세요. 투명한 요금, 숨은 비용 없음.`,
      ],
      h1: [`${city} 공항 렌터카`, `${city} 렌터카`],
      lead: `${city}${airport ? "과 공항" : ""}의 현지 파트너 차량을 비교하세요. 투명한 요금, 도착 시 인수.`,
      cta: "차량 보기",
      popular: "인기 목적지",
      home: "홈",
    },
    th: {
      title: [`เช่ารถสนามบิน${city} (${airportCode})`, `เช่ารถ${city}`],
      description: [
        `จองรถจากพาร์ทเนอร์ท้องถิ่นที่สนามบิน${city} (${airportCode}) ราคาชัดเจน ไม่มีค่าธรรมเนียมแอบแฝง`,
        `จองรถจากพาร์ทเนอร์ท้องถิ่นใน${city} ราคาชัดเจน ไม่มีค่าธรรมเนียมแอบแฝง`,
      ],
      h1: [`เช่ารถสนามบิน${city}`, `เช่ารถ${city}`],
      lead: `เปรียบเทียบรถจากพาร์ทเนอร์ท้องถิ่นใน${city}${airport ? " และสนามบิน" : ""} ราคาโปร่งใส ส่งมอบเมื่อถึง`,
      cta: "ดูรถ",
      popular: "จุดหมายยอดนิยม",
      home: "หน้าแรก",
    },
  };
  const pack = packs[locale];
  const index = airport ? 0 : 1;
  if (!pack) {
    return {
      title: airport
        ? `Car Rental at ${city} (${airportCode}) | Best Local Rates`
        : `Car Rental in ${city} | Best Local Rates`,
      description: airport
        ? `Book rental cars directly from trusted local operators at ${city} (${airportCode}). Best local rates, transparent pricing, and zero hidden fees.`
        : `Book rental cars directly from trusted local operators in ${city}. Best local rates, transparent pricing, and zero hidden fees.`,
      h1: airport ? `Car rental at ${city} Airport` : `Car rental in ${city}`,
      lead: `Compare cars from verified local partners in ${city}${airport ? " and at the airport" : ""}. Transparent prices, delivery to arrivals.`,
      cta: "Browse cars",
      popularTitle: "Popular destinations",
      breadcrumbHome: "Home",
      breadcrumbCountry: country,
      keywords: [`car rental ${city}`, `car rental ${place}`, `rent a car ${city}`, `${city} airport car rental`, `car hire ${city}`],
      anchor,
      imageAlt,
    };
  }
  return {
    title: pack.title[index],
    description: pack.description[index],
    h1: pack.h1[index],
    lead: pack.lead,
    cta: pack.cta,
    popularTitle: pack.popular,
    breadcrumbHome: pack.home,
    breadcrumbCountry: country,
    keywords: [`car rental ${city}`, `car rental ${place}`, `rent a car ${city}`, `${city} airport car rental`, `car hire ${city}`],
    anchor,
    imageAlt,
  };
}

/** Exact-intent meta + H1 packs for a location landing. */
export function locationLandingCopy(location: SeoLocation, locale: Locale): LocationSeoCopy {
  const city =
    localizedCity(location, locale).trim() || location.placeName.trim() || location.code;
  const airportName = localizedAirportLabel(location, locale);
  const airportCode = location.iata || (location.kind === "airport" ? location.code : city);
  const country = countryDisplayName(location.countryIso2, locale) || location.countryIso2;
  const place =
    location.kind === "airport"
      ? `${airportName}${location.iata && !airportName.includes(location.iata) ? ` (${location.iata})` : ""}`
      : city;
  const anchor = cleanLocationAnchor(location, locale);
  const imageAlt = location.kind === "airport" ? place || anchor : anchor;

  if (locale === "ka") {
    const georgianName = /[\u10A0-\u10FF]/.test(city);
    const cityIn = georgianName ? city : `${city}ში`;
    const cityAt = georgianName ? city : `${city}-ში`;
    return {
      title:
        location.kind === "airport"
          ? `მანქანის დაქირავება ${city} აეროპორტში | საუკეთესო ფასები`
          : `მანქანის დაქირავება ${cityIn} | საუკეთესო ფასები`,
      description:
        location.kind === "airport"
          ? `ავტომობილის დაქირავება ${city} აეროპორტში ადგილობრივი პარტნიორებისგან. საუკეთესო ფასები, უფასო გაუქმება.`
          : `ავტომობილის დაქირავება ${cityIn} ადგილობრივი პარტნიორებისგან. საუკეთესო ფასები, უფასო გაუქმება.`,
      h1:
        location.kind === "airport"
          ? `მანქანის დაქირავება ${city} აეროპორტში`
          : `მანქანის დაქირავება ${cityIn}`,
      lead: `იპოვეთ ადგილობრივი ოპერატორების მანქანები ${cityAt} და აეროპორტთან. გამჭვირვალე ფასები, მიწოდება ჩამოსვლისას.`,
      cta: "მანქანების ნახვა",
      popularTitle: "პოპულარული მიმართულებები",
      breadcrumbHome: "მთავარი",
      breadcrumbCountry: country,
      keywords: [
        `მანქანის დაქირავება ${city}`,
        `მანქანის ქირაობა ${city}`,
        `${city} აეროპორტი მანქანა`,
        `ავტომობილის დაქირავება ${city}`,
      ],
      anchor,
      imageAlt,
    };
  }

  if (locale === "ru") {
    return {
      title:
        location.kind === "airport"
          ? `Аренда авто в аэропорту ${city} (${airportCode}) | Лучшие цены`
          : `Аренда авто в городе ${city} | Лучшие цены`,
      description:
        location.kind === "airport"
          ? `Прокат автомобилей в аэропорту ${city} (${airportCode}) от местных компаний. Лучшие местные цены, прозрачные условия.`
          : `Прокат автомобилей в ${city} от местных компаний. Лучшие местные цены, прозрачные условия.`,
      h1:
        location.kind === "airport"
          ? `Аренда авто в аэропорту ${city}`
          : `Аренда авто в городе ${city}`,
      lead: `Авто от местных партнёров в ${city} и у аэропорта. Прозрачные цены, подача к прилёту.`,
      cta: "Смотреть автомобили",
      popularTitle: "Популярные направления",
      breadcrumbHome: "Главная",
      breadcrumbCountry: country,
      keywords: [
        `аренда авто ${city}`,
        `прокат автомобилей ${city}`,
        `${city} аэропорт аренда авто`,
        `аренда машины ${city}`,
      ],
      anchor,
      imageAlt,
    };
  }

  return landingMeta(locale, {
    city,
    airportCode,
    country,
    place,
    airport: location.kind === "airport",
    anchor,
    imageAlt,
  });
}

export function seoLandingOgLocale(locale: Locale): string {
  if (locale === "ka") return "ka_GE";
  if (locale === "ru") return "ru_RU";
  if (locale === "pl") return "pl_PL";
  if (locale === "de") return "de_DE";
  if (locale === "es") return "es_ES";
  if (locale === "fr") return "fr_FR";
  if (locale === "it") return "it_IT";
  if (locale === "nl") return "nl_NL";
  if (locale === "tr") return "tr_TR";
  if (locale === "ar") return "ar_SA";
  if (locale === "zh") return "zh_CN";
  if (locale === "ko") return "ko_KR";
  if (locale === "th") return "th_TH";
  return "en_US";
}

/** Params for generateStaticParams / sitemap. */
export function seoLandingStaticParams(locations: SeoLocation[]) {
  const params: Array<{ locale: string; seoLanding: string }> = [];
  for (const locale of SEO_LANDING_LOCALES) {
    const prefix = SEO_LANDING_PREFIX[locale];
    for (const loc of locations) {
      params.push({ locale, seoLanding: `${prefix}-${loc.slug}` });
    }
  }
  return params;
}

