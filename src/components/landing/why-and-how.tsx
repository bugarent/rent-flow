"use client";

import { resolveHomepageInfoIcon } from "@/lib/catalog/homepage-info-icons";
import type { HomepageInfoContent } from "@/lib/catalog/homepage-info";
import { usePreferences } from "@/components/providers/preferences-context";
import { knownText } from "@/lib/i18n/known-record-text";

function showRecord(locale: string, canonical: string, map?: Partial<Record<string, string>>) {
  const saved = map?.[locale]?.trim();
  if (saved) return saved;
  return knownText(locale, canonical);
}

const WHY_ACCENTS = [
  "border-sky-200 bg-gradient-to-b from-sky-50 to-white",
  "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white",
  "border-amber-200 bg-gradient-to-b from-amber-50 to-white",
] as const;

const HOW_ACCENTS = [
  "border-indigo-200 bg-gradient-to-b from-indigo-50 to-white",
  "border-violet-200 bg-gradient-to-b from-violet-50 to-white",
  "border-cyan-200 bg-gradient-to-b from-cyan-50 to-white",
  "border-teal-200 bg-gradient-to-b from-teal-50 to-white",
] as const;

export function WhyChooseUsPanel({ content }: { content: HomepageInfoContent }) {
  const { locale } = usePreferences();
  const why = content.blocks.filter((b) => b.section === "why").sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="why-choose-us" className="scroll-mt-24 px-3 pb-4 pt-8 sm:px-4 sm:pb-5 sm:pt-10 md:pb-6 md:pt-12">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-[#0b1f4b]/15 bg-gradient-to-br from-[#0b1f4b] via-[#123a6b] to-[#0b1f4b] p-4 shadow-[0_16px_48px_rgba(11,31,75,0.28)] sm:p-6 md:p-8">
          <div
            className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-sky-400/25 blur-3xl"
            aria-hidden
          />
          <h2 className="relative mb-5 text-center text-2xl font-extrabold text-white sm:mb-7 sm:text-3xl">
            {showRecord(locale, content.whyTitle, content.whyTitleI18n)}
          </h2>
          <div className="relative grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            {why.map((item, index) => {
              const Icon = resolveHomepageInfoIcon(item.iconKey);
              const accent = WHY_ACCENTS[index % WHY_ACCENTS.length];
              return (
                <article
                  key={item.id}
                  className={`flex min-w-0 flex-col items-center rounded-2xl border ${accent} px-4 py-5 text-center shadow-sm sm:px-5 sm:py-6`}
                >
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1d6fe8] bg-white text-[#1d6fe8] sm:h-14 sm:w-14">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <h3 className="mb-1.5 text-base font-bold text-[#0b1f4b] sm:text-lg">{showRecord(locale, item.title, item.titleI18n)}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{showRecord(locale, item.body, item.bodyI18n)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksPanel({ content }: { content: HomepageInfoContent }) {
  const { locale } = usePreferences();
  const how = content.blocks.filter((b) => b.section === "how").sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section id="how-it-works" className="scroll-mt-24 bg-slate-50 px-3 pb-8 pt-2 sm:px-4 sm:pb-10 sm:pt-3 md:pb-12 md:pt-4">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-6 md:p-8">
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl"
            aria-hidden
          />
          <h2 className="relative mb-5 text-center text-2xl font-extrabold text-[#0b1f4b] sm:mb-7 sm:text-3xl">
            {showRecord(locale, content.howTitle, content.howTitleI18n)}
          </h2>
          <ol className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {how.map((item, index) => {
              const Icon = resolveHomepageInfoIcon(item.iconKey);
              const accent = HOW_ACCENTS[index % HOW_ACCENTS.length];
              return (
                <li
                  key={item.id}
                  className={`min-w-0 rounded-2xl border ${accent} p-4 text-center shadow-sm sm:p-5`}
                >
                  <span className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1d6fe8] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <Icon className="mx-auto mb-2.5 h-6 w-6 text-[#1d6fe8]" aria-hidden />
                  <h3 className="text-base font-bold text-[#0b1f4b]">{showRecord(locale, item.title, item.titleI18n)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{showRecord(locale, item.body, item.bodyI18n)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
