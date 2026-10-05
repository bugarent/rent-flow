"use client";

import { useState } from "react";
import { Ban, Eye, Trash2, X } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import type { BookingCustomerRow } from "@/lib/admin/booking-customer-row";
import { PARTNER_SOCIAL_PLATFORMS } from "@/lib/partner";
import { uiLocaleTag, uiText } from "@/lib/i18n/ui-text";
import { cn } from "@/lib/utils";

function messengerLabel(value: string) {
  return PARTNER_SOCIAL_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || "—";
  return date.toLocaleString(uiLocaleTag(locale), { dateStyle: "medium", timeStyle: "short" });
}

function bookingStatusLabel(status: string, locale: string) {
  const t = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  if (status === "PENDING") return t("Pending", "მოლოდინში", "Ожидает");
  if (status === "CONFIRMED") return t("Confirmed", "დადასტურებული", "Подтверждено");
  if (status === "CANCELLED") return t("Cancelled", "გაუქმებული", "Отменено");
  if (status === "COMPLETED") return t("Completed", "დასრულებული", "Завершено");
  if (status === "UNFULFILLED") return t("Unfulfilled", "შეუსრულებელი", "Не выполнено");
  return status;
}

export function BookingCustomersPanel({ customers }: { customers: BookingCustomerRow[] }) {
  const { locale } = useAdminLocale();
  const t = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [patch, setPatch] = useState<Record<string, Partial<BookingCustomerRow>>>({});
  const [signature, setSignature] = useState("");
  const [details, setDetails] = useState<BookingCustomerRow | null>(null);
  const [blockRow, setBlockRow] = useState<BookingCustomerRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const nextSignature = customers
    .map((row) => `${row.id}:${row.bookingCount}:${row.status}:${row.banned ? 1 : 0}`)
    .join("|");
  if (signature !== nextSignature) {
    setSignature(nextSignature);
    setPatch({});
  }

  const rows = customers.map((row) => ({ ...row, ...patch[row.id] }));

  const labels = {
    intro: t(
      "Everyone who makes a booking is saved here, including guests without an account.",
      "აქ ინახება ყველა მომხმარებელი, ვინც ჯავშანს გააკეთებს, ანგარიშის გარეშე სტუმრების ჩათვლით.",
      "Здесь сохраняется каждый, кто оформил бронь, включая гостей без аккаунта.",
    ),
    idCol: t("Identification number", "საიდენტიფიკაციო ნომერი", "Идентификационный номер"),
    nameCol: t("Name", "სახელი", "Имя"),
    countryCol: t("Country", "ქვეყანა", "Страна"),
    typeCol: t("Type", "ტიპი", "Тип"),
    bookingsCol: t("Bookings", "ჯავშნები", "Брони"),
    statusCol: t("Status", "სტატუსი", "Статус"),
    actionsCol: t("Actions", "მოქმედებები", "Действия"),
    account: t("Account", "ანგარიში", "Аккаунт"),
    guest: t("Guest", "სტუმარი", "Гость"),
    active: t("Active", "აქტიური", "Активен"),
    blocked: t("Blocked", "დაბლოკილი", "Заблокирован"),
    details: t("Details", "დეტალები", "Детали"),
    block: t("Block", "დაბლოკვა", "Заблокировать"),
    unblock: t("Unblock", "განბლოკვა", "Разблокировать"),
    delete: t("Delete", "წაშლა", "Удалить"),
    empty: t("No booking customers yet.", "ჯავშნის მომხმარებელი ჯერ არ არის.", "Клиентов с бронью пока нет."),
    close: t("Close", "დახურვა", "Закрыть"),
    cancel: t("Cancel", "გაუქმება", "Отмена"),
    email: t("Email", "ელფოსტა", "Эл. почта"),
    phone: t("Phone", "ტელეფონი", "Телефон"),
    messenger: t("Messenger", "მესენჯერი", "Мессенджер"),
    bookings: t("Bookings", "ჯავშნები", "Брони"),
    detailsTitle: t("Customer", "მომხმარებელი", "Клиент"),
    blockTitle: t("Block customer", "მომხმარებლის დაბლოკვა", "Блокировка клиента"),
    blockHelp: t(
      "This email and phone will not be able to make another booking.",
      "ამ ელფოსტით და ტელეფონით ახალი ჯავშნის გაკეთება აღარ იქნება შესაძლებელი.",
      "С этим email и телефоном нельзя будет оформить новую бронь.",
    ),
    confirmDelete: t(
      "Delete this customer account? Their bookings stay in this list.",
      "წავშალოთ ამ მომხმარებლის ანგარიში? ჯავშნები ამ სიაში დარჩება.",
      "Удалить аккаунт клиента? Брони останутся в этом списке.",
    ),
    guestKept: t(
      "This person has no account. The booking stays in the list.",
      "ამ მომხმარებელს ანგარიში არ აქვს. ჯავშანი სიაში რჩება.",
      "У этого человека нет аккаунта. Бронь остаётся в списке.",
    ),
    failed: t("Action failed", "მოქმედება ვერ შესრულდა", "Действие не выполнено"),
    deleted: t(
      "Account removed. Bookings stay in this list.",
      "ანგარიში წაიშალა. ჯავშნები სიაში რჩება.",
      "Аккаунт удалён. Брони остаются в списке.",
    ),
  };

  const apply = (id: string, next: Partial<BookingCustomerRow>) => {
    setPatch((current) => ({ ...current, [id]: { ...current[id], ...next } }));
    setDetails((open) => (open && open.id === id ? { ...open, ...next } : open));
    setBlockRow((open) => (open && open.id === id ? { ...open, ...next } : open));
  };

  const block = async (row: BookingCustomerRow, action: "block" | "unblock") => {
    setBusyId(row.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(row.userId || "guest")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: row.email, phone: row.phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || labels.failed);
      const blocked = action === "block";
      apply(row.id, { banned: blocked, status: blocked ? "SUSPENDED" : "ACTIVE" });
      setBlockRow(null);
    } catch (err) {
      setNotice({ tone: "err", text: err instanceof Error ? err.message : labels.failed });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: BookingCustomerRow) => {
    if (!row.userId) {
      setNotice({ tone: "err", text: labels.guestKept });
      return;
    }
    if (!window.confirm(labels.confirmDelete)) return;
    setBusyId(row.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(row.userId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || labels.failed);
      apply(row.id, { banned: true, status: "SUSPENDED", hasAccount: false, userId: null });
      setNotice({ tone: "ok", text: labels.deleted });
    } catch (err) {
      setNotice({ tone: "err", text: err instanceof Error ? err.message : labels.failed });
    } finally {
      setBusyId(null);
    }
  };

  const actions = (row: BookingCustomerRow, compact: boolean) => {
    const blocked = row.banned || row.status === "SUSPENDED";
    const btn = cn(
      "inline-flex min-h-11 items-center gap-1 rounded-md border font-bold md:min-h-0",
      compact ? "md:h-6 md:px-1.5 md:text-[11px]" : "px-2.5 text-xs",
      "px-2.5 text-sm md:px-1.5",
    );
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", compact && "md:flex-nowrap md:justify-end")}>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setDetails(row);
          }}
          className={cn(btn, "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}
        >
          <Eye className="h-3.5 w-3.5 md:h-3 md:w-3" />
          {labels.details}
        </button>
        {blocked ? (
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => void block(row, "unblock")}
            className={cn(btn, "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50")}
          >
            {labels.unblock}
          </button>
        ) : (
          <button
            type="button"
            disabled={busyId === row.id}
            onClick={() => {
              setNotice(null);
              setBlockRow(row);
            }}
            className={cn(btn, "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50")}
          >
            <Ban className="h-3.5 w-3.5 md:h-3 md:w-3" />
            {labels.block}
          </button>
        )}
        <button
          type="button"
          disabled={busyId === row.id}
          onClick={() => void remove(row)}
          className={cn(btn, "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50")}
        >
          <Trash2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
          {labels.delete}
        </button>
      </div>
    );
  };

  const statusPill = (row: BookingCustomerRow) => {
    const blocked = row.banned || row.status === "SUSPENDED";
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-semibold leading-4",
          blocked ? "bg-red-600 text-white" : "bg-emerald-600 text-white",
        )}
      >
        {blocked ? labels.blocked : labels.active}
      </span>
    );
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">{labels.intro}</p>
      {notice ? (
        <p
          className={cn(
            "mb-3 rounded-lg border px-3 py-2 text-sm font-semibold",
            notice.tone === "err"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-sky-200 bg-sky-50 text-sky-950",
          )}
        >
          {notice.text}
        </p>
      ) : null}
      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="whitespace-nowrap px-2 py-1">{labels.idCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.nameCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.countryCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.typeCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.bookingsCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.statusCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{labels.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      {labels.empty}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-l-4 border-l-transparent bg-white">
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle font-mono font-bold leading-none">
                        {row.customerNumber ?? "—"}
                      </td>
                      <td className="max-w-[16rem] px-2 py-0.5 align-middle leading-none">
                        <button
                          type="button"
                          onClick={() => setDetails(row)}
                          className="font-semibold text-sky-800 hover:underline"
                        >
                          {row.displayName}
                        </button>
                        <span className="ml-2 text-[10px] text-slate-500">{row.email || "—"}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle text-slate-700">
                        {row.countryLabel || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle">
                        {row.hasAccount ? labels.account : labels.guest}
                      </td>
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle">
                        <span className="font-bold">{row.bookingCount}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle">{statusPill(row)}</td>
                      <td className="whitespace-nowrap px-2 py-0.5 align-middle">{actions(row, true)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          rows.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">{labels.empty}</p>
          ) : (
            rows.map((row) => (
              <MobileDataCard key={row.id}>
                <MobileDataRow label={labels.idCol}>{row.customerNumber ?? "—"}</MobileDataRow>
                <MobileDataRow label={labels.nameCol}>
                  <span className="block break-words">{row.displayName}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-500 break-all">{row.email || "—"}</span>
                </MobileDataRow>
                <MobileDataRow label={labels.countryCol}>{row.countryLabel || "—"}</MobileDataRow>
                <MobileDataRow label={labels.typeCol}>{row.hasAccount ? labels.account : labels.guest}</MobileDataRow>
                <MobileDataRow label={labels.bookingsCol}>{row.bookingCount}</MobileDataRow>
                <MobileDataRow label={labels.statusCol}>{statusPill(row)}</MobileDataRow>
                <div className="pt-3">{actions(row, false)}</div>
              </MobileDataCard>
            ))
          )
        }
      />

      {details ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-extrabold text-[#0b1f4b]">{labels.detailsTitle}</h3>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                aria-label={labels.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <dl className="space-y-1 text-sm">
                <Detail label={labels.idCol} value={details.customerNumber ? String(details.customerNumber) : "—"} />
                <Detail label={labels.nameCol} value={details.displayName} />
                <Detail label={labels.email} value={details.email || "—"} />
                <Detail label={labels.phone} value={details.phone || "—"} />
                <Detail label={labels.countryCol} value={details.countryLabel || "—"} />
                <Detail label={labels.typeCol} value={details.hasAccount ? labels.account : labels.guest} />
                <Detail
                  label={labels.messenger}
                  value={details.messengers.length ? details.messengers.map(messengerLabel).join(", ") : "—"}
                />
                <Detail label={labels.statusCol} value={details.banned || details.status === "SUSPENDED" ? labels.blocked : labels.active} />
              </dl>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{labels.bookings}</p>
                <ul className="mt-2 space-y-2">
                  {details.bookings.map((booking) => (
                    <li key={booking.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <p className="font-bold text-[#0b1f4b]">#{booking.code}</p>
                      <p className="text-slate-600">
                        {formatWhen(booking.pickupAt, locale)} — {formatWhen(booking.dropoffAt, locale)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">{bookingStatusLabel(booking.status, locale)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {blockRow ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-extrabold text-[#0b1f4b]">{labels.blockTitle}</h3>
              <button
                type="button"
                onClick={() => setBlockRow(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                aria-label={labels.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-slate-600">{labels.blockHelp}</p>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 break-words">
                {blockRow.displayName}
                <br />
                {blockRow.email || "—"} · {blockRow.phone || "—"}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setBlockRow(null)}
                className="min-h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                disabled={busyId === blockRow.id}
                onClick={() => void block(blockRow, "block")}
                className="min-h-11 rounded-md bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {labels.block}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900 break-words">{value || "—"}</dd>
    </div>
  );
}
