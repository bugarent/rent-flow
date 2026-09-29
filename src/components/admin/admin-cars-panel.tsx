"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_BASE } from "@/lib/routes";
import type { AdminCarRow } from "@/lib/server/load-admin-cars";

function money(n: number) {
  return `€${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function statusClass(status: string) {
  const s = status.toUpperCase();
  if (s === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (s === "PENDING" || s === "PENDING_REMODERATION") return "bg-amber-100 text-amber-900";
  if (s === "REJECTED" || s === "HIDDEN") return "bg-rose-100 text-rose-800";
  if (s === "DRAFT") return "bg-slate-100 text-slate-600";
  return "bg-sky-100 text-sky-800";
}

function normalizeQuery(q: string) {
  return q.trim().toLowerCase().replace(/[\s\-_.]/g, "");
}

function matchesPlate(car: AdminCarRow, q: string) {
  if (!q) return true;
  return normalizeQuery(car.listingCode).includes(q);
}

function matchesPartnerNumber(car: AdminCarRow, q: string) {
  if (!q) return true;
  const hay = [car.partnerCode, car.partnerPhone, car.partnerId]
    .map(normalizeQuery)
    .join(" ");
  return hay.includes(q);
}

/** Shared columns: photo | plate | partner PRT | details | action */
const COL =
  "grid grid-cols-[4.5rem_7rem_8.5rem_minmax(0,1fr)_auto] items-center gap-x-3";

export function AdminCarsPanel({
  cars,
  dbOffline,
  labels,
}: {
  cars: AdminCarRow[];
  dbOffline?: boolean;
  labels: {
    title: string;
    body: string;
    empty: string;
    dbOfflineHint: string;
    details: string;
    delete: string;
    deleteConfirm: string;
    deleteFailed: string;
    partner: string;
    perDay: string;
    searchPlatePlaceholder: string;
    searchPartnerPlaceholder: string;
    searchButton: string;
    searchEmpty: string;
    colPlate: string;
    colPartnerNumber: string;
  };
}) {
  const [rows, setRows] = useState(cars);
  const [plateDraft, setPlateDraft] = useState("");
  const [partnerDraft, setPartnerDraft] = useState("");
  const [plateQuery, setPlateQuery] = useState("");
  const [partnerQuery, setPartnerQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setRows(cars);
  }, [cars]);

  const plateNorm = normalizeQuery(plateQuery);
  const partnerNorm = normalizeQuery(partnerQuery);
  const hasActiveSearch = Boolean(plateNorm || partnerNorm);

  const runSearch = () => {
    setPlateQuery(plateDraft);
    setPartnerQuery(partnerDraft);
  };

  const filtered = useMemo(
    () =>
      rows.filter(
        (car) => matchesPlate(car, plateNorm) && matchesPartnerNumber(car, partnerNorm),
      ),
    [rows, plateNorm, partnerNorm],
  );

  const removeCar = async (car: AdminCarRow) => {
    const plate = car.listingCode || car.id;
    if (!window.confirm(`${labels.deleteConfirm} (${plate})`)) return;
    setDeletingId(car.id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/cars/${encodeURIComponent(car.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : labels.deleteFailed);
      setRows((prev) => prev.filter((row) => row.id !== car.id));
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : labels.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold text-[#0b1f4b]">{labels.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{labels.body}</p>
      </div>

      {dbOffline ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {labels.dbOfflineHint}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
      >
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {labels.colPlate}
          </span>
          <input
            type="search"
            value={plateDraft}
            onChange={(e) => setPlateDraft(e.target.value)}
            placeholder={labels.searchPlatePlaceholder}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0b1f4b] shadow-sm outline-none ring-sky-400 placeholder:font-medium placeholder:text-slate-400 focus:border-sky-400 focus:ring-2"
          />
        </label>
        <label className="min-w-0 flex-1 sm:max-w-xs">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {labels.colPartnerNumber}
          </span>
          <input
            type="search"
            value={partnerDraft}
            onChange={(e) => setPartnerDraft(e.target.value)}
            placeholder={labels.searchPartnerPlaceholder}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#0b1f4b] shadow-sm outline-none ring-sky-400 placeholder:font-medium placeholder:text-slate-400 focus:border-sky-400 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#14306a]"
        >
          {labels.searchButton}
        </button>
        <p className="shrink-0 self-center text-sm font-semibold text-slate-500 sm:ms-auto">
          {filtered.length}
          {hasActiveSearch ? ` / ${rows.length}` : ""} {labels.title.toLowerCase()}
        </p>
      </form>

      {deleteError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {deleteError}
        </p>
      ) : null}

      <div className="space-y-2 overflow-x-auto">
        <div
          className={`hidden sm:grid ${COL} rounded-lg bg-[#0b1f4b] px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white`}
        >
          <span aria-hidden="true" />
          <span>{labels.colPlate}</span>
          <span>{labels.colPartnerNumber}</span>
          <span />
          <span />
        </div>

        {filtered.map((car) => (
          <article
            key={car.id}
            className={`${COL} rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm max-sm:!flex max-sm:!grid-cols-none max-sm:flex-col max-sm:items-stretch max-sm:gap-2 max-sm:px-2.5`}
          >
            <div className="h-12 w-[4.5rem] shrink-0 overflow-hidden rounded bg-slate-100 ring-1 ring-slate-200">
              {car.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={car.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
                  —
                </div>
              )}
            </div>

            <div className="min-w-0 leading-tight">
              <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                {labels.colPlate}
              </p>
              <p className="truncate font-mono text-xs font-black tracking-wide text-[#0b1f4b]">
                {car.listingCode}
              </p>
            </div>

            <div className="min-w-0 leading-tight">
              <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400 sm:hidden">
                {labels.colPartnerNumber}
              </p>
              <p className="truncate font-mono text-xs font-black tracking-wide text-[#0b1f4b]">
                {car.partnerCode || "—"}
              </p>
            </div>

            <div className="min-w-0 leading-tight">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="truncate text-sm font-extrabold text-[#0b1f4b]">
                  {car.make} {car.model}
                </p>
                <span
                  className={`rounded-full px-1.5 py-px text-[9px] font-extrabold uppercase leading-none ${statusClass(car.status)}`}
                >
                  {car.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">
                {car.year} · {car.country} · {car.bodyType}
                <span className="ms-2 font-medium text-slate-400">
                  {labels.partner}: {car.partnerName}
                </span>
              </p>
              <p className="mt-0.5 text-xs font-bold text-sky-700">
                {money(car.dailyRateEur)}
                <span className="ms-1 text-[10px] font-semibold text-slate-500">
                  / {labels.perDay}
                </span>
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 justify-self-end">
              <Link
                href={`${ADMIN_BASE}/moderation/listings/${encodeURIComponent(car.id)}`}
                className="inline-flex rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-[#0b1f4b] hover:bg-slate-50"
              >
                {labels.details}
              </Link>
              <button
                type="button"
                disabled={deletingId === car.id}
                onClick={() => void removeCar(car)}
                className="inline-flex rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deletingId === car.id ? "…" : labels.delete}
              </button>
            </div>
          </article>
        ))}

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {labels.empty}
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {labels.searchEmpty}
          </p>
        ) : null}
      </div>
    </section>
  );
}
