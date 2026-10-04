"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import type { BookingsTableRow } from "@/components/bookings/bookings-table";
import type { BookingInfoData } from "@/components/bookings/booking-info-modal";
import { MANAGE_BOOKING_BACKDROP_URL } from "@/lib/brand";
import { BOOKING_REF_PREFIX, parseBookingRef } from "@/lib/ids";
import { cn } from "@/lib/utils";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";

const BookingsTable = dynamic(
  () => import("@/components/bookings/bookings-table").then((m) => m.BookingsTable),
  { ssr: false },
);
const BookingInfoModal = dynamic(
  () =>
    import("@/components/bookings/booking-info-modal").then((m) => m.BookingInfoModal),
  { ssr: false, loading: () => <RouteLoadingSpinner /> },
);
const ChatMessageThread = dynamic(
  () => import("@/components/chat/chat-message-thread").then((m) => m.ChatMessageThread),
  { ssr: false },
);

function bookingDigitsFromInput(raw: string): string {
  const parsed = parseBookingRef(raw);
  if (parsed != null) return String(parsed);
  return String(raw || "").replace(/\D/g, "");
}

type FoundBooking = BookingInfoData & {
  kind: "car";
  catalogExtras?: Array<{ id: string; label: string; priceEurPerDay: number; locked?: boolean; maxPeriodEur?: number | null }>;
};

