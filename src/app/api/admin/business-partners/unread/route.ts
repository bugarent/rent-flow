import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getUnseenPendingBusinessPartnerTotal,
  listUnseenPendingBusinessPartnerIds,
  markBusinessPartnerApplicationSeen,
  markPendingBusinessPartnerApplicationsSeen,
  pruneSeenBusinessPartnerApplications,
} from "@/lib/server/admin-business-partner-unread-store";
import { listBusinessPartners } from "@/lib/server/business-partners-store";

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const partners = await listBusinessPartners();
    const pendingIds = partners.filter((p) => p.status === "PENDING").map((p) => p.id);
    const pendingSet = new Set(pendingIds);
    await pruneSeenBusinessPartnerApplications(pendingSet);
    const unreadIds = await listUnseenPendingBusinessPartnerIds(pendingIds);
    const unreadTotal = unreadIds.length;
    return NextResponse.json(
      { unreadTotal, unreadIds, pendingTotal: pendingIds.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/business-partners/unread] GET", error);
    return NextResponse.json(
      { unreadTotal: 0, unreadIds: [], pendingTotal: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** Mark applications as seen after admin opens the moderation tab / row. */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      markAll?: boolean;
      markRead?: string;
      markReadIds?: string[];
    };

    const partners = await listBusinessPartners();
    const pendingIds = partners.filter((p) => p.status === "PENDING").map((p) => p.id);

    if (body.markAll) {
      await markPendingBusinessPartnerApplicationsSeen(pendingIds);
    } else if (Array.isArray(body.markReadIds) && body.markReadIds.length) {
      await markPendingBusinessPartnerApplicationsSeen(body.markReadIds);
    } else if (body.markRead) {
      await markBusinessPartnerApplicationSeen(String(body.markRead));
    }

    const unreadTotal = await getUnseenPendingBusinessPartnerTotal(pendingIds);
    return NextResponse.json(
      { ok: true, unreadTotal },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/business-partners/unread] POST", error);
    return NextResponse.json({ error: "Failed to update unread" }, { status: 500 });
  }
}
