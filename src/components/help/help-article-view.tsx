"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ThumbsDown, ThumbsUp } from "lucide-react";
import type { HelpArticle } from "@/lib/catalog/help-center";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { ContactCta } from "@/components/contact/contact-cta";
import { usePreferences } from "@/components/providers/preferences-context";
import { helpAdminLabels, helpText } from "@/lib/i18n/help-center-articles";

export function HelpArticleView({
  article,
  trending,
}: {
  article: HelpArticle;
  trending: HelpArticle[];
}) {
  const { locale } = usePreferences();
  const labels = helpAdminLabels(locale);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
              {helpText(locale, article.answer)}
            </div>
            <p className="mt-6 text-sm text-slate-600">
              {labels.stillNeed}{" "}
              <ContactCta
                email={SUPPORT_EMAIL}
                label={labels.contactUs}
                className="font-semibold text-[#1d6fe8] hover:underline"
              />
              .
            </p>
          </article>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-[#0b1f4b]">{labels.helpful}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={labels.yes}
                aria-pressed={feedback === "up"}
                onClick={() => setFeedback("up")}
                className={`rounded-lg border p-2 transition ${
                  feedback === "up"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={labels.no}
                aria-pressed={feedback === "down"}
                onClick={() => setFeedback("down")}
                className={`rounded-lg border p-2 transition ${
                  feedback === "down"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-extrabold text-[#0b1f4b]">{labels.trendingArticles}</h2>
          <ul className="space-y-2.5">
            {trending
              .filter((a) => a.id !== article.id)
              .slice(0, 8)
              .map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/help/${item.id}`}
                    className="inline-flex items-start gap-2 text-sm font-semibold text-[#1d6fe8] hover:underline"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#4da3ff]" aria-hidden />
                    <span className="leading-snug">{helpText(locale, item.question)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