type FoundCustomChat = {
  kind: "custom";
  id: string;
  code: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryIso2: string;
  createdAt: string;
  bookingNote?: string;
  selectedCarImageUrl?: string | null;
  selectedCarNote?: string;
  pickupAt?: string | null;
  dropoffAt?: string | null;
  partnerListingId?: string | null;
  partnerListingLabel?: string;
  bookingRef?: string | null;
  priceEur?: number | null;
  commissionPercent?: number | null;
  messages: Array<{
    id: string;
    sender: "GUEST" | "ADMIN";
    body: string;
    createdAt: string;
    imageUrl?: string;
    carOffer?: boolean;
  }>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onNeedHelp?: () => void;
  initialBookingNumber?: string;
  initialEmail?: string;
};

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ManageBookingModal({
  open,
  onClose,
  onNeedHelp,
  initialBookingNumber = "",
  initialEmail = "",
}: Props) {
  const { dictionary, locale } = usePreferences();
  const t = dictionary.manageBooking;
  const [bookingDigits, setBookingDigits] = useState(() =>
    bookingDigitsFromInput(initialBookingNumber),
  );
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [foundBookings, setFoundBookings] = useState<FoundBooking[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [foundChat, setFoundChat] = useState<FoundCustomChat | null>(null);
  const [reply, setReply] = useState("");
  const [, setDetailOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const bookingNumber = bookingDigits ? `${BOOKING_REF_PREFIX}${bookingDigits}` : "";

  useEffect(() => {
    if (!open) return;
    setBookingDigits(bookingDigitsFromInput(initialBookingNumber));
    setEmail(initialEmail);
    setError("");
    setFoundBookings([]);
    setActiveBookingId(null);
    setFoundChat(null);
    setReply("");
    setDetailOpen(false);
    setInfoOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, initialBookingNumber, initialEmail]);

  const activeBooking = foundBookings.find((row) => row.id === activeBookingId) || null;

  const lookupEmailBookings = useCallback(async () => {
    const mail = email.trim();
    if (!bookingNumber || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return;
    setLoading(true);
    setError("");
    setFoundBookings([]);
    setActiveBookingId(null);
    setFoundChat(null);
    setDetailOpen(false);
    setInfoOpen(false);
    try {
      const res = await fetch("/api/bookings/email-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingNumber, email: mail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(dictionary.auth.bookingsNotFound);
        return;
      }
      const bookings = (Array.isArray(data.bookings) ? data.bookings : []) as FoundBooking[];
      if (bookings.length) {
        setFoundBookings(bookings.map((row) => ({ ...row, kind: "car" as const })));
        return;
      }
      const chats = (Array.isArray(data.chats) ? data.chats : []) as FoundCustomChat[];
      if (chats[0]) {
        setFoundChat({ ...chats[0], kind: "custom" });
        return;
      }
      setError(dictionary.auth.bookingsNotFound);
    } catch {
      setError(dictionary.auth.bookingsNotFound);
    } finally {
      setLoading(false);
    }
  }, [bookingNumber, dictionary.auth.bookingsNotFound, email]);

  useEffect(() => {
    if (!open || bookingDigits.length < 4) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    const timer = window.setTimeout(() => {
      void lookupEmailBookings();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [open, bookingDigits, email, lookupEmailBookings]);

  const tableRows: BookingsTableRow[] = useMemo(
    () =>
      foundBookings.map((booking) => {
        const driverName =
          [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(" ").trim() ||
          booking.guestEmail ||
          "—";
        return {
          id: booking.id,
          reference: booking.reference,
          status: booking.status,
          carLabel: `${booking.car.make} ${booking.car.model}`.trim(),
          carImageUrl: booking.car.imageUrl,
          driverName,
          driverEmail: booking.guestEmail,
          pickupAt: booking.pickupAt,
          dropoffAt: booking.dropoffAt,
          totalPrice: Number(booking.totalPriceEur) || 0,
          currency: "EUR",
        };
      }),
    [foundBookings],
  );

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void lookupEmailBookings();
  };

  const sendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundChat || !reply.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/custom-booking/chats/${encodeURIComponent(foundChat.code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: foundChat.email, body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || dictionary.home.customCouldNotSend);
      setFoundChat({ kind: "custom", ...(data.chat as Omit<FoundCustomChat, "kind">) });
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : dictionary.home.customCouldNotSend);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${MANAGE_BOOKING_BACKDROP_URL}')` }}
      />
      <div aria-hidden className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />

      <div
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-xl border border-white/70 bg-white shadow-[0_24px_60px_rgba(11,31,75,0.35)]",
          foundBookings.length ? "max-w-5xl" : "max-w-[760px]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}
          aria-label={dictionary.home.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-4 pb-7 pt-7 sm:px-6 sm:pb-8 sm:pt-8">
          {!foundBookings.length && !foundChat ? (
            <>
              <h2 className="pr-10 text-[1.65rem] font-bold leading-tight tracking-tight text-[#0b1f4b] sm:text-[1.85rem]">
                {t.title}
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-500">{t.subtitle}</p>
            </>
          ) : null}

          {foundChat ? (
            <div className="mt-2 space-y-5">
              <p className="rounded-xl bg-sky-100 px-4 py-3 text-sm leading-relaxed text-sky-950">
                {dictionary.auth.retentionNotice}
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Booking codes</p>
                    <p className="mt-1 font-mono text-lg font-bold text-[#0b1f4b]">
                      {foundChat.bookingRef ? `${foundChat.bookingRef} · ${foundChat.code}` : foundChat.code}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                    {foundChat.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {foundChat.firstName} {foundChat.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">{foundChat.email}</p>
                <p className="mt-1 text-sm text-slate-600">{foundChat.phone}</p>
                {foundChat.pickupAt || foundChat.dropoffAt ? (
                  <p className="mt-3 text-sm text-slate-700">
                    {foundChat.pickupAt ? formatWhen(foundChat.pickupAt, locale) : "—"} →{" "}
                    {foundChat.dropoffAt ? formatWhen(foundChat.dropoffAt, locale) : "—"}
                  </p>
                ) : null}
                {foundChat.partnerListingLabel || foundChat.partnerListingId ? (
                  <p className="mt-1 text-sm text-slate-700">
                    Listing: {foundChat.partnerListingLabel || foundChat.partnerListingId}
                  </p>
                ) : null}
                {foundChat.priceEur != null ? (
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    €{foundChat.priceEur}
                    {foundChat.commissionPercent != null
                      ? ` · commission ${foundChat.commissionPercent}%`
                      : null}
                  </p>
                ) : null}
                {foundChat.bookingNote ? (
                  <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-800 ring-1 ring-slate-200">
                    <span className="text-xs font-bold uppercase text-slate-400">{dictionary.home.customDetails}</span>
                    <span className="mt-1 block">{foundChat.bookingNote}</span>
                  </p>
                ) : null}
                {foundChat.selectedCarImageUrl ? (
                  <div className="mt-3 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foundChat.selectedCarImageUrl}
                      alt=""
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                    <p className="text-sm text-slate-700">{foundChat.selectedCarNote || dictionary.home.customSelectedCar}</p>
                  </div>
                ) : null}
              </div>
              {foundChat.status === "OPEN" || foundChat.status === "CLOSED" ? (
                <>
                  <ChatMessageThread
                    messages={foundChat.messages}
                    className="max-h-56 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    renderMessage={(m) => (
                      <div
                        className={cn(
                          "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                          m.sender === "GUEST"
                            ? "ms-auto bg-[#22c55e] text-white"
                            : "bg-white text-slate-800 shadow-sm",
                        )}
                      >
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.imageUrl} alt="" className="mb-2 max-h-36 w-full rounded-lg object-cover" />
                        ) : null}
                        {m.body}
                      </div>
                    )}
                  />
                  <form onSubmit={sendChatReply} className="flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={dictionary.home.customWriteMessage}
                    />
                    <button
                      type="submit"
                      disabled={loading || !reply.trim()}
                      className="rounded-full bg-[#22c55e] px-5 py-2.5 text-sm font-bold text-white disabled:bg-slate-400"
                    >
                      Send
                    </button>
                  </form>
                </>
              ) : null}
              <button
                type="button"
                className="text-sm font-semibold text-[#1d6fe8] hover:underline"
                onClick={() => setFoundChat(null)}
              >
                {t.searchAgain}
              </button>
            </div>
          ) : foundBookings.length ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-sky-100 px-4 py-3 text-sm leading-relaxed text-sky-950">
                {dictionary.auth.retentionNotice}
              </p>
              <BookingsTable
                rows={tableRows}
                locale={locale}
                currency="EUR"
                showCheckboxes={false}
                showFiltersButton={false}
                showToolbar={false}
                labelEndedBookings
                onView={(row) => {
                  setActiveBookingId(row.id);
                  setInfoOpen(true);
                }}
              />
              <button
                type="button"
                className="text-sm font-semibold text-[#1d6fe8] hover:underline"
                onClick={() => {
                  setFoundBookings([]);
                  setActiveBookingId(null);
                  setInfoOpen(false);
                  setDetailOpen(false);
                }}
              >
                {t.searchAgain}
              </button>
              {activeBooking ? (
                <BookingInfoModal
                  open={infoOpen}
                  booking={activeBooking}
                  locale={locale}
                  role="guest"
                  catalogExtras={activeBooking.catalogExtras || []}
                  onClose={() => setInfoOpen(false)}
                  onSaved={(next) => {
                    if (!next) return;
                    setFoundBookings((current) =>
                      current.map((row) =>
                        row.id === next.id
                          ? { ...row, ...next, kind: "car", catalogExtras: row.catalogExtras }
                          : row,
                      ),
                    );
                    setActiveBookingId(next.id);
                  }}
                />
              ) : null}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8" noValidate>
              {error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <label className="block text-sm font-semibold text-[#0b1f4b]">
                  {t.bookingNumber}
                  <span className="mt-2 flex overflow-hidden rounded-lg border border-slate-300 focus-within:border-[#1d6fe8] focus-within:ring-2 focus-within:ring-[#1d6fe8]/20">
                    <span className="inline-flex shrink-0 items-center border-e border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-[15px] font-bold text-slate-600">
                      {BOOKING_REF_PREFIX}
                    </span>
                    <input
                      className="min-w-0 flex-1 bg-white px-3.5 py-3 text-[15px] font-normal text-slate-900 outline-none placeholder:text-slate-400"
                      value={bookingDigits}
                      onChange={(e) => setBookingDigits(e.target.value.replace(/\D/g, ""))}
                      placeholder="1000"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      aria-label={t.bookingNumber}
                    />
                  </span>
                </label>
                <label className="block text-sm font-semibold text-[#0b1f4b]">
                  {t.email}
                  <input
                    type="email"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-[15px] font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
              </div>

              <p className="mt-5 rounded-xl bg-sky-100 px-4 py-3 text-sm leading-relaxed text-sky-950">
                {dictionary.auth.retentionNotice}
              </p>

              <div className="mt-8 flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-left text-sm font-semibold text-[#1d6fe8] hover:underline"
                  onClick={() => {
                    onClose();
                    onNeedHelp?.();
                  }}
                >
                  {t.cantFind}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-[#1d6fe8] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1557c0] disabled:bg-slate-400"
                >
                  {loading ? t.searching : t.findCta}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
