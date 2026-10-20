import { NextResponse } from "next/server";
import { missingAirportInfoLocales, missingAirportTitleLocales } from "@/lib/catalog/homepage-airport-i18n";
import { ensureAirportPrefaceTranslations, listHomepageAirports } from "@/lib/server/homepage-airports-store";

export const maxDuration = 300;

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "dev only" }, { status: 404 });
  const rows = [];
  for (const card of await listHomepageAirports()) {
    const before = { titles: missingAirportTitleLocales(card).length, info: missingAirportInfoLocales(card).length };
    const done = await ensureAirportPrefaceTranslations(card);
    rows.push({
      iata: card.iata,
      before,
      after: { titles: missingAirportTitleLocales(done).length, info: missingAirportInfoLocales(done).length },
    });
  }
  return NextResponse.json(rows);
}
