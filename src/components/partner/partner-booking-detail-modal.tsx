"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { socialLabel } from "@/components/bookings/booking-info-modal/helpers";
import { parsePartnerMessengers } from "@/lib/partner";
import { cn } from "@/lib/utils";
import { clampPickupSelection, earliestPickupIsoDate, isPickupSlotAllowed } from "@/lib/bookings/lead-time";
import { DateInput } from "@/components/ui/date-input";

export type FleetBookingDetail = {
  id: string;
  sequentialNumber: number;
  carId: string;
  status: string;
  kind?: "booking" | "block";
  pickupAt: string;
  dropoffAt: string;
  bufferEndsAt: string;
  createdAt?: string;
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail: string;
  guestPhone?: string;
  guestMessenger?: string;
  flightNumber?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupLabel: string;
  dropoffLabel: string;
  barLabel: string;
  endLabel: string;
  source?: string;
  carLabel?: string;
  registrationNumber?: string;
  totalPriceEur?: number;
  depositPercent?: number;
  depositPaidEur?: number;
  balanceDueEur?: number;
  rentalEstimateEur?: number;
  extras?: Array<{ id: string; label: string; priceEur: number }>;
  pickupNote?: string;
  dropoffNote?: string;
  messengers?: string[];
  dateOfBirth?: string;
  /** Booking was corrected — blink on calendar until partner opens it. */
  updatedUnread?: boolean;
};

type Msg = {
  id: string;
  author: "partner" | "customer" | "system";
  body: string;
  createdAt: string;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

function splitIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "10:00" };
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = d.getMinutes() < 30 ? "00" : "30";
  return { date: `${y}-${mo}-${day}`, time: `${hh}:${mm}` };
}

function money(n: number | undefined) {
  const v = Number(n) || 0;
  return `€${v.toFixed(2)}`;
}

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      closedPeriod: "დახურული პერიოდი",
      booking: "ჯავშანი",
      close: "დახურვა",
      editDates: "თარიღების რედაქტირება",
      saveDates: "თარიღების შენახვა",
      cancelEdit: "გაუქმება",
      pickup: "აღება",
      dropoff: "დაბრუნება",
      customer: "მომხმარებელი",
      phone: "ტელეფონი",
      email: "ელ. ფოსტა",
      messenger: "მესენჯერი",
      flight: "რეისის ნომერი",
      dob: "დაბადების თარიღი",
      services: "მომსახურებები",
      noServices: "დამატებითი მომსახურება არ არის",
      pricing: "თანხები",
      rental: "მანქანის ქირა",
      pickupFee: "აღების მომსახურება",
      dropoffFee: "დაბრუნების მომსახურება",
      total: "ჯავშნის ჯამი",
      paid: "საიტის მომსახურება (გადახდილი)",
      due: "ადგილზე გადასახდელი",
      createdAt: "შექმნის დრო",
      cancelBlock: "ჯავშნის გაუქმება",
      messages: "შეტყობინებები",
      messagePlaceholder: "დაწერეთ პასუხი მომხმარებელს…",
      send: "გაგზავნა",
      notes: "შენიშვნები",
      car: "მანქანა",
      saving: "ინახება…",
    };
  }
  if (locale === "ru") {
    return {
      closedPeriod: "Закрытый период",
      booking: "Бронирование",
      close: "Закрыть",
      editDates: "Изменить даты",
      saveDates: "Сохранить даты",
      cancelEdit: "Отмена",
      pickup: "Получение",
      dropoff: "Возврат",
      customer: "Клиент",
      phone: "Телефон",
      email: "Email",
      messenger: "Мессенджер",
      flight: "Номер рейса",
      dob: "Дата рождения",
      services: "Услуги",
      noServices: "Нет доп. услуг",
      pricing: "Суммы",
      rental: "Аренда авто",
      pickupFee: "Подача / получение",
      dropoffFee: "Возврат",
      total: "Итого по брони",
      paid: "Оплачено на сайте",
      due: "К оплате при получении",
      createdAt: "Создано",
      cancelBlock: "Отменить бронь",
      messages: "Сообщения",
      messagePlaceholder: "Ответ клиенту…",
      send: "Отправить",
      notes: "Заметки",
      car: "Авто",
      saving: "Сохранение…",
    };
  }
  return {
    closedPeriod: "Closed period",
    booking: "Booking",
    close: "Close",
    editDates: "Edit dates",
    saveDates: "Save dates",
    cancelEdit: "Cancel",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
    messenger: "Messenger",
    flight: "Flight number",
    dob: "Date of birth",
    services: "Services",
    noServices: "No extra services",
    pricing: "Pricing",
    rental: "Car rental",
    pickupFee: "Pick-up fee",
    dropoffFee: "Return fee",
    total: "Booking total",
    paid: "Paid on site (service fee)",
    due: "To pay on pick-up",
    createdAt: "Created at",
    cancelBlock: "Cancel booking",
    messages: "Messages",
    messagePlaceholder: "Reply to customer…",
    send: "Send",
    notes: "Notes",
    car: "Car",
    saving: "Saving…",
  };
}

