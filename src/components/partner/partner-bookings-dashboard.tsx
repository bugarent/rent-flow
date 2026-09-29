"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { BookingsTable, type BookingsTableRow } from "@/components/bookings/bookings-table";
import { BookingInfoModal, type BookingInfoData } from "@/components/bookings/booking-info-modal";
import { BookingInvoiceModal } from "@/components/invoices/booking-invoice-modal";
import { formatBookingRef } from "@/lib/ids";

export type PartnerBookingDashRow = {
  id: string;
  sequentialNumber: number;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestName: string;
  guestEmail: string;
  carLabel: string;
  carImageUrl?: string | null;
  createdAt: string;
  pickupAt: string;
  dropoffAt: string;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  /** Trip total in EUR (converted on the client with live top-bar currency). */
  listTotal: number;
  /** Amount due at pick-up in EUR. */
  listDue: number;
};

export function PartnerBookingsDashboard({
  bookings,
}: {
  bookings: PartnerBookingDashRow[];
  carCount?: number;
  /** @deprecated Live currency comes from PartnerMoneyProvider. */
  currency?: string;
}) {
  const { dictionary, locale } = usePartnerLocale();
  const { pricingCurrency, fromEur } = usePartnerMoney();
  const t = dictionary.bookingsPage;
  const [items, setItems] = useState(bookings);

  useEffect(() => {
    setItems(bookings);
  }, [bookings]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<BookingInfoData | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [catalogExtras, setCatalogExtras] = useState<
    Array<{ id: string; label: string; priceEurPerDay: number }>
  >([]);

  const tableRows: BookingsTableRow[] = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const byNum = (b.sequentialNumber || 0) - (a.sequentialNumber || 0);
          if (byNum) return byNum;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .map((b) => ({
          id: b.id,
          sequentialNumber: b.sequentialNumber,
          reference: formatBookingRef(b.sequentialNumber),
          status: b.status,
          carLabel: b.carLabel,
          carImageUrl: b.carImageUrl,
          driverName:
            [b.guestFirstName, b.guestLastName].filter(Boolean).join(" ").trim() ||
            b.guestName ||
            "—",
          driverEmail: b.guestEmail,
          pickupAt: b.pickupAt,
          dropoffAt: b.dropoffAt,
          totalPrice: fromEur(b.listTotal),
          dueAtPickup: fromEur(b.listDue),
          currency: pricingCurrency,
        })),
    [items, fromEur, pricingCurrency],
  );

  const byId = useMemo(() => new Map(items.map((b) => [b.id, b])), [items]);

  const openView = (b: PartnerBookingDashRow) => {
    setError(null);
    setViewing({
      id: b.id,
      sequentialNumber: b.sequentialNumber,
      reference: formatBookingRef(b.sequentialNumber),
      status: b.status,
      pickupAt: b.pickupAt,
      dropoffAt: b.dropoffAt,
      totalPriceEur: b.totalPriceEur,
      depositPaidEur: b.depositPaidEur,
      balanceDueEur: b.balanceDueEur,
      guestFirstName: b.guestFirstName,
      guestLastName: b.guestLastName,
      guestEmail: b.guestEmail,
      extras: [],
      car: {
        make: b.carLabel.split(" ")[0] || b.carLabel,
        model: b.carLabel.split(" ").slice(1).join(" ") || "",
        imageUrl: b.carImageUrl,
      },
    });
    void (async () => {
      try {
        const res = await fetch(`/api/partners/bookings/${encodeURIComponent(b.id)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.booking) {
          const detail = data.booking as BookingInfoData & {
            catalogExtras?: Array<{ id: string; label: string; priceEurPerDay: number }>;
          };
          setCatalogExtras(detail.catalogExtras || []);
          setViewing(detail);
        }
      } catch {
        /* keep basic view */
      }
    })();
  };

  const deleteBooking = async (b: PartnerBookingDashRow) => {
    const ref = formatBookingRef(b.sequentialNumber) || b.id;
    if (!window.confirm(t.confirmDelete.replace("{ref}", ref))) return;
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/partners/bookings/${b.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.deleteFailed);
        return;
      }
      if (viewing?.id === b.id) setViewing(null);
      setItems((prev) =>
        prev.map((row) => (row.id === b.id ? { ...row, status: "UNFULFILLED" } : row)),
      );
    } catch {
      setError(t.deleteFailed);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 p-4 sm:p-6">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <BookingsTable
        rows={tableRows}
        locale={locale}
        currency={pricingCurrency}
        showFiltersButton={false}
        showAllPill={false}
        initialFilter="paid"
        showPickupDue
        onView={(row) => {
          const b = byId.get(row.id);
          if (b) openView(b);
        }}
        renderRowActions={(row) => {
          const b = byId.get(row.id);
          if (!b) return null;
          const busy = busyId === b.id;
          const partnerCancelled = b.status === "UNFULFILLED";
          const invoiceLabel =
            locale === "ka" ? "ინვოისი" : locale === "ru" ? "Инвойс" : "Invoice";
          return (
            <>
              <button
                type="button"
                onClick={() => setInvoiceId(b.id)}
                className="inline-flex h-8 items-center rounded-lg border border-[#1d6fe8]/30 bg-white px-2.5 text-xs font-bold text-[#1d6fe8] hover:bg-sky-50"
              >
                {invoiceLabel}
              </button>
              {partnerCancelled ? null : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteBooking(b)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  title={t.delete}
                  aria-label={t.delete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          );
        }}
      />

      {viewing ? (
        <BookingInfoModal
          open
          booking={viewing}
          locale={locale}
          role="partner"
          catalogExtras={catalogExtras}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {invoiceId ? (
        <BookingInvoiceModal
          bookingId={invoiceId}
          locale={locale}
          allowShare={false}
          loadUrl={`/api/partners/bookings/${encodeURIComponent(invoiceId)}/invoice?locale=${encodeURIComponent(locale)}`}
          onClose={() => setInvoiceId(null)}
        />
      ) : null}
    </div>
  );
}
