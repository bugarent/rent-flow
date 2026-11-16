import { SEO_SITE_NAME, SITE_DOMAIN, SUPPORT_EMAIL } from "@/lib/brand";
import { SITE_URL, absoluteUrl } from "@/lib/seo/config";
import { LOCALES } from "@/lib/i18n/config";

/** Spellings people type for the brand; the domain is left out so Google keeps the brand name. */
const BRAND_ALTERNATES = ["Rent Airport Cars", "RentAirportCars"];

export type LocalBusinessContact = {
  phone?: string;
  email?: string;
  address?: string;
};

/** Organization + AutoRental (CarRental) focused on Georgian airports / Kutaisi. */
export type AggregateRatingInput = {
  ratingValue: number;
  reviewCount: number;
};

export function buildLocalBusinessJsonLd(
  contact?: LocalBusinessContact,
  aggregateRating?: AggregateRatingInput | null,
) {
  const telephone = contact?.phone?.trim() || undefined;
  const email = contact?.email?.trim() || SUPPORT_EMAIL;
  const street = contact?.address?.trim() || undefined;
  const rating =
    aggregateRating &&
    Number.isFinite(aggregateRating.ratingValue) &&
    aggregateRating.ratingValue > 0 &&
    Number.isFinite(aggregateRating.reviewCount) &&
    aggregateRating.reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(aggregateRating.ratingValue.toFixed(1)),
          reviewCount: Math.round(aggregateRating.reviewCount),
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["AutoRental", "LocalBusiness", "CarRental"],
    "@id": `${SITE_URL}/#organization`,
    name: SEO_SITE_NAME,
    alternateName: BRAND_ALTERNATES,
    url: SITE_URL,
    logo: absoluteUrl("/brand/rac-logo.png"),
    image: absoluteUrl("/images/hero-tarmac.webp"),
    description:
      "Airport car rental in Georgia — Kutaisi International Airport (KUT), Tbilisi (TBS) and Batumi (BUS). Verified partners, transparent pricing and airport delivery.",
    email,
    ...(telephone ? { telephone } : {}),
    priceRange: "$$",
    currenciesAccepted: "EUR, USD, GBP, GEL",
    paymentAccepted: "Credit Card, PayPal",
    areaServed: [
      { "@type": "Country", name: "Georgia" },
      {
        "@type": "Airport",
        name: "Kutaisi International Airport",
        iataCode: "KUT",
      },
      {
        "@type": "Airport",
        name: "Tbilisi International Airport",
        iataCode: "TBS",
      },
      {
        "@type": "Airport",
        name: "Batumi International Airport",
        iataCode: "BUS",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressCountry: "GE",
      addressLocality: "Kutaisi",
      ...(street ? { streetAddress: street } : {}),
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 42.1767,
      longitude: 42.4826,
    },
    ...(rating ? { aggregateRating: rating } : {}),
    sameAs: [`https://${SITE_DOMAIN}`],
  };
}

/** Per city/airport landing: AutoRental + LocalBusiness with optional AggregateOffer. */
export function buildLocationAutoRentalJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image?: string | null;
  telephone?: string | null;
  email?: string | null;
  addressLocality?: string;
  addressCountry?: string;
  latitude?: number | null;
  longitude?: number | null;
  areaServed:
    | { "@type": "Airport"; name: string; iataCode?: string }
    | { "@type": "City"; name: string }
    | { "@type": "Country"; name: string };
  lowPriceEur?: number | null;
  offerCount?: number | null;
  openingHours?: string[] | null;
}) {
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : absoluteUrl(input.image)
    : absoluteUrl("/images/hero-tarmac.webp");
  const low =
    input.lowPriceEur != null && Number.isFinite(input.lowPriceEur) && input.lowPriceEur > 0
      ? Number(input.lowPriceEur).toFixed(2)
      : undefined;
  const count =
    input.offerCount != null && Number.isFinite(input.offerCount) && input.offerCount > 0
      ? Math.round(input.offerCount)
      : undefined;
  const telephone = input.telephone?.trim() || undefined;
  const email = input.email?.trim() || SUPPORT_EMAIL;
  const hours = (input.openingHours || []).map((h) => h.trim()).filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": ["AutoRental", "LocalBusiness", "CarRental"],
    name: input.name,
    description: input.description,
    url: input.url,
    image,
    logo: absoluteUrl("/brand/rac-logo.png"),
    email,
    ...(telephone ? { telephone } : {}),
    priceRange: "$$",
    currenciesAccepted: "EUR, USD, GBP, GEL",
    paymentAccepted: "Credit Card, PayPal",
    areaServed: input.areaServed,
    address: {
      "@type": "PostalAddress",
      ...(input.addressLocality ? { addressLocality: input.addressLocality } : {}),
      ...(input.addressCountry ? { addressCountry: input.addressCountry } : {}),
    },
    ...(input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }
      : {}),
    ...(hours.length ? { openingHours: hours } : {}),
    ...(low || count
      ? {
          makesOffer: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            ...(low ? { lowPrice: low } : {}),
            ...(count ? { offerCount: count } : {}),
            availability: "https://schema.org/InStock",
            url: input.url,
          },
        }
      : {}),
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SEO_SITE_NAME,
    alternateName: BRAND_ALTERNATES,
    url: `${SITE_URL}/`,
    inLanguage: [...LOCALES],
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/cars?pickup={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildServiceJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Airport car rental in Georgia",
    serviceType: "Car rental",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: {
      "@type": "Country",
      name: "Georgia",
    },
    description:
      "Self-drive car rental with airport delivery at Kutaisi (KUT), Tbilisi (TBS) and Batumi (BUS).",
    url: SITE_URL,
  };
}

/** Homepage "popular airports and places" cards as an ItemList of their airport pages. */
export function buildPlacesItemListJsonLd(name: string, items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildProductVehicleJsonLd(input: {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  priceEur?: number | null;
  brand?: string;
  model?: string;
  url: string;
  /** ISO date (YYYY-MM-DD); defaults to ~30 days out. */
  priceValidUntil?: string;
}) {
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : absoluteUrl(input.image)
    : absoluteUrl("/brand/rac-logo.png");
  const price =
    input.priceEur != null && Number.isFinite(Number(input.priceEur))
      ? Number(input.priceEur).toFixed(2)
      : undefined;
  const validUntil =
    input.priceValidUntil ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Car"],
    name: input.name,
    description: input.description,
    image,
    brand: input.brand
      ? { "@type": "Brand", name: input.brand }
      : undefined,
    model: input.model,
    sku: input.id,
    url: input.url,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: "EUR",
      ...(price ? { price } : {}),
      priceValidUntil: validUntil,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
  };
}

/** ItemList of Product/Offer nodes for a location or search results page. */
export function buildVehicleOffersItemListJsonLd(
  name: string,
  items: Array<{
    id: string;
    name: string;
    description?: string;
    image?: string | null;
    priceEur?: number | null;
    brand?: string;
    model?: string;
    path: string;
  }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: buildProductVehicleJsonLd({
        id: item.id,
        name: item.name,
        description: item.description || item.name,
        image: item.image,
        priceEur: item.priceEur,
        brand: item.brand,
        model: item.model,
        url: absoluteUrl(item.path),
      }),
    })),
  };
}

export function buildFaqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
