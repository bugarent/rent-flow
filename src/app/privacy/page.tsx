import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readPreferences } from "@/lib/server/preferences";
import { getPublicLegalPages } from "@/lib/server/legal-pages-store";
import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { legalDocument } from "@/lib/i18n/legal-documents";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("privacy", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/privacy",
    locale,
    keywords: page.keywords,
  });
}

export default async function PrivacyPage() {
  const { locale } = await readPreferences();
  const dictionary = getDictionary(locale);
  const legal = await getPublicLegalPages();
  const body = legalDocument("privacy", locale, legal.privacy.body) || dictionary.common.privacyBody;

  return (
    <LegalDocumentPage
      title={dictionary.common.privacy}
      body={body}
      fileUrl={legal.privacy.fileUrl}
    />
  );
}
