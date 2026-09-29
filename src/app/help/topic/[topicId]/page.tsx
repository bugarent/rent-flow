import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { HelpTopicPage } from "@/components/help/help-category-card";
import { helpText } from "@/lib/i18n/help-center-articles";
import { readPreferences } from "@/lib/server/preferences";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { buildPageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ topicId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topicId } = await params;
  const [{ locale }, config] = await Promise.all([readPreferences(), getHelpCenterConfig()]);
  const path = `/help/topic/${encodeURIComponent(topicId)}`;

  for (const category of config.categories) {
    const topic = category.topics.find((t) => t.id === topicId);
    if (topic) {
      const firstAnswer = topic.articles[0]?.answer?.trim();
      return buildPageMetadata({
        title: `${helpText(locale, topic.title)} | Help | RentAirportCars`,
        description:
          (firstAnswer ? helpText(locale, firstAnswer).slice(0, 160) : "") ||
          `${helpText(locale, topic.title)} — Help Center topics for airport car rental on RentAirportCars.`,
        path,
        locale,
      });
    }
  }

  return buildPageMetadata({
    title: "Help | RentAirportCars",
    description: "Help Center topics for airport car rental bookings and support.",
    path,
    locale,
    noIndex: true,
  });
}

export default async function HelpTopicAllPage({ params }: Props) {
  const { topicId } = await params;
  const [{ locale }, config] = await Promise.all([readPreferences(), getHelpCenterConfig()]);
  const dictionary = getDictionary(locale);

  let found: { categoryTitle: string; topic: (typeof config.categories)[0]["topics"][0] } | null =
    null;
  for (const category of config.categories) {
    const topic = category.topics.find((t) => t.id === topicId);
    if (topic) {
      found = { categoryTitle: category.title, topic };
      break;
    }
  }
  if (!found) notFound();

  return (
    <div className="bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 text-xs text-slate-500">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-100"
          >
            ← {dictionary.helpCenter.backToHelp}
          </Link>
          <span className="hidden sm:inline">
            <Link href="/help" className="font-semibold text-[#1d6fe8] hover:underline">
              {dictionary.helpCenter.title}
            </Link>
            <span className="mx-1.5 text-slate-300">›</span>
            <span className="text-slate-600">{helpText(locale, found.topic.title)}</span>
          </span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <HelpTopicPage topic={found.topic} categoryTitle={found.categoryTitle} locale={locale} />
      </div>
    </div>
  );
}
