"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { PARTNER_BASE } from "@/lib/routes";
import { capFreeAfterDays } from "@/lib/delivery/pricing";
import { deliveryCopyFor } from "@/components/partner/delivery/delivery-copy";
import { DeliveryCountrySection } from "@/components/partner/delivery/delivery-country-section";
import { DeliveryStatusSwitch } from "@/components/partner/delivery/delivery-status-switch";
import {
  optionsFromResponse,
  prefsPayload,
  rowsFromItems,
  type DeliveryAddOption,
  type DeliveryRowState,
} from "@/components/partner/delivery/delivery-types";

export function PartnerDeliveryPanel() {
  const { locale } = usePartnerLocale();
  const t = useMemo(() => deliveryCopyFor(locale), [locale]);

  const [rows, setRows] = useState<DeliveryRowState[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [options, setOptions] = useState<Record<string, DeliveryAddOption[]>>({});
  const [openCountries, setOpenCountries] = useState<Set<string> | null>(null);
  const [crossBorderEnabled, setCrossBorderEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingCountry, setAddingCountry] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");
  const [capNotice, setCapNotice] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const applyResponse = (data: Record<string, unknown>) => {
    setRows(rowsFromItems(data.items));
    if (Array.isArray(data.countries)) setCountries(data.countries.map(String));
    if (data.options) setOptions(optionsFromResponse(data.options));
    if (typeof data.crossBorderEnabled === "boolean") setCrossBorderEnabled(data.crossBorderEnabled);
  };

  useEffect(() => {
    let cancelled = false;
    const load = (attempt: number) => {
      fetch("/api/partners/delivery-prefs", { cache: "no-store" })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "load failed");
          if (cancelled) return;
          applyResponse(data);
          setLoadFailed(false);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < 1) {
            window.setTimeout(() => {
              if (!cancelled) load(attempt + 1);
            }, 400);
            return;
          }
          setLoadFailed(true);
          setLoading(false);
        });
    };
    load(0);
    return () => {
      cancelled = true;
    };
  }, []);

  const enabledRows = useMemo(() => rows.filter((r) => r.enabled), [rows]);

  /** Operating countries in Personal-info order, plus any country that still has an ON place. */
  const sectionCountries = useMemo(() => {
    const list = countries.map((c) => c.toUpperCase());
    for (const row of enabledRows) {
      const iso = (row.location.countryIso2 || "").toUpperCase();
      if (iso && !list.includes(iso)) list.push(iso);
    }
    return list;
  }, [countries, enabledRows]);

  // First country starts expanded; the others stay collapsed until opened.
  const isOpen = (iso: string) => (openCountries ? openCountries.has(iso) : iso === sectionCountries[0]);
  const setOpen = (iso: string, open: boolean) =>
    setOpenCountries((prev) => {
      const next = new Set(prev ?? (sectionCountries[0] ? [sectionCountries[0]] : []));
      if (open) next.add(iso);
      else next.delete(iso);
      return next;
    });

  const updateRow = (id: string, patch: Partial<DeliveryRowState>) => {
    setRows((prev) => prev.map((row) => (row.location.id === id ? { ...row, ...patch } : row)));
  };

  const setFreeAfterDays = (row: DeliveryRowState, raw: string) => {
    const max = row.location.maxFreeAfterDays;
    const parsed = raw === "" ? null : Math.floor(Number(raw));
    const { freeAfterDays, capped } = capFreeAfterDays(max, Number.isFinite(parsed) ? parsed : null);
    const next = freeAfterDays == null ? "" : String(freeAfterDays);
    updateRow(row.location.id, { freeAfterDays: raw === "" ? "" : next });
    setCapNotice(capped && max != null ? t.freeAfterCapped.replaceAll("{n}", String(max)) : "");
  };

  const persist = async (nextRows: DeliveryRowState[], extra?: { crossBorder?: boolean; add?: string[] }) => {
    const res = await fetch("/api/partners/delivery-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crossBorderEnabled: extra?.crossBorder ?? crossBorderEnabled,
        prefs: prefsPayload(nextRows),
        ...(extra?.add?.length ? { add: extra.add } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data?.items)) throw new Error("save failed");
    applyResponse(data);
    return data;
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSavedFlash(false);
    try {
      await persist(rows);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      setError(t.errSave);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const snapshot = rows;
    const nextRows = rows.map((row) => (row.location.id === id ? { ...row, enabled } : row));
    setRows(nextRows);
    setTogglingId(id);
    setError("");
    try {
      await persist(nextRows);
    } catch {
      setRows(snapshot);
      setError(t.errSave);
    } finally {
      setTogglingId(null);
    }
  };

  const addPlaces = async (iso2: string, ids: string[]) => {
    setAddingCountry(iso2);
    setError("");
    try {
      await persist(rows, { add: ids });
      return true;
    } catch {
      setError(t.errSave);
      return false;
    } finally {
      setAddingCountry(null);
    }
  };

  const toggleCrossBorder = async () => {
    const next = !crossBorderEnabled;
    setCrossBorderEnabled(next);
    setError("");
    try {
      await persist(rows, { crossBorder: next });
    } catch {
      setCrossBorderEnabled(!next);
      setError(t.errSave);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7]">
        <main className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-sm text-slate-600">{t.loading}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="bg-[#3d2a6d] px-4 py-4 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-extrabold sm:text-xl">{t.title}</h1>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4">
        <p className="mb-4 text-sm text-slate-600">{t.help}</p>
        {error || loadFailed ? (
          <p className="mb-3 text-sm font-medium text-red-600">{error || t.errLoad}</p>
        ) : null}
        {capNotice ? <p className="mb-3 text-sm font-medium text-amber-700">{capNotice}</p> : null}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[#0b1f4b]">{t.crossBorderTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500">{t.crossBorderHelp}</p>
          </div>
          <DeliveryStatusSwitch
            checked={crossBorderEnabled}
            onLabel={t.crossBorderOn}
            offLabel={t.crossBorderOff}
            onChange={() => void toggleCrossBorder()}
          />
        </div>

        {!sectionCountries.length ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center">
            <p className="text-sm text-amber-900">{t.emptyCountries}</p>
            <Link
              href={`${PARTNER_BASE}/personal-info`}
              className="mt-3 inline-block min-h-10 text-sm font-bold text-[#1d6fe8] hover:underline"
            >
              {t.openPersonal}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sectionCountries.map((iso2) => (
              <DeliveryCountrySection
                key={iso2}
                iso2={iso2}
                rows={enabledRows.filter((row) => (row.location.countryIso2 || "").toUpperCase() === iso2)}
                options={options[iso2] || []}
                open={isOpen(iso2)}
                adding={addingCountry === iso2}
                locale={locale}
                t={t}
                onOpenChange={(open) => setOpen(iso2, open)}
                onAdd={(ids) => addPlaces(iso2, ids)}
                togglingId={togglingId}
                onToggle={(id, enabled) => void toggleEnabled(id, enabled)}
                onUpdate={updateRow}
                onFreeAfterDays={setFreeAfterDays}
                onPriceCapped={(max) => setCapNotice(t.priceCapped.replaceAll("{amount}", max))}
              />
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving || loadFailed || !enabledRows.length}
            onClick={() => void save()}
            className="min-h-11 rounded-md bg-[#28a745] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#23923d] disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {togglingId ? <span className="text-sm font-semibold text-slate-600">{t.toggling}</span> : null}
          {savedFlash ? <span className="text-sm font-semibold text-emerald-700">{t.saved}</span> : null}
        </div>
      </main>
    </div>
  );
}
