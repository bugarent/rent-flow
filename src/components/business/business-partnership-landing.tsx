"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Code2,
  CreditCard,
  Globe2,
  Link2,
  ThumbsUp,
  Wallet,
} from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { getBusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";
import { BusinessPartnerApplyForm } from "@/components/business/business-partner-apply-form";
import { cn } from "@/lib/utils";

const ADVANTAGE_ICONS = [Wallet, ThumbsUp, Globe2, CreditCard] as const;

export function BusinessPartnershipLanding() {
  const { locale } = usePreferences();
  const t = useMemo(() => getBusinessPartnershipCopy(locale), [locale]);
  const [integrationId, setIntegrationId] = useState(t.integrations[0]?.id ?? "link");

  const activeIntegration =
    t.integrations.find((item) => item.id === integrationId) ?? t.integrations[0];

  const scrollToApply = () => {
    document.getElementById("bp-apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-white text-[#0b1f4b]">
      {/* Hero */}
      <section className="bg-[#0b1f4b] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {t.heroBody}
            </p>
            <button
              type="button"
              onClick={scrollToApply}
              className="mt-6 inline-flex rounded-md bg-[#f97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
            >
              {t.register}
            </button>
          </div>
          <div className="rounded-2xl border border-dashed border-sky-300/50 bg-white/5 p-6 backdrop-blur">
            <p className="flex flex-wrap items-baseline gap-x-[1cm] text-lg font-bold text-sky-200">
              <span>30%</span>
              <span>40%</span>
              <span>50%</span>
            </p>
            <p className="mt-2 text-sm text-white/75">{t.programIntro}</p>
            <ul className="mt-4 space-y-2">
              {t.programPoints.slice(0, 3).map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-white/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={3} />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How to join */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t.joinTitle}</h2>
        <div className="mt-10 space-y-10">
          <JoinStep n={1} title={t.step1Title} body={t.step1Body} />
          <JoinStep n={2} title={t.step2Title} body={t.step2Body} />
          <JoinStep n={3} title={t.step3Title} body={t.step3Body} />
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-[#f3f8ff] px-4 py-12 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t.advantagesTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600">
            {t.advantagesIntro}
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.advantages.map((item, i) => {
              const Icon = ADVANTAGE_ICONS[i] ?? Wallet;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1d6fe8]/25 bg-sky-50 text-[#1d6fe8]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-sm font-extrabold">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-[#f3f8ff] px-4 py-12 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t.integrationTitle}</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {t.integrations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIntegrationId(item.id)}
                className={cn(
                  "rounded-md px-3 py-2 text-xs font-bold sm:text-sm",
                  integrationId === item.id
                    ? "bg-[#1d6fe8] text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300",
                )}
              >
                {item.title}
              </button>
            ))}
          </div>
          {activeIntegration ? (
            <div className="relative mx-auto mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-center gap-2 text-[#1d6fe8]">
                {activeIntegration.id === "api" || activeIntegration.id === "js" ? (
                  <Code2 className="h-5 w-5" />
                ) : (
                  <Link2 className="h-5 w-5" />
                )}
                <h3 className="text-lg font-extrabold">{activeIntegration.title}</h3>
              </div>
              <p className="text-center text-sm text-slate-600">{activeIntegration.body}</p>
              <ul className="mt-4 flex flex-wrap justify-center gap-3">
                {activeIntegration.points.map((point) => (
                  <li
                    key={point}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-[#f3f8ff] px-4 py-12 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t.earningsTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <EarnBox amount={t.earningsAvg} label={t.avgBooking} />
            <EarnBox
              amount={t.earningsPlatform}
              label={t.platformFee}
              note={t.platformBreakdownNote}
            />
            <EarnBox
              amount={t.earningsYours}
              label={t.yourCommission}
              note={t.partnerShareNote}
              highlight
            />
          </div>
        </div>
      </section>

      {/* Banner CTA */}
      <section className="bg-[#0b1f4b] px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="text-white">
            <p className="text-lg font-extrabold">{t.bannerTitle}</p>
            <p className="mt-1 text-sm text-white/80">{t.bannerBody}</p>
          </div>
          <button
            type="button"
            onClick={scrollToApply}
            className="inline-flex shrink-0 rounded-md bg-[#f97316] px-6 py-3 text-sm font-bold text-white hover:bg-[#ea580c]"
          >
            {t.register}
          </button>
        </div>
      </section>

      {/* Apply form */}
      <section id="bp-apply" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-12 sm:py-16">
        <h2 className="text-center text-xl font-extrabold sm:text-2xl">{t.applyTitle}</h2>
        <p className="mt-2 text-center text-sm text-slate-600">{t.applyBody}</p>
        <BusinessPartnerApplyForm t={t} />
      </section>
    </div>
  );
}

function JoinStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <span className="text-5xl font-black leading-none text-slate-200">{n}.</span>
      <div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{body}</p>
      </div>
    </div>
  );
}

function EarnBox({
  amount,
  label,
  note,
  highlight = false,
}: {
  amount: string;
  label: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white px-6 py-6 text-center shadow-sm",
        highlight ? "border-[#4da3ff]" : "border-slate-200",
      )}
    >
      {note ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1d6fe8]">{note}</p>
      ) : null}
      <p className="text-2xl font-extrabold">{amount}</p>
      <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>
    </div>
  );
}
