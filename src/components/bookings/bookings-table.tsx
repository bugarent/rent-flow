"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Eye, Search, SlidersHorizontal, X } from "lucide-react";
import { formatBookingRef } from "@/lib/ids";
import {
  bookingMatchesStatusFilter,
  bookingsTableStatusTone,
  countBookingsByStatusFilter,
  isActiveBookingStatus,
  rentalHasEnded,
  type BookingsTableStatusFilter,
} from "@/lib/bookings/table-filters";
import { cn, formatMoneyAmount } from "@/lib/utils";
import { isCurrency, type Currency } from "@/lib/i18n/config";
import { getBookingsTableCopy, type BookingsTableCopy } from "@/components/bookings/bookings-table-copy";

export type BookingsTableRow = {
  id: string;
  sequentialNumber?: number;
  reference?: string | null;
  status: string;
  carLabel: string;
  carImageUrl?: string | null;
  driverName: string;
  driverEmail?: string;
  pickupAt: string;
  dropoffAt: string;
  totalPrice: number;
  /** Amount the partner collects when the car is picked up. */
  dueAtPickup?: number;
  currency?: string;
  /** Business-partner referral code when the guest booked via that code or QR. */
  businessPartnerCode?: string;
};

const PAGE_SIZE = 25;

function formatDateDdMmYyyy(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function statusLabel(status: string, copy: BookingsTableCopy, ended = false) {
  if (ended && isActiveBookingStatus(status)) return copy.completed;
  const tone = bookingsTableStatusTone(status);
  if (tone === "paid") return copy.paid;
  if (tone === "cancelled") return copy.cancelled;
  if (tone === "empty") return copy.empty;
  return status;
}

function StatusBadge({
  status,
  copy,
  ended = false,
}: {
  status: string;
  copy: BookingsTableCopy;
  ended?: boolean;
}) {
  const tone = ended && isActiveBookingStatus(status) ? "neutral" : bookingsTableStatusTone(status);
  const label = statusLabel(status, copy, ended);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "paid" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        tone === "cancelled" && "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
        tone === "empty" && "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        tone === "neutral" && "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
      )}
    >
      {tone === "paid" ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
      {tone === "cancelled" ? <X className="h-3.5 w-3.5" aria-hidden /> : null}
      {label}
    </span>
  );
}

function BusinessPartnerCode({ code, label }: { code?: string; label: string }) {
  const value = String(code || "").trim();
  if (!value) return null;
  return (
    <span className="mt-1 block text-[11px] font-bold leading-tight text-[#0b1f4b]">
      <span className="font-semibold text-violet-800">{label}</span>{" "}
      <span className="font-mono tracking-wide">{value}</span>
    </span>
  );
}

function FilterDot({ tone }: { tone: BookingsTableStatusFilter }) {
  return (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        tone === "all" && "bg-[#1d6fe8]",
        tone === "paid" && "bg-emerald-500",
        tone === "cancelled" && "bg-rose-500",
        tone === "empty" && "bg-slate-400",
      )}
      aria-hidden
    />
  );
}

