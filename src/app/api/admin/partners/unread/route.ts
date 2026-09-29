import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { isDbOfflineError } from "@/lib/server/db-errors";
import {
  getFilePartnerUnreadTotal,
  listFilePartnerApplications,
} from "@/lib/server/partner-applications-store";

async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let unreadTotal = 0;
  let usedDb = false;

  try {
    const partners = await prisma.partner.findMany({
      select: { status: true, unreadReapplyCount: true },
    });
    usedDb = true;
    unreadTotal = partners.reduce((sum, p) => {
      const reapply = p.unreadReapplyCount || 0;
      if (p.status === "PENDING") return sum + Math.max(1, reapply);
      return sum + reapply;
    }, 0);
  } catch (error) {
    if (!isDbOfflineError(error)) {
      console.warn("[admin/partners/unread]", error);
    }
  }

  if (!usedDb) {
    try {
      unreadTotal = await getFilePartnerUnreadTotal();
    } catch {
      try {
        const file = await listFilePartnerApplications();
        unreadTotal = file.reduce((sum, p) => sum + (p.unreadForAdmin || 0), 0);
      } catch {
        unreadTotal = 0;
      }
    }
  } else {
    // Also count local-only applications when DB is up.
    try {
      unreadTotal += await getFilePartnerUnreadTotal();
    } catch {
      /* ignore */
    }
  }

  try {
    const { listAllProfileModerationFiles } = await import(
      "@/lib/server/partner-profile-moderation-store"
    );
    const pending = await listAllProfileModerationFiles();
    unreadTotal += pending.reduce(
      (sum, row) => sum + Math.max(row.moderation.unreadCount || 0, row.moderation.pendingChanges.length ? 1 : 0),
      0,
    );
  } catch {
    /* ignore */
  }

  return NextResponse.json({ unreadTotal }, { headers: { "Cache-Control": "no-store" } });
}
