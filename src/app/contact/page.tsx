import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPublicFooterContact } from "@/lib/server/footer-contact-store";
import { readPreferences } from "@/lib/server/preferences";
import { ContactPageContent } from "@/components/contact/contact-page-content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("contact", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/contact",
    locale,
    keywords: page.keywords,
  });
}

export default async function ContactPage() {
  const { locale } = await readPreferences();
  const dictionary = getDictionary(locale);
  const contact = await getPublicFooterContact();

  return (
    <ContactPageContent
      title={dictionary.common.contact}
      email={contact.email}
      phone={contact.phone}
    />
  );
}
