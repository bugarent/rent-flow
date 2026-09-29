import "server-only";

import { buildBookingInvoiceDocument } from "@/lib/invoices/build-booking-invoice";
import type { BookingInvoiceDocument } from "@/lib/invoices/types";
import { loadBookingInfoDetail } from "@/lib/server/booking-info-detail";
import { getInvoiceIssuer } from "./invoice-issuer-store";
import { listBookingRefunds } from "@/lib/server/admin-booking-refunds-store";

export async function loadBookingInvoiceDocument(
  bookingId: string,
  locale = "en",
): Promise<BookingInvoiceDocument | null> {
  const id = String(bookingId || "").trim();
  if (!id) return null;

  const booking = await loadBookingInfoDetail(id);
  if (!booking) return null;

  let issuer;
  try {
    issuer = await getInvoiceIssuer();
  } catch (err) {
    console.warn("[invoice] issuer", err);
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

  let refunds: Awaited<ReturnType<typeof listBookingRefunds>> = [];
  try {
    const all = await listBookingRefunds();
    refunds = all.filter((r) => r.bookingId === id);
  } catch (err) {
    console.warn("[invoice] refunds", err);
  }

  try {
    return buildBookingInvoiceDocument({
      booking,
      issuer,
      refunds,
      locale,
    });
  } catch (err) {
    console.warn("[invoice] build", err);
    // Minimal fallback document so the modal still opens.
    return buildBookingInvoiceDocument({
      booking,
      issuer,
      refunds: [],
      locale,
    });
  }
}