export function PartnerBookingDetailModal({
  booking,
  carLabel,
  locale,
  onClose,
  onChanged,
  onDeleteBlock,
  readOnly = false,
}: {
  booking: FleetBookingDetail;
  carLabel?: string;
  locale: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
  onDeleteBlock?: (id: string) => void | Promise<void>;
  /** Partners cannot edit customer bookings */
  readOnly?: boolean;
}) {
  const t = copyFor(locale);
  const isBlock = booking.kind === "block" || booking.status === "BLOCKED";
  const [editing, setEditing] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draftMsg, setDraftMsg] = useState("");
  const [msgLoading, setMsgLoading] = useState(false);

  const start = splitIso(booking.pickupAt);
  const end = splitIso(booking.dropoffAt);
  const [pickupDate, setPickupDate] = useState(start.date);
  const [pickupTime, setPickupTime] = useState(start.time);
  const [dropoffDate, setDropoffDate] = useState(end.date);
  const [dropoffTime, setDropoffTime] = useState(end.time);

  useEffect(() => {
    const s = splitIso(booking.pickupAt);
    const e = splitIso(booking.dropoffAt);
    setPickupDate(s.date);
    setPickupTime(s.time);
    setDropoffDate(e.date);
    setDropoffTime(e.time);
    setEditing(false);
    setError("");
  }, [booking.id, booking.pickupAt, booking.dropoffAt]);

  const loadMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const res = await fetch(
        `/api/partners/booking-messages?bookingId=${encodeURIComponent(booking.id)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (res.ok) setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      /* optional */
    } finally {
      setMsgLoading(false);
    }
  }, [booking.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (messagesOpen) void loadMessages();
  }, [messagesOpen, loadMessages]);

  const titleCar = carLabel || booking.carLabel || booking.guestName;
  const extras = booking.extras || [];
  const messengers = parsePartnerMessengers(booking.messengers, booking.guestMessenger).map((platform) =>
    socialLabel(platform, locale),
  );

  const createdLabel = useMemo(() => {
    if (!booking.createdAt) return "—";
    const d = new Date(booking.createdAt);
    if (Number.isNaN(d.getTime())) return booking.createdAt;
    return d.toLocaleString(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, [booking.createdAt, locale]);

  const saveDates = async () => {
    setSaving(true);
    setError("");
    try {
      const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
      const dropoffAt = new Date(`${dropoffDate}T${dropoffTime}:00`).toISOString();
      if (!(new Date(dropoffAt).getTime() > new Date(pickupAt).getTime())) {
        throw new Error(
          locale === "ka"
            ? "დაბრუნება უნდა იყოს აღებაზე მოგვიანებით"
            : "Drop-off must be after pick-up",
        );
      }
      if (isBlock) {
        const res = await fetch("/api/partners/calendar-blocks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: booking.id, from: pickupAt, to: dropoffAt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      } else {
        const res = await fetch(`/api/partners/bookings/${encodeURIComponent(booking.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pickupAt, dropoffAt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
      }
      setEditing(false);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!draftMsg.trim()) return;
    setMsgLoading(true);
    try {
      const res = await fetch("/api/partners/booking-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, body: draftMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDraftMsg("");
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-[#1e1b4b] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {isBlock ? t.closedPeriod : t.booking}
              {!isBlock && booking.sequentialNumber ? ` · #${booking.sequentialNumber}` : ""}
            </p>
            <p className="truncate text-lg font-extrabold">{titleCar}</p>
            {booking.registrationNumber ? (
              <p className="text-xs text-amber-200">{booking.registrationNumber}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-white/80 bg-white/10 px-3 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-white/20"
          >
            <X className="h-4 w-4" />
            {t.close}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5 lg:border-b-0 lg:border-e">
              <div className="flex flex-wrap items-center gap-2">
                {!readOnly && !isBlock ? (
                  !editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
                  >
                    {t.editDates}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveDates()}
                      className="rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#16a34a] disabled:opacity-60"
                    >
                      {saving ? t.saving : t.saveDates}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        const s = splitIso(booking.pickupAt);
                        const e = splitIso(booking.dropoffAt);
                        setPickupDate(s.date);
                        setPickupTime(s.time);
                        setDropoffDate(e.date);
                        setDropoffTime(e.time);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      {t.cancelEdit}
                    </button>
                  </>
                )
                ) : null}
                <button
                  type="button"
                  onClick={() => setMessagesOpen((v) => !v)}
                  className="relative inline-flex items-center gap-1.5 rounded-lg bg-[#1e1b4b] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t.messages}
                  {messages.length > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px]">
                      {messages.length}
                    </span>
                  ) : null}
                </button>
              </div>

              {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

              {editing && !readOnly ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    {t.pickup}
                    <div className="mt-1 flex gap-1">
                      <DateInput
                        type="date"
                        value={pickupDate}
                        min={start.date < earliestPickupIsoDate() ? start.date : earliestPickupIsoDate()}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next === start.date) {
                            setPickupDate(next);
                            return;
                          }
                          const slot = clampPickupSelection(next, pickupTime, TIME_OPTIONS);
                          setPickupDate(slot.date);
                          setPickupTime(slot.time);
                        }}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <select
                        value={pickupTime}
                        onChange={(e) => {
                          const next = e.target.value;
                          const keepSaved = pickupDate === start.date && next === start.time;
                          if (!keepSaved && !isPickupSlotAllowed(pickupDate, next)) return;
                          setPickupTime(next);
                        }}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {TIME_OPTIONS.map((tm) => (
                          <option
                            key={tm}
                            value={tm}
                            disabled={
                              !(pickupDate === start.date && tm === start.time) &&
                              !isPickupSlotAllowed(pickupDate, tm)
                            }
                          >
                            {tm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {t.dropoff}
                    <div className="mt-1 flex gap-1">
                      <DateInput
                        type="date"
                        value={dropoffDate}
                        min={pickupDate}
                        onChange={(e) => setDropoffDate(e.target.value < pickupDate ? pickupDate : e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <select
                        value={dropoffTime}
                        onChange={(e) => setDropoffTime(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        {TIME_OPTIONS.map((tm) => (
                          <option key={tm} value={tm} disabled={dropoffDate === pickupDate && tm <= pickupTime}>
                            {tm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              ) : (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                    <dt className="text-slate-500">{t.pickup}</dt>
                    <dd className="text-right font-semibold text-slate-900">{booking.barLabel}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                    <dt className="text-slate-500">{t.dropoff}</dt>
                    <dd className="text-right font-semibold text-slate-900">{booking.endLabel}</dd>
                  </div>
                  {booking.pickupAddress ? (
                    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                      <dt className="text-slate-500">{t.pickup}</dt>
                      <dd className="max-w-[65%] text-right text-slate-800" title={booking.pickupAddress}>
                        {booking.pickupAddress}
                      </dd>
                    </div>
                  ) : null}
                  {booking.dropoffAddress ? (
                    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                      <dt className="text-slate-500">{t.dropoff}</dt>
                      <dd className="max-w-[65%] text-right text-slate-800" title={booking.dropoffAddress}>
                        {booking.dropoffAddress}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              )}

              <section className="rounded-xl border border-sky-200 bg-[#f4f9fd] p-3">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{t.customer}</h3>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t.customer}</dt>
                    <dd className="font-semibold">{booking.guestName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t.email}</dt>
                    <dd className="font-semibold break-all">{booking.guestEmail || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{t.phone}</dt>
                    <dd className="font-semibold">{booking.guestPhone || "—"}</dd>
                  </div>
                  {messengers.length ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{t.messenger}</dt>
                      <dd className="font-semibold">{messengers.join(", ")}</dd>
                    </div>
                  ) : null}
                  {booking.flightNumber ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{t.flight}</dt>
                      <dd className="font-semibold">{booking.flightNumber}</dd>
                    </div>
                  ) : null}
                  {booking.dateOfBirth ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">{t.dob}</dt>
                      <dd className="font-semibold">{booking.dateOfBirth}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              <section className="rounded-xl border border-sky-200 bg-[#f4f9fd] p-3">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{t.services}</h3>
                {extras.length ? (
                  <ul className="space-y-1 text-sm">
                    {extras.map((ex) => (
                      <li key={ex.id} className="flex justify-between gap-2 border-b border-sky-100 py-1">
                        <span className="min-w-0 truncate" title={ex.label}>
                          {ex.label}
                        </span>
                        <span className="shrink-0 font-semibold">{money(ex.priceEur)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">{t.noServices}</p>
                )}
                {(booking.pickupNote || booking.dropoffNote) && (
                  <div className="mt-2 space-y-1 border-t border-sky-100 pt-2 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">{t.notes}</p>
                    {booking.pickupNote ? <p title={booking.pickupNote}>{booking.pickupNote}</p> : null}
                    {booking.dropoffNote ? <p title={booking.dropoffNote}>{booking.dropoffNote}</p> : null}
                  </div>
                )}
              </section>

              {messagesOpen ? (
                <section className="rounded-xl border border-[#1e1b4b]/30 bg-white p-3 shadow-sm">
                  <h3 className="mb-2 text-sm font-bold text-slate-900">{t.messages}</h3>
                  <div className="mb-2 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-2">
                    {msgLoading && !messages.length ? (
                      <p className="text-xs text-slate-400">…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-xs text-slate-400">—</p>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs",
                            m.author === "partner"
                              ? "ms-6 bg-[#1e1b4b] text-white"
                              : m.author === "system"
                                ? "bg-amber-50 text-amber-900"
                                : "me-6 bg-white text-slate-800 ring-1 ring-slate-200",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className="mt-0.5 opacity-70">
                            {new Date(m.createdAt).toLocaleString(
                              locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              },
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={draftMsg}
                      onChange={(e) => setDraftMsg(e.target.value)}
                      placeholder={t.messagePlaceholder}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendMessage();
                      }}
                    />
                    <button
                      type="button"
                      disabled={msgLoading || !draftMsg.trim()}
                      onClick={() => void sendMessage()}
                      className="rounded-lg bg-[#1e1b4b] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {t.send}
                    </button>
                  </div>
                </section>
              ) : null}
            </div>

            <div className="space-y-3 bg-slate-50 p-4 sm:p-5">
              <h3 className="text-sm font-bold text-slate-900">{t.pricing}</h3>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <dt className="text-slate-600">{t.rental}</dt>
                  <dd className="font-semibold">{money(booking.rentalEstimateEur ?? booking.totalPriceEur)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <dt className="text-slate-600">{t.pickupFee}</dt>
                  <dd className="font-semibold">{money(0)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                  <dt className="text-slate-600">{t.dropoffFee}</dt>
                  <dd className="font-semibold">{money(0)}</dd>
                </div>
                {extras.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                  >
                    <dt className="min-w-0 truncate text-slate-600" title={ex.label}>
                      {ex.label}
                    </dt>
                    <dd className="shrink-0 font-semibold">{money(ex.priceEur)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-2 border-t border-slate-300 pt-2 text-base font-extrabold text-slate-900">
                  <dt>{t.total}</dt>
                  <dd>{money(booking.totalPriceEur)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                  <dt className="font-semibold text-emerald-800">{t.paid}</dt>
                  <dd className="font-bold text-emerald-900">{money(booking.depositPaidEur)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                  <dt className="font-semibold text-amber-900">{t.due}</dt>
                  <dd className="font-bold text-amber-950">{money(booking.balanceDueEur)}</dd>
                </div>
              </dl>

              <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                <p>
                  <span className="font-semibold">{t.createdAt}:</span> {createdLabel}
                </p>
                {!isBlock && booking.status ? (
                  <p className="mt-1">
                    <span className="font-semibold">Status:</span> {booking.status}
                  </p>
                ) : null}
              </div>

              {isBlock && onDeleteBlock ? (
                <button
                  type="button"
                  onClick={() => void onDeleteBlock(booking.id)}
                  className="w-full rounded-lg bg-red-400 px-3 py-2.5 text-sm font-bold text-white hover:bg-red-500"
                >
                  {t.cancelBlock}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
