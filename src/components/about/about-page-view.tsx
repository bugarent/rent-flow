"use client";

import { ContactCta } from "@/components/contact/contact-cta";

const STORY_IMAGE = "/images/about/story.jpg";
const SUPPORT_IMAGE = "/images/about/support.jpg";
const HERO_IMAGE = "/images/about/hero.jpg";

export function AboutPageView({
  title,
  heroLead,
  story,
  support,
  contactBody,
  contactLabel,
  email,
  phone,
}: {
  title: string;
  heroLead: string;
  story: string;
  support: string;
  contactBody: string;
  contactLabel: string;
  email?: string;
  phone?: string;
}) {
  return (
    <div className="bg-slate-50">
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0b1f4b]/92 via-[#0b1f4b]/78 to-[#123a6b]/70"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20 about-fade-up">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">{heroLead}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 about-fade-up about-fade-up-delay-1">
          <div>
            <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-7">{story}</p>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(11,31,75,0.14)] ring-1 ring-[#0b1f4b]/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={STORY_IMAGE}
              alt=""
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 lg:grid-cols-2 lg:gap-12 about-fade-up about-fade-up-delay-2">
          <div className="order-2 overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(11,31,75,0.14)] ring-1 ring-[#0b1f4b]/10 lg:order-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SUPPORT_IMAGE}
              alt=""
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-7">{support}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-14 about-fade-up about-fade-up-delay-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1f4b] via-[#123a6b] to-[#0b1f4b] px-6 py-8 text-center shadow-[0_16px_48px_rgba(11,31,75,0.28)] sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-sky-400/25 blur-3xl"
            aria-hidden
          />
          <p className="relative text-base font-semibold text-white sm:text-lg">{contactBody}</p>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <ContactCta
              email={email}
              phone={phone}
              label={contactLabel}
              className="inline-flex rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
