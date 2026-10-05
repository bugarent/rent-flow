import { NextResponse } from "next/server";
import { ListingStatus, ReviewStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFilePendingCars } from "@/lib/server/partner-cars-store";
import { parseProfileModeration } from "@/lib/partners/profile-moderation";

function needsPartnerAction(status: string) {
  return (
    status === "PENDING" ||
    status === "PENDING_FINAL" ||
    status === "NEEDS_CORRECTION" ||
    status === "PENDING_REMODERATION"
  );
}

const PRIMARY_PARTNER_STATUSES = new Set([
  "PENDING",
  "INVITED",
  "PENDING_FINAL",
  "NEEDS_CORRECTION",
]);

function partnerAttentionAmount(status: string, unread: number) {
  const reapply = unread || 0;
  if (needsPartnerAction(status)) return Math.max(1, reapply);
  return reapply;
}

/** Directory list (Partners window) vs first-review queue (stays on Moderation). */
async function countPartners(): Promise<{ directory: number; primary: number }> {
  let directory = 0;
  let primary = 0;
  const add = (status: string, unread: number) => {
    const amount = partnerAttentionAmount(status, unread);
    if (!amount) return;
    if (PRIMARY_PARTNER_STATUSES.has(status)) primary += amount;
    else directory += amount;
  };
  try {
    const partners = await prisma.partner.findMany({
      select: { status: true, unreadReapplyCount: true },
    });
    for (const partner of partners) add(partner.status, partner.unreadReapplyCount || 0);
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/moderation/unread] partners", error);
    }
  }
  try {
    const { listFilePartnerApplications } = await import("@/lib/server/partner-applications-store");
    for (const partner of await listFilePartnerApplications()) {
      add(partner.status, partner.unreadForAdmin || 0);
    }
  } catch {
    /* ignore */
  }
  return { directory, primary };
}

async function countListings(): Promise<number> {
  const ids = new Set<string>();
  try {
    const rows = await prisma.car.findMany({
      where: {
        status: { in: [ListingStatus.PENDING, ListingStatus.PENDING_REMODERATION] },
      },
      select: { id: true },
    });
    for (const row of rows) ids.add(row.id);
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/moderation/unread] listings", error);
    }
  }
  try {
    for (const car of await listFilePendingCars()) {
      ids.add(car.id);
    }
  } catch {
    /* ignore */
  }
  return ids.size;
}

async function countProfiles(): Promise<number> {
  const ids = new Set<string>();
  try {
    const rows = await prisma.partner.findMany({
      where: {
        OR: [{ status: "PENDING_REMODERATION" }, { unreadReapplyCount: { gt: 0 } }],
      },
      select: { id: true, status: true, profileModeration: true },
    });
    for (const p of rows) {
      const moderation = parseProfileModeration(p.profileModeration);
      if (moderation.pendingChanges.length || p.status === "PENDING_REMODERATION") {
        ids.add(p.id);
      }
    }
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/moderation/unread] profiles", error);
    }
  }
  try {
    const { listAllProfileModerationFiles } = await import(
      "@/lib/server/partner-profile-moderation-store"
    );
    for (const row of await listAllProfileModerationFiles()) {
      if (row.moderation.pendingChanges.length) ids.add(row.partnerId);
    }
  } catch {
    /* ignore */
  }
  return ids.size;
}

async function countReviews(): Promise<number> {
  try {
    return await prisma.review.count({ where: { status: ReviewStatus.PENDING } });
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/moderation/unread] reviews", error);
    }
    return 0;
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const [partnerCounts, listings, profiles, reviews] = await Promise.all([
    countPartners(),
    countListings(),
    countProfiles(),
    countReviews(),
  ]);

  const partners = partnerCounts.directory + partnerCounts.primary;
  const unreadTotal = partnerCounts.primary + listings + profiles + reviews;

  return NextResponse.json(
    {
      partners,
      partnersDirectory: partnerCounts.directory,
      partnersPrimary: partnerCounts.primary,
      listings,
      profiles,
      reviews,
      unreadTotal,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
