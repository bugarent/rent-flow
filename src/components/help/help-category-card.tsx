import Link from "next/link";
import { FileText } from "lucide-react";
import {
  HELP_TOPIC_PREVIEW,
  type HelpCategory,
  type HelpTopic,
} from "@/lib/catalog/help-center";
import { cn } from "@/lib/utils";
import { fillHelpCount, helpAdminLabels, helpText } from "@/lib/i18n/help-center-articles";

function TopicColumn({
  topic,
  expanded,
  locale,
}: {
  topic: HelpTopic;
  expanded?: boolean;
  locale: string;
}) {
  const labels = helpAdminLabels(locale);
  const limit = expanded ? topic.articles.length : HELP_TOPIC_PREVIEW;
  const visible = topic.articles.slice(0, limit);
  const remaining = Math.max(0, topic.articles.length - HELP_TOPIC_PREVIEW);

  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-[#0b1f4b]">
        {helpText(locale, topic.title)}
      </h3>
      <ul className="space-y-2.5">
        {visible.map((article) => (
          <li key={article.id}>
            <Link
              href={`/help/${article.id}`}
              className="group inline-flex items-start gap-2 text-sm font-semibold text-[#1d6fe8] transition hover:text-[#0b4fbf] hover:underline"
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#4da3ff]" aria-hidden />
              <span className="leading-snug">{helpText(locale, article.question)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!expanded && remaining > 0 ? (
        <Link
          href={`/help/topic/${topic.id}`}
          className="mt-3 inline-block text-sm font-bold text-[#1d6fe8] hover:underline"
        >
          {fillHelpCount(labels.viewAll, topic.articles.length)}
        </Link>
      ) : null}
    </div>
  );
}

export function HelpCategoryCard({
  category,
  locale,
  className,
}: {
  category: HelpCategory;
  locale: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-extrabold tracking-tight text-[#0b1f4b] sm:text-xl">
          {helpText(locale, category.title)}
        </h2>
      </div>
      <div className="grid gap-8 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
        {category.topics.map((topic) => (
          <TopicColumn key={topic.id} topic={topic} locale={locale} />
        ))}
      </div>
    </section>
  );
}

export function HelpTopicPage({
  topic,
  categoryTitle,
  locale,
}: {
  topic: HelpTopic;
  categoryTitle: string;
  locale: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{helpText(locale, categoryTitle)}</p>
        <h1 className="mt-1 text-xl font-extrabold text-[#0b1f4b]">{helpText(locale, topic.title)}</h1>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <TopicColumn topic={topic} locale={locale} expanded />
      </div>
    </section>
  );
}
