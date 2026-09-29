import type { Metadata } from "next";
import { readPreferences } from "@/lib/server/preferences";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { AboutPageView } from "@/components/about/about-page-view";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { getPublicFooterContact } from "@/lib/server/footer-contact-store";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("about", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/about",
    locale,
    keywords: page.keywords,
  });
}

export default async function AboutPage() {
  const { locale } = await readPreferences();
  const dictionary = getDictionary(locale);
  const contact = await getPublicFooterContact();
  const [story, support] =
    dictionary.common.aboutParagraphs.length >= 2
      ? dictionary.common.aboutParagraphs
      : [dictionary.common.aboutBody, dictionary.common.aboutBody];

  return (
    <AboutPageView
      title={dictionary.common.aboutUs}
      heroLead={dictionary.common.aboutHeroLead}
      story={story}
      support={support}
      contactBody={dictionary.common.contactBody}
      contactLabel={dictionary.common.contact}
      email={contact.email || SUPPORT_EMAIL}
      phone={contact.phone}
    />
  );
}
