import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { loadBookingInvoiceDocument } from "@/lib/server/load-booking-invoice";
import { getInvoiceShareByBookingId } from "@/lib/server/invoice-share-store";

async function requireAdmin() {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const locale = new URL(req.url).searchParams.get("locale") || "ka";
    const document = await loadBookingInvoiceDocument(id, locale);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let shareUrl: string | null = null;
    try {
      const share = await getInvoiceShareByBookingId(id);
      if (share) shareUrl = `${new URL(req.url).origin}/invoice/${share.token}`;
    } catch {
      /* optional */
    }
    return NextResponse.json(
      { document, shareUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/bookings/invoice] GET", error);
    return NextResponse.json(
      { error: "Failed to load invoice" },
      { status: 500 },
    );
  }
}
