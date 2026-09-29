import { NextResponse } from "next/server";
import { getPartnerSession } from "@/lib/auth/sessions";
import { loadBookingInvoiceDocument } from "@/lib/server/load-booking-invoice";
import { createInvoiceShare } from "@/lib/server/invoice-share-store";
import {
  assertPartnerOwnsBooking,
  resolvePartnerId,
} from "@/lib/server/partner-booking-access";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getPartnerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const partnerId = await resolvePartnerId(session);
    if (!partnerId) {
      return NextResponse.json({ error: "Partner profile required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const owned = await assertPartnerOwnsBooking(id, partnerId, session.user);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const locale = url.searchParams.get("locale") || "ka";
    const document = await loadBookingInvoiceDocument(id, locale);
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let shareUrl: string | null = null;
    try {
      const share = await createInvoiceShare({
        bookingId: id,
        createdBy: String(session.user.email || "partner"),
      });
      shareUrl = `${url.origin}/invoice/${share.token}?locale=${encodeURIComponent(locale)}`;
    } catch (err) {
      console.warn("[partners/bookings/invoice] share", err);
    }

    return NextResponse.json(
      { document, shareUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[partners/bookings/invoice] GET", error);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}
