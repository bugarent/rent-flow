"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { extrasAdminCopy } from "@/lib/i18n/extras-admin-copy";
import { knownText } from "@/lib/i18n/known-record-text";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import { isMandatoryExtra, isMandatoryPricedExtra } from "@/lib/extras/pricing";
import {
  checkoutSlotLabel,
  type ExtraCheckoutSlot,
} from "@/lib/extras/checkout-slot";
import { ExtraPriceWindows } from "@/components/admin/extras/extra-price-windows";
import { cn } from "@/lib/utils";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type FormState = {
  name: string;
  description: string;
  minPriceEur: string;
  maxPriceEur: string;
  maxPeriodEur: string;
  isActive: boolean;
  checkoutSlot: ExtraCheckoutSlot;
};

const LONG_PRESS_MS = 420;

function blankForm(): FormState {
  return {
    name: "",
    description: "",
    minPriceEur: "",
    maxPriceEur: "",
    maxPeriodEur: "",
    isActive: true,
    checkoutSlot: "none",
  };
}

function moveItem(list: ExtraServicePricing[], fromId: string, toId: string) {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((i) => i.id === fromId);
  const toIndex = list.findIndex((i) => i.id === toId);
  if (fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

const SLOT_OPTIONS: ExtraCheckoutSlot[] = ["none", "tpl", "basic", "full", "driver"];

/** System TPL pack (seed slug `tpl`) stays mandatory and free. */
function isCorePackTpl(item: ExtraServicePricing) {
  return item.slug === "tpl";
}

export function ExtrasManager({ initialExtras }: { initialExtras: ExtraServicePricing[] }) {
  const { locale } = useAdminLocale();
  const copy = extrasAdminCopy(locale);
  const text = (value: string) => knownText(locale, value);
  const [extras, setExtras] = useState(() =>
    [...initialExtras].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
  );
  const [form, setForm] = useState<FormState>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<{ name: string; description: string } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragActive = useRef(false);
  const draggingIdRef = useRef<string | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const orderBeforeDrag = useRef<ExtraServicePricing[] | null>(null);
  const extrasRef = useRef(extras);
  useLayoutEffect(() => {
    extrasRef.current = extras;
  });

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    holdOrigin.current = null;
  };

  const persistOrder = useCallback(async (next: ExtraServicePricing[]) => {
    setOrderSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/extras/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((e) => e.id) }),
      });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data && "error" in data
            ? String((data as { error?: string }).error || "Could not reorder")
            : "Could not reorder",
        );
      }
      if (Array.isArray(data) && data.length) {
        setExtras(
          [...(data as ExtraServicePricing[])].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        );
      } else {
        setExtras(next.map((row, index) => ({ ...row, sortOrder: index })));
      }
    } catch (err) {
      if (orderBeforeDrag.current) setExtras(orderBeforeDrag.current);
      setError(err instanceof Error ? err.message : "Could not reorder");
    } finally {
      setOrderSaving(false);
      orderBeforeDrag.current = null;
    }
  }, []);

  const endDrag = useCallback(
    async (commit: boolean) => {
      clearHold();
      const wasDragging = dragActive.current;
      const id = draggingIdRef.current;
      dragActive.current = false;
      draggingIdRef.current = null;
      pointerIdRef.current = null;
      setDraggingId(null);
      setOverId(null);
      if (!wasDragging || !id) return;
      if (!commit) {
        if (orderBeforeDrag.current) setExtras(orderBeforeDrag.current);
        orderBeforeDrag.current = null;
        return;
      }
      const next = extrasRef.current;
      const changed =
        !orderBeforeDrag.current ||
        orderBeforeDrag.current.length !== next.length ||
        orderBeforeDrag.current.some((row, i) => row.id !== next[i]?.id);
      if (changed) await persistOrder(next);
      else orderBeforeDrag.current = null;
    },
    [persistOrder],
  );

  const onRowPointerDown = (itemId: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Don't start long-press from action buttons / links.
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label")) return;

    clearHold();
    pointerIdRef.current = e.pointerId;
    holdOrigin.current = { x: e.clientX, y: e.clientY };
    holdTimer.current = setTimeout(() => {
      dragActive.current = true;
      draggingIdRef.current = itemId;
      orderBeforeDrag.current = extrasRef.current;
      setDraggingId(itemId);
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }, LONG_PRESS_MS);
  };

  const onRowPointerMove = (_overItemId: string, e: React.PointerEvent) => {
    if (!dragActive.current) {
      // Cancel long-press if the pointer moves before it arms.
      if (holdTimer.current && holdOrigin.current) {
        const dx = Math.abs(e.clientX - holdOrigin.current.x);
        const dy = Math.abs(e.clientY - holdOrigin.current.y);
        if (dx > 8 || dy > 8) clearHold();
      }
      return;
    }
    const fromId = draggingIdRef.current;
    if (!fromId) return;
    e.preventDefault();

    // With pointer capture, use hit-testing to find the row under the cursor.
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("tr[data-extra-id]") as HTMLElement | null;
    const hitId = row?.dataset.extraId;
    if (!hitId) return;
    setOverId((prev) => (prev === hitId ? prev : hitId));
    if (hitId === fromId) return;
    setExtras((prev) => moveItem(prev, fromId, hitId));
  };

  const onRowPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    void endDrag(true);
  };

  const onRowPointerCancel = () => {
    void endDrag(false);
  };

  const parseOptionalNumber = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    if (!editSource) return;
    setForm((prev) => ({
      ...prev,
      name: knownText(locale, editSource.name),
      description: knownText(locale, editSource.description),
    }));
  }, [locale, editSource]);

  const startEdit = (item: ExtraServicePricing) => {
    const source = { name: item.name, description: item.description || "" };
    setEditingId(item.id);
    setEditSource(source);
    setForm({
      name: knownText(locale, source.name),
      description: knownText(locale, source.description),
      minPriceEur: item.minPriceEur == null ? "" : String(item.minPriceEur),
      maxPriceEur: item.maxPriceEur == null ? "" : String(item.maxPriceEur),
      maxPeriodEur: item.maxPeriodEur == null ? "" : String(item.maxPeriodEur),
      isActive: item.isActive,
      checkoutSlot: item.checkoutSlot || "none",
    });
    setError("");
  };

  const reset = () => {
    setEditingId(null);
    setEditSource(null);
    setForm(blankForm());
    setError("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError(copy.nameRequired);
      return;
    }
    const minPriceEur = parseOptionalNumber(form.minPriceEur);
    const maxPriceEur = parseOptionalNumber(form.maxPriceEur);
    const maxPeriodEur = parseOptionalNumber(form.maxPeriodEur);
    if (minPriceEur != null && minPriceEur < 0) {
      setError(copy.minNegative);
      return;
    }
    if (maxPriceEur != null && maxPriceEur < 0) {
      setError(copy.maxNegative);
      return;
    }
    if (minPriceEur != null && maxPriceEur != null && maxPriceEur < minPriceEur) {
      setError(copy.maxBelowMin);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editSource && locale !== "en" ? editSource.name : form.name.trim(),
        description: editSource && locale !== "en" ? editSource.description : form.description.trim(),
        minPriceEur,
        maxPriceEur,
        maxPeriodEur,
        isActive: form.isActive,
        checkoutSlot: form.checkoutSlot,
        ...(editingId ? {} : { defaultPriceEur: minPriceEur ?? 0 }),
      };
      const url = editingId ? `/api/admin/extras/${editingId}` : "/api/admin/extras";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || copy.saveFailed);
      setExtras((prev) => {
        if (editingId) return prev.map((x) => (x.id === data.id ? data : x));
        return [...prev, data].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const saveRowBounds = async (
    item: ExtraServicePricing,
    bounds: { minPriceEur: number | null; maxPriceEur: number | null; maxPeriodEur: number | null },
  ) => {
    setError("");
    if (bounds.minPriceEur != null && bounds.minPriceEur < 0) {
      setError(copy.minNegative);
      return;
    }
    if (bounds.maxPriceEur != null && bounds.maxPriceEur < 0) {
      setError(copy.maxNegative);
      return;
    }
    if (
      bounds.minPriceEur != null &&
      bounds.maxPriceEur != null &&
      bounds.maxPriceEur < bounds.minPriceEur
    ) {
      setError(copy.maxBelowMin);
      return;
    }
    setSavingRowId(item.id);
    try {
      const res = await fetch(`/api/admin/extras/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minPriceEur: bounds.minPriceEur,
          maxPriceEur: bounds.maxPriceEur,
          maxPeriodEur: bounds.maxPeriodEur,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || copy.saveFailed);
      setExtras((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      if (editingId === item.id) {
        setForm((prev) => ({
          ...prev,
          minPriceEur: data.minPriceEur == null ? "" : String(data.minPriceEur),
          maxPriceEur: data.maxPriceEur == null ? "" : String(data.maxPriceEur),
          maxPeriodEur: data.maxPeriodEur == null ? "" : String(data.maxPeriodEur),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveFailed);
    } finally {
      setSavingRowId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(copy.confirmDelete)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/extras/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      setExtras((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const toggleMandatory = async (item: ExtraServicePricing) => {
    if (isCorePackTpl(item)) return;
    const makeMandatory = !isMandatoryExtra(item);
    setTogglingId(item.id);
    setError("");
    try {
      const payload = makeMandatory
        ? {
            isTpl: true,
            isActive: true,
            checkoutSlot: item.checkoutSlot || "none",
          }
        : {
            isTpl: false,
            checkoutSlot: item.checkoutSlot || "none",
          };
      const res = await fetch(`/api/admin/extras/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update");
      setExtras((prev) => prev.map((x) => (x.id === data.id ? data : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

      <p className="text-xs text-slate-500">
        {orderSaving ? copy.orderSaving : copy.dragHint}
      </p>

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="w-8 p-3" aria-hidden />
                  <th className="p-3">{copy.service}</th>
                  <th className="p-3">{copy.checkoutPlace}</th>
                  <th className="p-3">{copy.priceRules}</th>
                  <th className="p-3">{copy.status}</th>
                  <th className="p-3">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {extras.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      {copy.empty}
                    </td>
                  </tr>
                ) : (
                  extras.map((item) => {
                    const mandatory = isMandatoryExtra(item);
                    const corePack = isCorePackTpl(item);
                    const isDragging = draggingId === item.id;
                    const isOver = overId === item.id && draggingId !== item.id;
                    return (
                      <tr
                        key={item.id}
                        data-extra-id={item.id}
                        onPointerDown={(e) => onRowPointerDown(item.id, e)}
                        onPointerEnter={(e) => {
                          if (dragActive.current) onRowPointerMove(item.id, e);
                        }}
                        onPointerMove={(e) => onRowPointerMove(item.id, e)}
                        onPointerUp={onRowPointerUp}
                        onPointerCancel={onRowPointerCancel}
                        className={cn(
                          "border-t align-top select-none touch-none",
                          isDragging && "bg-sky-50 opacity-70",
                          isOver && "ring-2 ring-inset ring-sky-400",
                          draggingId && !isDragging && "cursor-grabbing",
                          !draggingId && "cursor-grab",
                        )}
                      >
                        <td className="p-3 text-slate-400">
                          <GripVertical className="h-4 w-4" aria-hidden />
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-[#0b1f4b]">{text(item.name)}</p>
                          {item.description ? (
                            <p className="text-xs text-slate-500">{text(item.description)}</p>
                          ) : null}
                          {corePack ? (
                            <p className="mt-1 text-xs font-semibold text-sky-700">{copy.tplHint}</p>
                          ) : mandatory ? (
                            <p className="mt-1 text-xs font-semibold text-emerald-700">
                              {isMandatoryPricedExtra(item)
                                ? copy.mandatoryPricedHint
                                : copy.mandatoryHint}
                            </p>
                          ) : null}
                        </td>
                        <td className="p-3 text-xs font-semibold text-slate-700">
                          {text(checkoutSlotLabel(item.checkoutSlot || "none"))}
                        </td>
                        <td className="p-3">
                          <ExtraPriceWindows
                            item={item}
                            disabled={corePack}
                            saving={savingRowId === item.id}
                            copy={{
                              minDay: copy.rowMin,
                              maxDay: copy.rowMax,
                              periodMax: copy.rowPeriod,
                              minDayHint: copy.minDayHint,
                              maxDayHint: copy.maxDayHint,
                              periodHint: copy.periodHint,
                            }}
                            onCommit={(bounds) => void saveRowBounds(item, bounds)}
                          />
                        </td>
                        <td className="p-3">{item.isActive ? copy.active : copy.inactive}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="text-sm font-semibold text-sky-700"
                              onClick={() => startEdit(item)}
                            >
                              {copy.edit}
                            </button>
                            {!mandatory ? (
                              <button
                                type="button"
                                className="text-sm font-semibold text-red-600"
                                onClick={() => remove(item.id)}
                              >
                                {copy.delete}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={corePack || togglingId === item.id}
                              onClick={() => toggleMandatory(item)}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                                mandatory
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                              )}
                              title={copy.formHint}
                            >
                              {togglingId === item.id
                                ? "…"
                                : mandatory
                                  ? copy.mandatoryOn
                                  : copy.mandatory}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          extras.length === 0 ? (
            <p className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
              {copy.empty}
            </p>
          ) : (
            extras.map((item) => {
              const mandatory = isMandatoryExtra(item);
              const corePack = isCorePackTpl(item);
              return (
                <MobileDataCard key={item.id}>
                  <MobileDataRow label={copy.service}>
                    <div className="text-end">
                      <p className="font-semibold text-[#0b1f4b]">{text(item.name)}</p>
                      {item.description ? (
                        <p className="text-xs font-medium text-slate-500">{text(item.description)}</p>
                      ) : null}
                      {corePack ? (
                        <p className="mt-1 text-xs font-semibold text-sky-700">{copy.tplHint}</p>
                      ) : mandatory ? (
                        <p className="mt-1 text-xs font-semibold text-emerald-700">
                          {isMandatoryPricedExtra(item) ? copy.mandatoryPricedHint : copy.mandatoryHint}
                        </p>
                      ) : null}
                    </div>
                  </MobileDataRow>
                  <MobileDataRow label={copy.checkoutPlace}>
                    <span className="text-xs font-semibold text-slate-700">
                      {text(checkoutSlotLabel(item.checkoutSlot || "none"))}
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={copy.priceRules} className="!items-stretch">
                    <div className="w-full max-w-none text-start">
                      <ExtraPriceWindows
                        item={item}
                        disabled={corePack}
                        saving={savingRowId === item.id}
                        copy={{
                          minDay: copy.rowMin,
                          maxDay: copy.rowMax,
                          periodMax: copy.rowPeriod,
                          minDayHint: copy.minDayHint,
                          maxDayHint: copy.maxDayHint,
                          periodHint: copy.periodHint,
                        }}
                        onCommit={(bounds) => void saveRowBounds(item, bounds)}
                      />
                    </div>
                  </MobileDataRow>
                  <MobileDataRow label={copy.status}>
                    {item.isActive ? copy.active : copy.inactive}
                  </MobileDataRow>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      className="min-h-11 px-3 text-sm font-semibold text-sky-700"
                      onClick={() => startEdit(item)}
                    >
                      {copy.edit}
                    </button>
                    {!mandatory ? (
                      <button
                        type="button"
                        className="min-h-11 px-3 text-sm font-semibold text-red-600"
                        onClick={() => remove(item.id)}
                      >
                        {copy.delete}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={corePack || togglingId === item.id}
                      onClick={() => toggleMandatory(item)}
                      className={cn(
                        "min-h-11 rounded-full border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
                        mandatory
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                      )}
                      title={copy.formHint}
                    >
                      {togglingId === item.id
                        ? "…"
                        : mandatory
                          ? copy.mandatoryOn
                          : copy.mandatory}
                    </button>
                  </div>
                </MobileDataCard>
              );
            })
          )
        }
      />

      <form onSubmit={save} className="space-y-3 rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-extrabold">{editingId ? copy.formTitleEdit : copy.formTitleAdd}</h2>
        <p className="text-xs text-slate-500">{copy.formHint}</p>
        <input
          className="w-full rounded-xl border p-3"
          placeholder={copy.namePh}
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />
        <textarea
          className="min-h-24 w-full rounded-xl border p-3"
          placeholder={copy.descPh}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <label className="block text-sm font-semibold">
          {copy.checkoutPlaceLabel}
          <select
            className="mt-1 w-full rounded-xl border p-3 font-normal"
            value={form.checkoutSlot}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, checkoutSlot: e.target.value as ExtraCheckoutSlot }))
            }
          >
            {SLOT_OPTIONS.map((slot) => (
              <option key={slot} value={slot}>
                {text(checkoutSlotLabel(slot))}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            {copy.minDay}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border p-3 font-normal"
              placeholder="0"
              value={form.minPriceEur}
              onChange={(e) => setForm((prev) => ({ ...prev, minPriceEur: e.target.value }))}
            />
            <span className="mt-1 block text-[11px] font-medium text-slate-500">{copy.minDayHint}</span>
          </label>
          <label className="text-sm font-semibold">
            {copy.maxDay}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border p-3 font-normal"
              placeholder="10"
              value={form.maxPriceEur}
              onChange={(e) => setForm((prev) => ({ ...prev, maxPriceEur: e.target.value }))}
            />
            <span className="mt-1 block text-[11px] font-medium text-slate-500">{copy.maxDayHint}</span>
          </label>
          <label className="text-sm font-semibold">
            {copy.periodMax}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/40 p-3 font-normal"
              placeholder="20"
              value={form.maxPeriodEur}
              onChange={(e) => setForm((prev) => ({ ...prev, maxPeriodEur: e.target.value }))}
            />
            <span className="mt-1 block text-[11px] font-medium text-amber-900/80">{copy.periodHint}</span>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          {copy.activePartners}
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white disabled:bg-slate-400"
          >
            {saving ? copy.saving : editingId ? copy.save : copy.add}
          </button>
          {editingId ? (
            <button type="button" className="rounded-xl border px-5 py-2.5 font-semibold" onClick={reset}>
              {copy.cancel}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
