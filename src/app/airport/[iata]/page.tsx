import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localizedAirportInfo, localizedAirportTitle } from "@/lib/catalog/homepage-airport-i18n";
import { withAutoTitleTranslations } from "@/lib/catalog/airport-card-auto-titles";
import {
  ensureAirportPrefaceTranslations,
  listHomepageAirports,
} from "@/lib/server/homepage-airports-store";
import { SiteImage } from "@/components/ui/site-image";
import { readPreferences } from "@/lib/server/preferences";

export const dynamic = "force-dynamic";

const EMPTY_INFO: Record<string, string> = {
  en: "Information has not been added yet.",
  ka: "ინფორმაცია ჯერ არ არის დამატებული.",
  ru: "Информация ещё не добавлена.",
};

async function findAirport(iata: string) {
  const code = decodeURIComponent(iata).trim().toUpperCase();
  if (!code) return null;
  const rows = await listHomepageAirports();
  return rows.find((row) => row.iata.toUpperCase() === code) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iata: string }>;
}): Promise<Metadata> {
  const { iata } = await params;
  const airport = await findAirport(iata);
  const { locale } = await readPreferences();
  const title = airport ? localizedAirportTitle(withAutoTitleTranslations(airport), locale) : iata.toUpperCase();
  return { title };
}

export default async function AirportInfoPage({
  params,
}: {
  params: Promise<{ iata: string }>;
}) {
  const { iata } = await params;
  const found = await findAirport(iata);
  if (!found) notFound();

  const { locale } = await readPreferences();
  const airport = await ensureAirportPrefaceTranslations(found, locale, { onlyPreferred: true });
  const title = localizedAirportTitle(withAutoTitleTranslations(airport), locale);
  const text = localizedAirportInfo(airport, locale);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      {airport.imageUrl ? (
        <div className="relative mb-6 h-52 w-full overflow-hidden rounded-2xl sm:h-72">
          <SiteImage
            src={airport.imageUrl}
            alt={title}
            fill
            sizes="(max-width: 800px) 100vw, 768px"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      ) : null}
      <h1 className="text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">{title}</h1>
      <div className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
        {text || EMPTY_INFO[locale] || EMPTY_INFO.en}
      </div>
    </article>
  );
}
