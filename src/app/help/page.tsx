import type { Metadata } from "next";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { HelpCategoryCard } from "@/components/help/help-category-card";
import { readPreferences } from "@/lib/server/preferences";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPageSeo } from "@/lib/seo/pages";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const page = getPageSeo("help", locale);
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: "/help",
    locale,
    keywords: page.keywords,
  });
}

export default async function HelpCenterPage() {
  const [{ locale }, config] = await Promise.all([readPreferences(), getHelpCenterConfig()]);
  const dictionary = getDictionary(locale);

  return (
    <div className="bg-slate-100">
      <div className="border-b border-slate-200 bg-[#0b1f4b]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {dictionary.helpCenter.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            {dictionary.nav.help}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:py-10">
        {config.categories.map((category) => (
          <HelpCategoryCard key={category.id} category={category} locale={locale} />
        ))}
      </div>
    </div>
  );
}
