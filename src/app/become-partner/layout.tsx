import type { Metadata } from "next";
import { readPreferences } from "@/lib/server/preferences";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("becomePartner", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/become-partner",
    locale,
  });
}

export default function BecomePartnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
