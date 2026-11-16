import type { Locale } from "@/lib/i18n/config";
import {
  allSearchPlaces,
  findSearchPlace,
  normalizeLocationCode,
  placeSlug,
  type SearchPlace,
} from "@/lib/catalog/search-places";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
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

export async function listSeoLocations(): Promise<SeoLocation[]> {
  const codes: Array<{ code: string; kind?: "airport" | "city"; label?: string }> = [];
  try {
    const { getSearchDeliveryAirports } = await import("@/lib/server/delivery-locations");
    const live = await getSearchDeliveryAirports();
    for (const row of live) {
      codes.push({ code: row.iata, kind: row.kind, label: row.label });
    }
  } catch {
    /* ignore */
  }
  try {
    const { listHomepageAirports } = await import("@/lib/server/homepage-airports-store");
    for (const row of await listHomepageAirports()) {
      if (!row.iata?.trim()) continue;
      codes.push({ code: row.iata, label: row.title });
    }
  } catch {
    /* ignore */
  }
  // Fallback: catalog hub airports only (not the full world place dump).
  if (!codes.length) {
    for (const place of allSearchPlaces()) {
      if (place.kind === "airport" && CATALOG_AIRPORTS.some((a) => a.iata === place.iata)) {
        codes.push({ code: place.code, kind: place.kind, label: place.label });
      }
    }
  }
  return buildSeoLocations(codes);
}

export function findSeoLocationBySlug(locations: SeoLocation[], slug: string): SeoLocation | null {
  const key = slug.trim().toLowerCase();
  return locations.find((row) => row.slug === key) ?? null;
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
  return location.cityName;
}

function localizedAirportLabel(location: SeoLocation, locale: Locale): string {
  if (location.kind === "city") return localizedCity(location, locale);
  const name = location.iata ? airportDisplayName(location.iata, locale) : location.placeName;
  const iata = location.iata || "";
  if (iata && !name.includes(iata)) return `${name} (${iata})`;
  return name;
}

/** Exact-intent meta + H1 packs for a location landing. */
export function locationLandingCopy(location: SeoLocation, locale: Locale): LocationSeoCopy {
  const city = localizedCity(location, locale);
  const airportName = localizedAirportLabel(location, locale);
  const airportCode = location.iata || (location.kind === "airport" ? location.code : city);
  const country = countryDisplayName(location.countryIso2, locale) || location.countryIso2;
  const place =
    location.kind === "airport"
      ? `${airportName}${location.iata ? ` (${location.iata})` : ""}`
      : city;

  if (locale === "ka") {
    return {
      title: `მანქანის დაქირავება ${city} და აეროპორტში | საუკეთესო ფასები`,
      description: `ავტომობილის დაქირავება ${city}ში და აეროპორტში ადგილობრივი პარტნიორებისგან. საუკეთესო ფასები, უფასო გაუქმება.`,
      h1:
        location.kind === "airport"
          ? `მანქანის დაქირავება ${city} აეროპორტში`
          : `მანქანის დაქირავება ${city}ში`,
      lead: `იპოვეთ ადგილობრივი ოპერატორების მანქანები ${city}-ში და აეროპორტთან. გამჭვირვალე ფასები, მიწოდება ჩამოსვლისას.`,
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
      anchor:
        location.kind === "airport"
          ? `მანქანის დაქირავება ${city} აეროპორტში`
          : `მანქანის დაქირავება ${city}ში`,
    };
  }

  if (locale === "ru") {
    return {
      title:
        location.kind === "airport"
          ? `Аренда авто в городе ${city} (${airportCode}) | Лучшие цены`
          : `Аренда авто в городе ${city} | Лучшие цены`,
      description: `Прокат автомобилей в ${city} и в аэропорту от местных компаний. Лучшие местные цены, прозрачные условия.`,
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
      anchor:
        location.kind === "airport"
          ? `Аренда авто в аэропорту ${city}`
          : `Аренда авто в ${city}`,
    };
  }

  return {
    title:
      location.kind === "airport"
        ? `Car Rental at ${city} (${airportCode}) | Best Local Rates`
        : `Car Rental in ${city} | Best Local Rates`,
    description:
      location.kind === "airport"
        ? `Book rental cars directly from trusted local operators at ${city} (${airportCode}). Best local rates, transparent pricing, and zero hidden fees.`
        : `Book rental cars directly from trusted local operators in ${city}. Best local rates, transparent pricing, and zero hidden fees.`,
    h1:
      location.kind === "airport"
        ? `Car rental at ${city} Airport`
        : `Car rental in ${city}`,
    lead: `Compare cars from verified local partners in ${city}${location.kind === "airport" ? " and at the airport" : ""}. Transparent prices, delivery to arrivals.`,
    cta: "Browse cars",
    popularTitle: "Popular destinations",
    breadcrumbHome: "Home",
    breadcrumbCountry: country,
    keywords: [
      `car rental ${city}`,
      `car rental ${place}`,
      `rent a car ${city}`,
      `${city} airport car rental`,
      `car hire ${city}`,
    ],
    anchor:
      location.kind === "airport"
        ? `Car rental at ${city} Airport`
        : `Car rental in ${city}`,
  };
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

