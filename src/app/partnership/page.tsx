import type { Metadata } from "next";
import { BusinessPartnershipLanding } from "@/components/business/business-partnership-landing";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("partnership", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/partnership",
    locale,
    keywords: page.keywords,
  });
}

export default function PartnershipPage() {
  return <BusinessPartnershipLanding />;
}
