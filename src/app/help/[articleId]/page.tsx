import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  findHelpArticle,
  trendingHelpArticles,
} from "@/lib/catalog/help-center";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { HelpArticleView } from "@/components/help/help-article-view";
import { HelpBackButton } from "@/components/help/help-back-button";
import { JsonLd } from "@/components/seo/json-ld";
import { readPreferences } from "@/lib/server/preferences";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildFaqPageJsonLd } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { helpText } from "@/lib/i18n/help-center-articles";

type Props = { params: Promise<{ articleId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { articleId } = await params;
  const [{ locale }, config] = await Promise.all([readPreferences(), getHelpCenterConfig()]);
  const found = findHelpArticle(config, articleId);
  const path = `/help/${encodeURIComponent(articleId)}`;
  if (!found) {
    return buildPageMetadata({
      title: "Help | RentAirportCars",
      description: "Help Center article",
      path,
      locale,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `${helpText(locale, found.article.question)} | Help | RentAirportCars`,
    description: helpText(locale, found.article.answer).slice(0, 160),
    path,
    locale,
    type: "article",
  });
}

export default async function HelpArticlePage({ params }: Props) {
  const { articleId } = await params;
  const [{ locale }, config] = await Promise.all([readPreferences(), getHelpCenterConfig()]);
  const dictionary = getDictionary(locale);
  const found = findHelpArticle(config, articleId);
  if (!found) notFound();

  const trending = trendingHelpArticles(config);
  const faqLd = buildFaqPageJsonLd([
    { question: helpText(locale, found.article.question), answer: helpText(locale, found.article.answer) },
  ]);

  return (
    <div className="bg-slate-100">
      <JsonLd data={faqLd} />
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-500">
          <Link href="/help" className="font-semibold text-[#1d6fe8] hover:underline">
            {dictionary.helpCenter.title}
          </Link>
          <span className="mx-1.5 text-slate-300">›</span>
          <span className="text-slate-600">{helpText(locale, found.article.question)}</span>
        </div>
      </div>

      <div className="bg-[#0b1f4b]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <div className="mb-5 flex justify-start sm:mb-6">
            <HelpBackButton label={dictionary.helpCenter.backToHelp} />
          </div>
          <h1 className="mx-auto max-w-3xl text-center text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">
            {helpText(locale, found.article.question)}
          </h1>
        </div>
      </div>

      <div className="pt-8">
        <HelpArticleView article={found.article} trending={trending} />
      </div>
    </div>
  );
}
