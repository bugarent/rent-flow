import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  PRIMARY_KEYWORDS,
  SITE_URL,
} from "@/lib/seo/config";
import { SITE_NAME } from "@/lib/brand";

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
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image.startsWith("http") ? image : absoluteUrl(image);

  return {
    title,
    description,
    // Next Metadata accepts string | string[]; pass the array from getPageSeo as-is.
    keywords: keywords.length ? keywords : undefined,
    alternates: {
      canonical: url,
      languages: {
        "x-default": url,
        en: url,
        ka: url,
      },
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
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
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    metadataBase: new URL(SITE_URL),
  };
}
