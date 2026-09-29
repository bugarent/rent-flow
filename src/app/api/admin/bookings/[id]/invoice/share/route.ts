import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { createInvoiceShare } from "@/lib/server/invoice-share-store";

async function requireAdmin() {
  const session = await getAdminSession();
  return session;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const booking = await loadBookingInfoDetail(id);
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const share = await createInvoiceShare({
    bookingId: id,
    createdBy: String(session.user.email || session.user.name || "admin"),
  });
  const origin = new URL(req.url).origin;
  const shareUrl = `${origin}/invoice/${share.token}`;
  return NextResponse.json(
    { token: share.token, shareUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