export function BookingsTable({
  rows,
  locale,
  currency = "EUR",
  onView,
  showCheckboxes = true,
  showFiltersButton = true,
  showAllPill = true,
  showToolbar = true,
  initialFilter = "all",
  labelEndedBookings = false,
  showPickupDue = false,
  attentionRowIds = [],
  attentionFilter,
  renderRowActions,
  className,
}: {
  rows: BookingsTableRow[];
  locale: string;
  currency?: string;
  onView?: (row: BookingsTableRow) => void;
  showCheckboxes?: boolean;
  showFiltersButton?: boolean;
  /** “All” status pill. Admin can hide it. */
  showAllPill?: boolean;
  /** Search field and status pills. Hidden on the customer booking lookup. */
  showToolbar?: boolean;
  /** Status filter selected when the table first mounts. */
  initialFilter?: BookingsTableStatusFilter;
  /** Past return time is shown as completed instead of active. */
  labelEndedBookings?: boolean;
  /** Partner list: total price and the amount due when the car is picked up. */
  showPickupDue?: boolean;
  /** Rows that still need attention — highlighted until opened. */
  attentionRowIds?: string[];
  /** Status pill that leads to those rows. */
  attentionFilter?: BookingsTableStatusFilter;
  renderRowActions?: (row: BookingsTableRow) => ReactNode;
  className?: string;
}) {
  const copy = getBookingsTableCopy(locale);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BookingsTableStatusFilter>(initialFilter);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  const counts = useMemo(() => countBookingsByStatusFilter(rows), [rows]);
  const attentionIds = useMemo(() => new Set(attentionRowIds), [attentionRowIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!bookingMatchesStatusFilter(row, filter)) return false;
      if (!q) return true;
      const ref =
        row.reference ||
        (row.sequentialNumber != null ? formatBookingRef(row.sequentialNumber) : "") ||
        "";
      const hay = [
        row.carLabel,
        row.driverName,
        row.driverEmail || "",
        ref,
        String(row.sequentialNumber || ""),
        row.status,
        row.businessPartnerCode || "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const allSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const row of pageRows) next.delete(row.id);
      } else {
        for (const row of pageRows) next.add(row.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pills: Array<{ id: BookingsTableStatusFilter; label: string }> = [
    ...(showAllPill ? [{ id: "all" as const, label: copy.all }] : []),
    { id: "paid", label: copy.paid },
    { id: "cancelled", label: copy.cancelled },
    { id: "empty", label: copy.empty },
  ];

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#0b1f4b]">
          {copy.title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
            {filtered.length}
          </span>
        </h2>
      </div>

      {showToolbar ? (
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.search}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pe-3 ps-9 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {pills.map((pill) => {
            const active = filter === pill.id;
            const count = counts[pill.id];
            const alert = attentionFilter === pill.id && attentionIds.size > 0;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilter(pill.id)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition",
                  alert
                    ? "admin-nav-unread-blink font-extrabold text-[#0b1f4b]"
                    : active
                      ? "bg-[#1d6fe8] text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
                )}
              >
                {pill.id !== "all" && !alert ? <FilterDot tone={pill.id} /> : null}
                {pill.label}
                {alert ? (
                  <span className="rounded-full bg-[#0b1f4b] px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                    {attentionIds.size > 99 ? "99+" : attentionIds.size}
                  </span>
                ) : !active && count > 0 ? (
                  <span className="text-xs opacity-70">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {showFiltersButton ? (
          <button
            type="button"
            className="ms-auto inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {copy.filters}
          </button>
        ) : null}
      </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              {showCheckboxes ? (
                <th className="px-3 py-3 sm:px-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={copy.all}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
              ) : null}
              <th className="px-3 py-3 font-bold sm:px-4">{copy.colCar}</th>
              <th className="px-3 py-3 font-bold sm:px-4">{copy.colDriver}</th>
              <th className="px-3 py-3 font-bold sm:px-4">{copy.colFrom}</th>
              <th className="px-3 py-3 font-bold sm:px-4">{copy.colTo}</th>
              <th className="px-3 py-3 font-bold sm:px-4">
                {showPickupDue ? (
                  <span className="flex flex-col gap-0.5 normal-case tracking-normal">
                    <span>{copy.colTotal}</span>
                    <span className="text-amber-700">{copy.colDueAtPickup}</span>
                  </span>
                ) : (
                  copy.colPrice
                )}
              </th>
              <th className="px-3 py-3 font-bold sm:px-4">{copy.colStatus}</th>
              <th className="px-3 py-3 sm:px-4">
                <span className="sr-only">{copy.view}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={showCheckboxes ? 8 : 7}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  {copy.noRows}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const priceCurrency = row.currency || currency;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-slate-100 last:border-0",
                      attentionIds.has(row.id)
                        ? "bg-amber-100 hover:bg-amber-200/70"
                        : "hover:bg-slate-50/60",
                    )}
                  >
                    {showCheckboxes ? (
                      <td className="px-3 py-3 sm:px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          aria-label={row.driverName}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                          {row.carImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.carImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                              CAR
                            </span>
                          )}
                        </span>
                        <span>
                          <span className="block font-semibold text-[#0b1f4b]">{row.carLabel || "—"}</span>
                          <BusinessPartnerCode code={row.businessPartnerCode} label={copy.businessPartnerCode} />
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <button
                        type="button"
                        onClick={() => onView?.(row)}
                        className="font-semibold text-[#0b1f4b] underline decoration-slate-300 underline-offset-2 hover:text-[#1d6fe8] hover:decoration-[#1d6fe8]"
                      >
                        {row.driverName || "—"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700 sm:px-4">
                      {formatDateDdMmYyyy(row.pickupAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700 sm:px-4">
                      {formatDateDdMmYyyy(row.dropoffAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-extrabold text-[#0b1f4b] sm:px-4">
                      {showPickupDue ? (
                        <div className="space-y-1">
                          <p className="tabular-nums">
                            {formatMoneyAmount(
                              row.totalPrice || 0,
                              (isCurrency(priceCurrency) ? priceCurrency : "EUR") as Currency,
                            )}
                          </p>
                          <p className="tabular-nums text-amber-800">
                            {formatMoneyAmount(
                              row.dueAtPickup || 0,
                              (isCurrency(priceCurrency) ? priceCurrency : "EUR") as Currency,
                            )}
                          </p>
                        </div>
                      ) : (
                        formatMoneyAmount(
                          row.totalPrice || 0,
                          (isCurrency(priceCurrency) ? priceCurrency : "EUR") as Currency,
                        )
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <StatusBadge
                        status={row.status}
                        copy={copy}
                        ended={labelEndedBookings && rentalHasEnded(row.dropoffAt)}
                      />
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {renderRowActions?.(row)}
                        {onView ? (
                          <button
                            type="button"
                            onClick={() => onView(row)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#1d6fe8]"
                            aria-label={copy.view}
                            title={copy.view}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {pageRows.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-500">{copy.noRows}</p>
        ) : (
          pageRows.map((row) => {
            const priceCurrency = row.currency || currency;
            const moneyCur = (isCurrency(priceCurrency) ? priceCurrency : "EUR") as Currency;
            return (
              <article
                key={row.id}
                className={cn(
                  "rounded-xl border border-slate-200 p-3.5 shadow-sm",
                  attentionIds.has(row.id) ? "border-amber-300 bg-amber-50" : "bg-white",
                )}
              >
                <div className="flex items-start gap-3">
                  {showCheckboxes ? (
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={row.driverName}
                      className="mt-1 h-5 w-5 rounded border-slate-300"
                    />
                  ) : null}
                  <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                    {row.carImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.carImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-400">
                        CAR
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0b1f4b]">
                      {row.carLabel || "—"}
                    </p>
                    <BusinessPartnerCode code={row.businessPartnerCode} label={copy.businessPartnerCode} />
                    <button
                      type="button"
                      onClick={() => onView?.(row)}
                      className="mt-0.5 text-sm font-semibold text-[#1d6fe8] underline-offset-2 hover:underline"
                    >
                      {row.driverName || "—"}
                    </button>
                  </div>
                  <StatusBadge
                    status={row.status}
                    copy={copy}
                    ended={labelEndedBookings && rentalHasEnded(row.dropoffAt)}
                  />
                </div>

                <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{copy.colFrom}</dt>
                    <dd className="font-semibold text-slate-800">{formatDateDdMmYyyy(row.pickupAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{copy.colTo}</dt>
                    <dd className="font-semibold text-slate-800">{formatDateDdMmYyyy(row.dropoffAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">{showPickupDue ? copy.colTotal : copy.colPrice}</dt>
                    <dd className="font-extrabold tabular-nums text-[#0b1f4b]">
                      {formatMoneyAmount(row.totalPrice || 0, moneyCur)}
                    </dd>
                  </div>
                  {showPickupDue ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-amber-700">{copy.colDueAtPickup}</dt>
                      <dd className="font-extrabold tabular-nums text-amber-800">
                        {formatMoneyAmount(row.dueAtPickup || 0, moneyCur)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  {renderRowActions?.(row)}
                  {onView ? (
                    <button
                      type="button"
                      onClick={() => onView(row)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-[#0b1f4b] hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      {copy.view}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {pageCount > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-3"
          aria-label={copy.title}
        >
          {Array.from({ length: pageCount }, (_, index) => {
            const number = index + 1;
            const active = number === currentPage;
            return (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-bold tabular-nums",
                  active
                    ? "bg-[#1d6fe8] text-white"
                    : "bg-white text-[#0b1f4b] ring-1 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {number}
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
