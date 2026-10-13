import type { Metadata } from "next";
import { listSearchableDeliveryLocations } from "@/lib/server/delivery-locations";
import { groupActiveLocationsByCountry } from "@/lib/locations/group-active-countries";
import { LocationsBrowser } from "@/components/locations/locations-browser";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("locations", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/locations",
    locale,
    keywords: page.keywords,
  });
}

export default async function LocationsPage() {
  const active = await listSearchableDeliveryLocations();
  const countries = groupActiveLocationsByCountry(active);

  return <LocationsBrowser countries={countries} />;
}
