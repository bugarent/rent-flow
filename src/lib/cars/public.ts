import { publicListingStatusWhere, publicPartnerWhere } from "@/lib/cars/listing-visibility";

/**
 * Public car payload. CarPassport is a separate relation and MUST NOT be included.
 */
export const publicCarInclude = {
  photos: { orderBy: { sortOrder: "asc" as const } },
  partner: {
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      status: true,
      googleMapsUrl: true,
      reviews: {
        where: { status: "APPROVED" as const },
        select: { averageRating: true },
      },
      locations: {
        include: {
          airport: { select: { iata: true, name: true, isHub: true } },
        },
      },
    },
  },
  extras: {
    include: { extraService: true },
  },
};

export const publicListingWhere = {
  ...publicListingStatusWhere,
  partner: publicPartnerWhere,
};

export function aggregateRating(reviews: { averageRating: number }[]) {
  if (reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.averageRating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function formatReviewBadge(average: number, count: number, reviewsLabel: string) {
  if (count === 0) return null;
  return `★ ${average.toFixed(1)} (${count} ${reviewsLabel})`;
}

export function assertNoPassport<T extends object>(payload: T) {
  if ("passport" in payload && payload.passport != null) {
    throw new Error("Car passport leaked into a public response");
  }
  return payload;
}
