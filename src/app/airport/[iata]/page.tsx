import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { localizedAirportInfo, localizedAirportTitle } from "@/lib/catalog/homepage-airport-i18n";
import { listHomepageAirports } from "@/lib/server/homepage-airports-store";
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
  const title = airport ? localizedAirportTitle(airport, locale) : iata.toUpperCase();
  return { title };
}

export default async function AirportInfoPage({
  params,
}: {
  params: Promise<{ iata: string }>;
}) {
  const { iata } = await params;
  const airport = await findAirport(iata);
  if (!airport) notFound();

  const { locale } = await readPreferences();
  const title = localizedAirportTitle(airport, locale);
  const text = localizedAirportInfo(airport, locale);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      {airport.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={airport.imageUrl}
          alt={title}
          className="mb-6 h-52 w-full rounded-2xl object-cover sm:h-72"
        />
      ) : null}
      <h1 className="text-2xl font-extrabold text-[#0b1f4b] sm:text-3xl">{title}</h1>
      <div className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
        {text || EMPTY_INFO[locale] || EMPTY_INFO.en}
      </div>
    </article>
  );
}
