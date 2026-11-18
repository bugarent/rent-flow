import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import {
  absoluteUrl,
  cleanSitePath,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  PRIMARY_KEYWORDS,
  SITE_URL,
} from "@/lib/seo/config";
import { SEO_SITE_NAME } from "@/lib/brand";

export type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  /**
   * Override the self-canonical. Always stored without query/hash.
   * Use for car detail pages so ?startDate=&pickup= variants collapse to /cars/[id].
   */
  canonicalPath?: string;
  /** When set, used for hreflang alternates (keys like en, ka, ru, x-default). Absolute or site paths. */
  languages?: Record<string, string>;
};

export function buildPageMetadata({
  title,
  description,
  path,
  locale = "en",
  keywords = [...PRIMARY_KEYWORDS],
  image = DEFAULT_OG_IMAGE,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  noIndex = false,
  type = "website",
  canonicalPath,
  languages,
}: PageSeoInput): Metadata {
  const pagePath = cleanSitePath(path);
  const url = absoluteUrl(canonicalPath ? cleanSitePath(canonicalPath) : pagePath);
  const ogImage = image.startsWith("http") ? image : absoluteUrl(image);
  const languageMap = languages
    ? Object.fromEntries(
        Object.entries(languages).map(([key, href]) => [key, absoluteUrl(href)]),
      )
    : {
        "x-default": url,
        en: url,
        ka: url,
        ru: url,
      };

  return {
    title,
    description,
    // Next Metadata accepts string | string[]; pass the array from getPageSeo as-is.
    keywords: keywords.length ? keywords : undefined,
    alternates: {
      canonical: url,
      languages: languageMap,
    },
    openGraph: {
      type,
      siteName: SEO_SITE_NAME,
      locale: locale === "ka" ? "ka_GE" : locale === "ru" ? "ru_RU" : "en_US",
      title,
      description,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImage, alt: imageAlt }],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    metadataBase: new URL(SITE_URL),
  };
}
