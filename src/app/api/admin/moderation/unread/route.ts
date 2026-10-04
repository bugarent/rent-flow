import { NextResponse } from "next/server";
import { ListingStatus, ReviewStatus } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { getFilePartnerUnreadTotal } from "@/lib/server/partner-applications-store";
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

async function countPartners(): Promise<number> {
  let total = 0;
  try {
    const partners = await prisma.partner.findMany({
      select: { status: true, unreadReapplyCount: true },
    });
    total = partners.reduce((sum, p) => {
      const reapply = p.unreadReapplyCount || 0;
      if (needsPartnerAction(p.status)) return sum + Math.max(1, reapply);
      return sum + reapply;
    }, 0);
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/moderation/unread] partners", error);
    }
  }
  try {
    total += await getFilePartnerUnreadTotal();
  } catch {
    /* ignore */
  }
  return total;
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

  const [partners, listings, profiles, reviews] = await Promise.all([
    countPartners(),
    countListings(),
    countProfiles(),
    countReviews(),
  ]);

  const unreadTotal = partners + listings + profiles + reviews;

  return NextResponse.json(
    { partners, listings, profiles, reviews, unreadTotal },
    { headers: { "Cache-Control": "no-store" } },
  );
}
