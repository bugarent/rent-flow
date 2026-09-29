"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, FileSignature, HelpCircle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomBookingChatStatus } from "@/lib/catalog/custom-booking-chat";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type BookingListItem = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomBookingChatStatus;
  channel: string;
  selectedCarImageUrl: string | null;
  bookingNote: string;
  activatedAt: string | null;
  completedAt: string | null;
  lastMessageAt: string;
};

type BookingDetail = BookingListItem & {
  phoneCountryIso2?: string;
  selectedCarNote?: string;
  pickupAt?: string | null;
  dropoffAt?: string | null;
  partnerListingId?: string | null;
  partnerListingLabel?: string;
  bookingRef?: string | null;
  priceEur?: number | null;
  commissionPercent?: number | null;
};

type PartnerEnrichment = {
  id: string;
  companyName: string;
  phone: string;
  secondaryPhone: string | null;
  email: string;
  logoUrl: string | null;
  messengers: string[];
  carTitle: string;
  carMake: string;
  carModel: string;
  carYear: number;
  transmission: string;
  fuelType: string;
};

type TabId = "active" | "completed" | "rejected";

function formatWhen(iso: string | null | undefined, locale: string) {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = d.toLocaleDateString(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} €`;
}

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] gap-2 border-b border-slate-100 py-1.5 text-[12px] last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900 break-words">{value || "—"}</dd>
    </div>
  );
}

function voucherCopy(locale: string) {
  if (locale === "ka") {
    return {
      title: "ავტომობილის იჯარის ვაუჩერი",
      titleEn: "Car rental voucher",
      bookingNumber: "ჯავშნის ნომერი / Booking number",
      pickUp: "მიღება / Pick up",
      dropOff: "დაბრუნება / Drop off",
      date: "თარიღი / Date",
      time: "დრო / Time",
      location: "ლოკაცია / Location",
      contactHelp:
        "თუ მენეჯერი ადგილზე ვერ იპოვეთ, დაუკავშირდით პარტნიორს ტელეფონით.",
      car: "ავტო / Car",
      client: "კლიენტი / Client",
      partner: "პარტნიორი / Partner",
      cost: "ღირებულება / Cost",
      model: "მოდელი / Model",
      year: "წელი / Year",
      gearbox: "ტრანსმისია / Gearbox",
      fuel: "საწვავი / Fuel",
      name: "სახელი / Name",
      email: "ელფოსტა / Email",
      phone: "ტელეფონი / Phone",
      channel: "არხი / Channel",
      company: "კომპანია / Company",
      listing: "განცხადება / Listing",
      rent: "იჯარა / Rent",
      commission: "კომისია / Commission",
      total: "სულ / Total",
      paid: "გადახდილი / Paid",
      atPickup: "მიღებისას / When picking up",
      deposit: "გირაო / Deposit",
      note: "შენიშვნა / Note",
      stepsTitle: "მნიშვნელოვანი ნაბიჯები მანქანის მიღებისას",
      step1: "გადაიღეთ ფოტო/ვიდეო მანქანის მდგომარეობისა",
      step2: "მოაწერეთ ხელი ხელშეკრულებას",
      step3: "დარწმუნდით, რომ ყველაფერი სწორია",
      servicing: "მომსახურე კომპანია / Company servicing the order",
      brand: "rentairportcars.com",
      actions: "მოქმედებები",
      bookingNote: "ჯავშნის შენიშვნა",
      save: "შენახვა",
      setActive: "აქტიურად დაყენება",
      complete: "დასრულება",
      reject: "უარყოფა",
      delete: "წაშლა",
      select: "აირჩიეთ ჯავშანი დეტალების სანახავად.",
      empty: "ამ სიაში ჯავშანი არ არის.",
      active: "აქტიური",
      completed: "დასრულებული",
      rejected: "უარყოფილი",
    };
  }
  if (locale === "ru") {
    return {
      title: "Ваучер аренды автомобиля",
      titleEn: "Car rental voucher",
      bookingNumber: "Номер бронирования / Booking number",
      pickUp: "Получение / Pick up",
      dropOff: "Возврат / Drop off",
      date: "Дата / Date",
      time: "Время / Time",
      location: "Локация / Location",
      contactHelp:
        "Если не удалось найти менеджера при получении авто, свяжитесь с партнёром по телефону.",
      car: "Авто / Car",
      client: "Клиент / Client",
      partner: "Партнёр / Partner",
      cost: "Стоимость / Cost",
      model: "Модель / Model",
      year: "Год / Year",
      gearbox: "КПП / Gearbox",
      fuel: "Топливо / Fuel",
      name: "Имя / Name",
      email: "Email",
      phone: "Телефон / Phone",
      channel: "Канал / Channel",
      company: "Компания / Company",
      listing: "Объявление / Listing",
      rent: "Аренда / Rent",
      commission: "Комиссия / Commission",
      total: "Всего / Total",
      paid: "Внесено / Paid",
      atPickup: "При получении / When picking up",
      deposit: "Залог / Deposit",
      note: "Заметка / Note",
      stepsTitle: "Важные шаги при получении авто",
      step1: "Сделайте фото/видео состояния авто",
      step2: "Подпишите договор",
      step3: "Убедитесь, что всё верно",
      servicing: "Компания, обслуживающая заказ",
      brand: "rentairportcars.com",
      actions: "Действия",
      bookingNote: "Заметка по бронированию",
      save: "Сохранить",
      setActive: "Сделать активной",
      complete: "Завершить",
      reject: "Отклонить",
      delete: "Удалить",
      select: "Выберите бронирование для просмотра.",
      empty: "В этом списке нет бронирований.",
      active: "Активные",
      completed: "Завершённые",
      rejected: "Отклонённые",
    };
  }
  return {
    title: "Car rental voucher",
    titleEn: "Car rental voucher",
    bookingNumber: "Booking number",
    pickUp: "Pick up",
    dropOff: "Drop off",
    date: "Date",
    time: "Time",
    location: "Location",
    contactHelp: "If you couldn't find the manager when picking up the car, contact the partner by phone.",
    car: "Car",
    client: "Client",
    partner: "Partner",
    cost: "Cost",
    model: "Model",
    year: "Year",
    gearbox: "Gearbox",
    fuel: "Fuel",
    name: "Name",
    email: "Email",
    phone: "Phone",
    channel: "Channel",
    company: "Company",
    listing: "Listing",
    rent: "Rent",
    commission: "Commission",
    total: "Total",
    paid: "Paid",
    atPickup: "When picking up",
    deposit: "Deposit",
    note: "Note",
    stepsTitle: "Important steps when receiving the car",
    step1: "Take photos/video of the car condition",
    step2: "Sign the contract",
    step3: "Confirm everything is correct",
    servicing: "Company servicing the order",
    brand: "rentairportcars.com",
    actions: "Actions",
    bookingNote: "Booking note",
    save: "Save",
    setActive: "Set active",
    complete: "Complete",
    reject: "Reject",
    delete: "Delete",
    select: "Select a booking to view details.",
    empty: "No bookings in this list.",
    active: "Active",
    completed: "Completed",
    rejected: "Rejected",
  };
}

export function AdminCustomBookings() {
  const { locale } = useAdminLocale();
  const t = useMemo(() => voucherCopy(locale), [locale]);
  const [items, setItems] = useState<BookingListItem[]>([]);
  const [tab, setTab] = useState<TabId>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [partner, setPartner] = useState<PartnerEnrichment | null>(null);
  const [bookingNote, setBookingNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/custom-booking/chats", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    const rows = (data.chats || []) as BookingListItem[];
    setItems(rows.filter((c) => c.status === "ACTIVE" || c.status === "COMPLETED" || c.status === "REJECTED"));
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/custom-booking/chats/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load booking");
    setDetail(data.chat as BookingDetail);
    setPartner((data.partner as PartnerEnrichment | null) || null);
    setBookingNote(String(data.chat?.bookingNote || ""));
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setPartner(null);
      return;
    }
    void loadDetail(selectedId).catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [selectedId, loadDetail]);

  const filtered = items.filter((c) => {
    if (tab === "active") return c.status === "ACTIVE";
    if (tab === "completed") return c.status === "COMPLETED";
    return c.status === "REJECTED";
  });

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
      if (data.chat?.id) {
        setSelectedId(data.chat.id);
        setDetail(data.chat as BookingDetail);
        setBookingNote(String(data.chat.bookingNote || ""));
        await loadDetail(data.chat.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this booking permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSelectedId(null);
      setDetail(null);
      setPartner(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const pickup = formatWhen(detail?.pickupAt, locale);
  const dropoff = formatWhen(detail?.dropoffAt, locale);
  const total = detail?.priceEur ?? null;
  const commissionPct = detail?.commissionPercent ?? null;
  const commissionAmt =
    total != null && commissionPct != null ? (total * commissionPercentSafe(commissionPct)) / 100 : null;
  const carModel =
    partner?.carMake && partner?.carModel
      ? `${partner.carMake} ${partner.carModel}`
      : detail?.partnerListingLabel || detail?.selectedCarNote || "—";
  const partnerPhones = partner
    ? [partner.phone, partner.secondaryPhone].filter(Boolean).join(" · ")
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["active", t.active],
            ["completed", t.completed],
            ["rejected", t.rejected],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSelectedId(null);
            }}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-bold",
              tab === id ? "bg-[#0b1f4b] text-white" : "border border-slate-200 text-slate-700",
            )}
          >
            {label} (
            {
              items.filter((c) =>
                id === "active"
                  ? c.status === "ACTIVE"
                  : id === "completed"
                    ? c.status === "COMPLETED"
                    : c.status === "REJECTED",
              ).length
            }
            )
          </button>
        ))}
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-2xl border bg-white shadow-sm">
          <ul className="max-h-[75vh] divide-y overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">{t.empty}</li>
            ) : (
              filtered.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50",
                      selectedId === row.id ? "bg-sky-50" : "",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#0b1f4b]">{row.code}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {row.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.channel} · {row.email}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="min-w-0">
          {!detail ? (
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="py-16 text-center text-sm text-slate-500">{t.select}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <article className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-sm font-extrabold tracking-tight text-[#0b1f4b]">{t.brand}</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.titleEn}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t.bookingNumber}
                    </p>
                    <p className="font-mono text-2xl font-black text-slate-900">#{detail.code}</p>
                    {detail.bookingRef ? (
                      <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">{detail.bookingRef}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">{detail.status}</p>
                  </div>
                </header>

                <div className="grid gap-0 border-b border-slate-200 sm:grid-cols-2">
                  <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">{t.pickUp}</p>
                    <p className="text-sm font-bold text-slate-900">
                      {detail.partnerListingLabel || partner?.carTitle || "—"}
                    </p>
                    <dl className="mt-2">
                      <Kv label={t.date} value={pickup.date} />
                      <Kv label={t.time} value={pickup.time} />
                      <Kv label={t.location} value={detail.selectedCarNote || "—"} />
                    </dl>
                  </div>
                  <div className="p-4">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">{t.dropOff}</p>
                    <p className="text-sm font-bold text-slate-900">
                      {detail.partnerListingLabel || partner?.carTitle || "—"}
                    </p>
                    <dl className="mt-2">
                      <Kv label={t.date} value={dropoff.date} />
                      <Kv label={t.time} value={dropoff.time} />
                      <Kv label={t.location} value={detail.selectedCarNote || "—"} />
                    </dl>
                  </div>
                </div>

                <div className="flex gap-3 border-b border-slate-200 bg-slate-100 px-5 py-3 text-xs text-slate-700">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <div>
                    <p>{t.contactHelp}</p>
                    {partner ? (
                      <p className="mt-1 font-bold text-slate-900">
                        {partnerPhones}
                        {partner.messengers?.length ? (
                          <span className="ms-2 font-semibold text-slate-600">
                            ({partner.messengers.join(", ")})
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="space-y-4 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                    <section>
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-sm font-extrabold text-slate-900">{t.car}</h3>
                        {detail.selectedCarImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={detail.selectedCarImageUrl}
                            alt=""
                            className="h-12 w-20 rounded border object-cover"
                          />
                        ) : null}
                      </div>
                      <dl>
                        <Kv label={t.model} value={carModel} />
                        <Kv label={t.year} value={partner?.carYear ? String(partner.carYear) : "—"} />
                        <Kv label={t.gearbox} value={partner?.transmission || "—"} />
                        <Kv label={t.fuel} value={partner?.fuelType || "—"} />
                        <Kv
                          label={t.listing}
                          value={
                            detail.partnerListingId ? (
                              <a
                                className="text-sky-800 underline"
                                href={`/cars/${detail.partnerListingId}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {detail.partnerListingId}
                              </a>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </dl>
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-extrabold text-slate-900">{t.client}</h3>
                      <dl>
                        <Kv
                          label={t.name}
                          value={`${detail.firstName} ${detail.lastName}`.trim() || "—"}
                        />
                        <Kv label={t.email} value={detail.email} />
                        <Kv label={t.phone} value={detail.phone} />
                        <Kv label={t.channel} value={detail.channel} />
                      </dl>
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-extrabold text-slate-900">{t.partner}</h3>
                      <dl>
                        <Kv label={t.company} value={partner?.companyName || "—"} />
                        <Kv label={t.email} value={partner?.email || "—"} />
                        <Kv label={t.phone} value={partnerPhones} />
                      </dl>
                    </section>

                    <section className="overflow-hidden rounded-lg border border-slate-300">
                      <div className="bg-slate-700 px-3 py-2 text-xs font-bold text-white">{t.stepsTitle}</div>
                      <ol className="space-y-2 bg-slate-50 p-3 text-[11px] text-slate-700">
                        <li className="flex gap-2">
                          <Camera className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            <strong>1.</strong> {t.step1}
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <FileSignature className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            <strong>2.</strong> {t.step2}
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            <strong>3.</strong> {t.step3}
                          </span>
                        </li>
                      </ol>
                    </section>
                  </div>

                  <div className="space-y-4 p-5">
                    <section>
                      <h3 className="mb-2 text-sm font-extrabold text-slate-900">{t.cost}</h3>
                      <dl>
                        <Kv label={t.rent} value={money(total)} />
                        <Kv
                          label={t.commission}
                          value={
                            commissionPct != null
                              ? `${commissionPct}%${commissionAmt != null ? ` · ${money(commissionAmt)}` : ""}`
                              : "—"
                          }
                        />
                        <Kv label={t.note} value={detail.bookingNote || "—"} />
                      </dl>
                      <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
                        <div className="flex justify-between font-extrabold text-slate-900">
                          <span>{t.total}</span>
                          <span>{money(total)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>{t.paid}</span>
                          <span>—</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{t.atPickup}</span>
                          <span>{money(total)}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>{t.deposit}</span>
                          <span>—</span>
                        </div>
                      </div>
                    </section>

                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {t.servicing}:{" "}
                      <span className="font-semibold text-slate-800">
                        {partner?.companyName || t.brand}
                      </span>
                    </p>
                  </div>
                </div>
              </article>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t.actions}</p>
                <label className="mb-3 block text-xs font-semibold text-slate-600">
                  {t.bookingNote}
                  <div className="mt-1 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      placeholder="Car, dates, price…"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(detail.id, { bookingNote })}
                      className="rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      {t.save}
                    </button>
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  {detail.status !== "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(detail.id, { status: "ACTIVE", bookingNote })}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {t.setActive}
                    </button>
                  ) : null}
                  {detail.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(detail.id, { status: "COMPLETED" })}
                      className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {t.complete}
                    </button>
                  ) : null}
                  {detail.status !== "REJECTED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void patch(detail.id, { status: "REJECTED" })}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {t.reject}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(detail.id)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function commissionPercentSafe(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}
