import { NextResponse } from "next/server";
import { getInvoiceShareByToken } from "@/lib/server/invoice-share-store";
import { loadBookingInvoiceDocument } from "@/lib/server/load-booking-invoice";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const share = await getInvoiceShareByToken(token);
  if (!share) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const locale = new URL(req.url).searchParams.get("locale") || "en";
  const document = await loadBookingInvoiceDocument(share.bookingId, locale);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { document },
    { headers: { "Cache-Control": "no-store" } },
  );
}
