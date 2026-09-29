"use client";

import { useAdminLocale } from "@/components/providers/admin-locale-context";
import type { AdminDictionary } from "@/lib/i18n/admin-dictionaries";

type PageKey = keyof AdminDictionary["pages"];

export function AdminPageHeading({
  page,
  className = "mb-4",
  titleClassName = "text-xl font-extrabold tracking-tight text-[#0b1f4b] sm:text-2xl",
  bodyClassName = "mt-0.5 max-w-2xl text-xs text-slate-600",
}: {
  page: PageKey;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
}) {
  const { dictionary } = useAdminLocale();
  const entry = dictionary.pages[page];
  return (
    <div className={className}>
      <h1 className={titleClassName}>{entry.title}</h1>
      {entry.body ? <p className={bodyClassName}>{entry.body}</p> : null}
    </div>
  );
}

export function AdminDeliverySearchLink() {
  const { dictionary } = useAdminLocale();
  return (
    <a
      href="/adminoperations"
      className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950 hover:border-sky-400"
    >
      <span>
        <span className="block font-extrabold">{dictionary.pages.homepageSearch.title}</span>
        <span className="text-sky-800">{dictionary.pages.homepageSearch.body}</span>
      </span>
      <span className="font-bold">{dictionary.common.open}</span>
    </a>
  );
}

export function AdminSandboxLink({ href }: { href: string }) {
  const { dictionary } = useAdminLocale();
  return (
    <a
      href={href}
      className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950"
    >
      {dictionary.pages.integrationsSandbox.title}
    </a>
  );
}

export function AdminIntegrationsBackLink({ href }: { href: string }) {
  const { dictionary } = useAdminLocale();
  return (
    <a href={href} className="text-sm font-bold text-sky-800 underline">
      ← {dictionary.pages.integrations.title}
    </a>
  );
}

export function AdminLoading({ className = "text-sm text-slate-500" }: { className?: string }) {
  const { dictionary } = useAdminLocale();
  return <p className={className}>{dictionary.common.loading}</p>;
}

export function AdminPlatformTitle() {
  const { dictionary } = useAdminLocale();
  return <h2 className="mb-6 text-2xl font-extrabold">{dictionary.pages.settings.platformTitle}</h2>;
}

export function AdminSearchCountriesHeading() {
  const { dictionary } = useAdminLocale();
  return (
    <div>
      <h2 className="text-base font-extrabold text-[#0b1f4b]">{dictionary.nav.searchCountries}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{dictionary.pages.homepageSearch.body}</p>
    </div>
  );
}
