import { SEO_SITE_NAME, SITE_NAME, SITE_DOMAIN, SUPPORT_EMAIL } from "@/lib/brand";
import { SITE_URL, absoluteUrl } from "@/lib/seo/config";

export type LocalBusinessContact = {
  phone?: string;
  email?: string;
  address?: string;
};

/** Organization + AutoRental (CarRental) focused on Georgian airports / Kutaisi. */
export function buildLocalBusinessJsonLd(contact?: LocalBusinessContact) {
  const telephone = contact?.phone?.trim() || undefined;
  const email = contact?.email?.trim() || SUPPORT_EMAIL;
  const street = contact?.address?.trim() || undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["AutoRental", "LocalBusiness", "CarRental"],
    "@id": `${SITE_URL}/#organization`,
    name: SEO_SITE_NAME,
    alternateName: ["Rent Airport Cars", "RentAirportCars", SITE_NAME],
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/images/hero-tarmac.jpg"),
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
    sameAs: [`https://${SITE_DOMAIN}`],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SEO_SITE_NAME,
    alternateName: ["Rent Airport Cars", "RentAirportCars", SITE_NAME],
    url: SITE_URL,
    inLanguage: ["en", "ka", "ru"],
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
}) {
  const image = input.image
    ? input.image.startsWith("http")
      ? input.image
      : absoluteUrl(input.image)
    : absoluteUrl("/logo.png");

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
      price: input.priceEur != null ? Number(input.priceEur).toFixed(2) : undefined,
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE_URL}/#organization` },
    },
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
