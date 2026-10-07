/**
 * Popular airports ranking.
 * Phase 1 is hardcoded Georgia hubs. Swap `RANKING_MODE` to `booking_count`
 * and pass live aggregates when the booking table is populated.
 */
import type { AirportCardTranslations } from "@/lib/catalog/homepage-airport-i18n";

export type AirportRankingMode = "hardcoded" | "booking_count";

export const RANKING_MODE: AirportRankingMode = "hardcoded";

export type PopularAirportCard = {
  iata: string;
  name: string;
  city: string;
  image: string;
  rank: number;
  bookingCount?: number;
  /** Admin per-language titles for the homepage card. */
  translations?: AirportCardTranslations;
};

const HARDCODED_GEORGIA: PopularAirportCard[] = [
  {
    iata: "KUT",
    name: "Kutaisi International Airport (KUT)",
    city: "Kutaisi",
    rank: 1,
    image: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    iata: "TBS",
    name: "Tbilisi International Airport (TBS)",
    city: "Tbilisi",
    rank: 2,
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
  },
  {
    iata: "BUS",
    name: "Batumi International Airport (BUS)",
    city: "Batumi",
    rank: 3,
    image: "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80",
  },
];

export function getPopularAirports(bookingCounts?: { iata: string; bookingCount: number }[]): PopularAirportCard[] {
  if (RANKING_MODE === "booking_count" && bookingCounts?.length) {
    const byIata = new Map(HARDCODED_GEORGIA.map((a) => [a.iata, a]));
    return [...bookingCounts]
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .map((row, index) => {
        const base = byIata.get(row.iata);
        return {
          iata: row.iata,
          name: base?.name ?? `${row.iata} Airport`,
          city: base?.city ?? row.iata,
          image: base?.image ?? HARDCODED_GEORGIA[0].image,
          rank: index + 1,
          bookingCount: row.bookingCount,
        };
      });
  }
  return HARDCODED_GEORGIA;
}
