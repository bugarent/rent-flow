import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { loadBookingInvoiceDocument } from "@/lib/server/load-booking-invoice";
import { getInvoiceShareByBookingId } from "@/lib/server/invoice-share-store";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { buildBookingInvoiceDocument } from "@/lib/invoices/build-booking-invoice";
import { getInvoiceIssuer } from "@/lib/server/invoice-issuer-store";

async function requireAdmin() {
  const session = await getAdminSession();
  return Boolean(session?.user);
}

/** Flat admin invoice endpoint — avoids nested [id]/invoice routing issues. */
export async function GET(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const bookingId = String(url.searchParams.get("bookingId") || "").trim();
    const locale = url.searchParams.get("locale") || "ka";
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    let document = null;
    try {
      document = await loadBookingInvoiceDocument(bookingId, locale);
    } catch (err) {
      console.warn("[admin/invoice] full build failed, trying minimal", err);
    }

    if (!document) {
      const booking = await loadBookingInfoDetail(bookingId);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      let issuer;
      try {
        issuer = await getInvoiceIssuer();
      } catch {
        issuer = {
          legalName: "Rent Airport Cars",
          tradingName: "rentairportcars.com",
          email: "info@rentairportcars.com",
          phone: "",
          address: "",
          taxId: "",
          bankName: "",
          iban: "",
          bic: "",
          logoUrl: "/brand/logo-mark.png?v=4",
          website: "https://rentairportcars.com",
        };
      }
      document = buildBookingInvoiceDocument({
        booking,
        issuer,
        refunds: [],
        locale,
      });
    }

    let shareUrl: string | null = null;
    try {
      const share = await getInvoiceShareByBookingId(bookingId);
      if (share) shareUrl = `${url.origin}/invoice/${share.token}`;
    } catch {
      /* optional */
    }

    return NextResponse.json(
      { document, shareUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/invoice] GET", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load invoice" },
      { status: 500 },
    );
  }
}
