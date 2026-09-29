"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { BookingsTable, type BookingsTableRow } from "@/components/bookings/bookings-table";
import { BookingInfoModal, type BookingInfoData } from "@/components/bookings/booking-info-modal";
import { BookingInvoiceModal } from "@/components/invoices/booking-invoice-modal";
import { formatBookingRef } from "@/lib/ids";
import { cn, convertFromEur } from "@/lib/utils";
import { earliestPickupLocalInput } from "@/lib/bookings/lead-time";

export type AdminBookingDashRow = {
  id: string;
  sequentialNumber: number;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestName: string;
  guestEmail: string;
  carLabel: string;
  carImageUrl?: string | null;
  partnerLabel: string;
  createdAt: string;
  pickupAt: string;
  dropoffAt: string;
  totalPriceEur: number;
  depositPaidEur: number;
  businessPartnerCode?: string;
};

type EditDraft = {
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  pickupAt: string;
  dropoffAt: string;
  depositPaidEur: string;
  totalPriceEur: string;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function refClass(status: string) {
  if (status === "COMPLETED") {
    return "rounded-md border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-emerald-800";
  }
  if (status === "UNFULFILLED") {
    return "rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-amber-900";
  }
  if (status === "CANCELLED") return "text-rose-600";
  if (status === "PENDING") return "text-amber-500";
  if (status === "CONFIRMED") return "text-emerald-600";
  return "text-slate-800";
}

function bookingSignature(rows: AdminBookingDashRow[]) {
  return rows
    .map(
      (b) =>
        `${b.id}:${b.createdAt}:${b.status}:${b.totalPriceEur}:${b.depositPaidEur}:${b.pickupAt}:${b.dropoffAt}:${b.businessPartnerCode || ""}`,
    )
    .join("|");
}

export function AdminBookingsDashboard({ bookings: initialBookings }: { bookings: AdminBookingDashRow[] }) {
  const { dictionary, locale, currency, fxRates } = useAdminLocale();
  const t = dictionary.bookingsList;
  const router = useRouter();

  const [bookings, setBookings] = useState(initialBookings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminBookingDashRow | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [viewing, setViewing] = useState<BookingInfoData | null>(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
  const [partnerCancelledIds, setPartnerCancelledIds] = useState<string[]>([]);
  const markedReadRef = useRef(false);

  const acknowledgeBooking = (id: string) => {
    setPartnerCancelledIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev));
    void fetch("/api/admin/bookings/unread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markRead: id }),
    }).catch(() => {
      /* best-effort */
    });
  };

  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    let cancelled = false;
    let knownIds = new Set(initialBookings.map((b) => b.id));

    const markAllRead = async () => {
      try {
        await fetch("/api/admin/bookings/unread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markAll: true }),
        });
      } catch {
        /* best-effort */
      }
    };

    const loadAttention = async () => {
      try {
        const res = await fetch("/api/admin/bookings/unread", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !Array.isArray(data.partnerCancelledIds)) return;
        setPartnerCancelledIds(data.partnerCancelledIds.map(String));
      } catch {
        /* ignore */
      }
    };

    const loadList = async () => {
      try {
        const res = await fetch("/api/admin/bookings", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !Array.isArray(data.bookings)) return;
        const next = data.bookings as AdminBookingDashRow[];
        const nextIds = new Set(next.map((b) => b.id));
        const hasNew = [...nextIds].some((id) => !knownIds.has(id));
        knownIds = nextIds;
        setBookings((prev) => {
          if (bookingSignature(prev) === bookingSignature(next)) return prev;
          return next;
        });
        if (hasNew || !markedReadRef.current) {
          markedReadRef.current = true;
          await markAllRead();
        }
      } catch {
        /* ignore */
      }
    };

    void markAllRead().then(() => {
      markedReadRef.current = true;
      void loadAttention();
    });
    void loadList();
    const timer = window.setInterval(() => {
      void loadList();
      void loadAttention();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll once per mount; initial rows seed knownIds
  }, []);

  const tableRows: BookingsTableRow[] = useMemo(
    () =>
      [...bookings]
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
          totalPrice: convertFromEur(b.totalPriceEur, currency, fxRates),
          currency,
          businessPartnerCode: b.businessPartnerCode || "",
        })),
    [bookings, currency, fxRates],
  );

  const byId = useMemo(() => new Map(bookings.map((b) => [b.id, b])), [bookings]);

  const openEdit = (b: AdminBookingDashRow) => {
    setError(null);
    setEditing(b);
    setDraft({
      guestFirstName: b.guestFirstName || "",
      guestLastName: b.guestLastName || "",
      guestEmail: b.guestEmail || "",
      pickupAt: toLocalInputValue(b.pickupAt),
      dropoffAt: toLocalInputValue(b.dropoffAt),
      depositPaidEur: String(b.depositPaidEur ?? 0),
      totalPriceEur: String(b.totalPriceEur ?? 0),
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!editing || !draft) return;
    setBusyId(editing.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestFirstName: draft.guestFirstName.trim(),
          guestLastName: draft.guestLastName.trim(),
          guestEmail: draft.guestEmail.trim(),
          pickupAt: draft.pickupAt ? new Date(draft.pickupAt).toISOString() : undefined,
          dropoffAt: draft.dropoffAt ? new Date(draft.dropoffAt).toISOString() : undefined,
          depositPaidEur: Number(draft.depositPaidEur) || 0,
          totalPriceEur: Number(draft.totalPriceEur) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.saveFailed);
        return;
      }
      closeEdit();
      router.refresh();
    } catch {
      setError(t.saveFailed);
    } finally {
      setBusyId(null);
    }
  };

  const deleteBooking = async (b: AdminBookingDashRow) => {
    const ref = formatBookingRef(b.sequentialNumber) || b.id;
    if (!window.confirm(t.confirmDelete.replace("{ref}", ref))) return;
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.deleteFailed);
        return;
      }
      if (editing?.id === b.id) closeEdit();
      router.refresh();
    } catch {
      setError(t.deleteFailed);
    } finally {
      setBusyId(null);
    }
  };

  const markUnfulfilled = async (b: AdminBookingDashRow) => {
    const ref = formatBookingRef(b.sequentialNumber) || b.id;
    if (!window.confirm(t.confirmUnfulfilled.replace("{ref}", ref))) return;
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "UNFULFILLED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.markUnfulfilledFailed);
        return;
      }
      if (editing?.id === b.id) closeEdit();
      router.refresh();
    } catch {
      setError(t.markUnfulfilledFailed);
    } finally {
      setBusyId(null);
    }
  };

  const inputClass =
    "h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100";

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <BookingsTable
        rows={tableRows}
        locale={locale}
        currency={currency}
        showAllPill={false}
        showFiltersButton={false}
        initialFilter="paid"
        attentionRowIds={partnerCancelledIds}
        attentionFilter="empty"
        onView={(row) => {
          const b = byId.get(row.id);
          if (!b) return;
          acknowledgeBooking(b.id);
          setViewing({
            id: b.id,
            sequentialNumber: b.sequentialNumber,
            reference: formatBookingRef(b.sequentialNumber),
            status: b.status,
            pickupAt: b.pickupAt,
            dropoffAt: b.dropoffAt,
            totalPriceEur: b.totalPriceEur,
            depositPaidEur: b.depositPaidEur,
            balanceDueEur: Math.max(0, b.totalPriceEur - b.depositPaidEur),
            guestFirstName: b.guestFirstName,
            guestLastName: b.guestLastName,
            guestEmail: b.guestEmail,
            extras: [],
            car: {
              make: b.carLabel.split(" ")[0] || b.carLabel,
              model: b.carLabel.split(" ").slice(1).join(" ") || "",
              imageUrl: b.carImageUrl,
            },
            partner: { companyName: b.partnerLabel },
            pickupAirport: { iata: "—", city: "—", name: "—" },
            dropoffAirport: { iata: "—", city: "—", name: "—" },
          });
          void (async () => {
            try {
              const res = await fetch(`/api/admin/bookings/${encodeURIComponent(b.id)}`);
              const data = await res.json().catch(() => ({}));
              if (res.ok && data.booking) setViewing(data.booking as BookingInfoData);
            } catch {
              /* keep basic view */
            }
          })();
        }}
        renderRowActions={(row) => {
          const b = byId.get(row.id);
          if (!b) return null;
          const busy = busyId === b.id;
          const detailsLabel = locale === "ka" ? "დეტალები" : locale === "ru" ? "Детали" : "Details";
          const invoiceLabel = locale === "ka" ? "ინვოისი" : locale === "ru" ? "Инвойс" : "Invoice";
          return (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  acknowledgeBooking(b.id);
                  setViewing({
                    id: b.id,
                    sequentialNumber: b.sequentialNumber,
                    reference: formatBookingRef(b.sequentialNumber),
                    status: b.status,
                    pickupAt: b.pickupAt,
                    dropoffAt: b.dropoffAt,
                    totalPriceEur: b.totalPriceEur,
                    depositPaidEur: b.depositPaidEur,
                    balanceDueEur: Math.max(0, b.totalPriceEur - b.depositPaidEur),
                    guestFirstName: b.guestFirstName,
                    guestLastName: b.guestLastName,
                    guestEmail: b.guestEmail,
                    extras: [],
                    car: {
                      make: b.carLabel.split(" ")[0] || b.carLabel,
                      model: b.carLabel.split(" ").slice(1).join(" ") || "",
                      imageUrl: b.carImageUrl,
                    },
                    partner: { companyName: b.partnerLabel },
                    pickupAirport: { iata: "—", city: "—", name: "—" },
                    dropoffAirport: { iata: "—", city: "—", name: "—" },
                  });
                  void (async () => {
                    try {
                      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(b.id)}`);
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.booking) setViewing(data.booking as BookingInfoData);
                    } catch {
                      /* keep stub */
                    }
                  })();
                }}
                className="inline-flex h-8 items-center rounded-lg bg-[#0b1f4b] px-2 text-[11px] font-bold text-white hover:bg-[#14306a] disabled:opacity-50"
              >
                {detailsLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Open invoice; clear details modal so overlays don't fight.
                  setViewing(null);
                  setInvoiceBookingId(b.id);
                }}
                className="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-[#0b1f4b] hover:bg-slate-50 disabled:opacity-50"
              >
                {invoiceLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteBooking(b)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                title={dictionary.common.delete}
                aria-label={dictionary.common.delete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {b.status !== "UNFULFILLED" && b.status !== "CANCELLED" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void markUnfulfilled(b)}
                  className="inline-flex h-8 items-center rounded-lg border border-amber-300 bg-amber-50 px-2 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {t.markUnfulfilled}
                </button>
              ) : null}
            </>
          );
        }}
      />

      {viewing ? (
        <BookingInfoModal
          open
          booking={viewing}
          locale={locale}
          role="admin"
          catalogExtras={
            (viewing as BookingInfoData & { catalogExtras?: Array<{ id: string; label: string; priceEurPerDay: number }> })
              .catalogExtras || []
          }
          onClose={() => setViewing(null)}
          onOpenInvoice={() => {
            const id = viewing.id;
            setViewing(null);
            setInvoiceBookingId(id);
          }}
          onSaved={(next) => {
            if (next) setViewing(next);
            else setViewing(null);
          }}
          onDelete={async () => {
            const res = await fetch(`/api/admin/bookings/${encodeURIComponent(viewing.id)}`, {
              method: "DELETE",
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(typeof data.error === "string" ? data.error : t.deleteFailed);
            }
            router.refresh();
          }}
          onConfirmPending={async () => {
            if (!viewing.pendingChanges) return;
            const pc = viewing.pendingChanges;
            const res = await fetch(`/api/admin/bookings/${encodeURIComponent(viewing.id)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pickupAt: pc.pickupAt,
                dropoffAt: pc.dropoffAt,
                pickupAirportIata: pc.pickupAirportIata,
                dropoffAirportIata: pc.dropoffAirportIata,
                applyPendingExtras: true,
              }),
            });
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data.booking) setViewing(data.booking as BookingInfoData);
              else {
                const refreshed = await fetch(`/api/admin/bookings/${encodeURIComponent(viewing.id)}`);
                const body = await refreshed.json().catch(() => ({}));
                if (refreshed.ok && body.booking) setViewing(body.booking as BookingInfoData);
              }
              router.refresh();
            }
          }}
        />
      ) : null}

      {invoiceBookingId ? (
        <BookingInvoiceModal
          bookingId={invoiceBookingId}
          locale={locale}
          onClose={() => setInvoiceBookingId(null)}
        />
      ) : null}

      {editing && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-extrabold text-[#0b1f4b]">
                {t.editTitle}{" "}
                <span className={cn("font-mono text-sm", refClass(editing.status))}>
                  {formatBookingRef(editing.sequentialNumber) || editing.id}
                </span>
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label={dictionary.common.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colFirstName}
                <input
                  className={inputClass}
                  value={draft.guestFirstName}
                  onChange={(e) => setDraft({ ...draft, guestFirstName: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colLastName}
                <input
                  className={inputClass}
                  value={draft.guestLastName}
                  onChange={(e) => setDraft({ ...draft, guestLastName: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                {t.colEmail}
                <input
                  type="email"
                  className={inputClass}
                  value={draft.guestEmail}
                  onChange={(e) => setDraft({ ...draft, guestEmail: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colPickup}
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={draft.pickupAt}
                  min={
                    !draft.pickupAt || draft.pickupAt >= earliestPickupLocalInput()
                      ? earliestPickupLocalInput()
                      : undefined
                  }
                  onChange={(e) => {
                    const min = earliestPickupLocalInput();
                    const pickupAt = e.target.value && e.target.value < min ? min : e.target.value;
                    setDraft({ ...draft, pickupAt });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colDropoff}
                <input
                  type="datetime-local"
                  className={inputClass}
                  min={draft.pickupAt || earliestPickupLocalInput()}
                  value={draft.dropoffAt}
                  onChange={(e) => {
                    const min = draft.pickupAt || earliestPickupLocalInput();
                    const dropoffAt = e.target.value && e.target.value < min ? min : e.target.value;
                    setDraft({ ...draft, dropoffAt });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colPaidOnSite}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={draft.depositPaidEur}
                  onChange={(e) => setDraft({ ...draft, depositPaidEur: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                {t.colTotal}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={draft.totalPriceEur}
                  onChange={(e) => setDraft({ ...draft, totalPriceEur: e.target.value })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={closeEdit}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {dictionary.common.cancel}
              </button>
              <button
                type="button"
                disabled={busyId === editing.id}
                onClick={() => void saveEdit()}
                className="h-9 rounded-md bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {dictionary.common.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
