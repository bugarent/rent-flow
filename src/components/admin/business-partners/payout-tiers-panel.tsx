"use client";

import { useEffect, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import type { BusinessPartnerSettings } from "@/lib/catalog/business-partners";
import {
  DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS,
  normalizeBusinessPartnerPayoutTiers,
  type BusinessPartnerPayoutTiers,
} from "@/lib/business-partner/payout-tiers";

export function BusinessPartnerPayoutTiersPanel({
  settings,
  onSettingsUpdated,
}: {
  settings: BusinessPartnerSettings;
  onSettingsUpdated?: (next: BusinessPartnerSettings) => void;
}) {
  const L = useBpLabels();
  const [draft, setDraft] = useState<BusinessPartnerPayoutTiers>(() =>
    normalizeBusinessPartnerPayoutTiers(settings.payoutTiers),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setDraft(normalizeBusinessPartnerPayoutTiers(settings.payoutTiers));
  }, [settings.payoutTiers]);

  const midMin = draft.lowMaxBookings + 1;
  const highMin = draft.midMaxBookings + 1;

  const save = async () => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const payoutTiers = normalizeBusinessPartnerPayoutTiers(draft);
      const res = await fetch("/api/admin/business-partners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutTiers }),
      });
      const data = (await res.json()) as {
        settings?: BusinessPartnerSettings;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || L.saveFailed);
      if (data.settings) onSettingsUpdated?.(data.settings);
      setDraft(normalizeBusinessPartnerPayoutTiers(data.settings?.payoutTiers ?? payoutTiers));
      setMsg(L.saved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : L.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const resetDefaults = () => {
    setDraft({ ...DEFAULT_BUSINESS_PARTNER_PAYOUT_TIERS });
    setMsg("");
    setErr("");
  };

  return (
    <section className="leading-none">
      <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0">
        <h3 className="text-[10px] font-extrabold text-[#0b1f4b]">
          {L.tiersTitle}
        </h3>
        <span className="text-[8px] text-slate-400">{L.tiersFrom}</span>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          {msg ? <span className="text-[8px] font-semibold text-emerald-700">{msg}</span> : null}
          {err ? <span className="text-[8px] font-semibold text-rose-700">{err}</span> : null}
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded border border-slate-300 bg-white px-1.5 py-px text-[8px] font-bold leading-none text-slate-700 hover:bg-slate-50"
          >
            {L.defaults}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-[#0b1f4b] px-1.5 py-px text-[8px] font-bold leading-none text-white hover:bg-[#14306a] disabled:opacity-50"
          >
            {busy ? "…" : L.save}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
        <article className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{L.low}</p>
            <p className="text-[11px] text-slate-500">1–{draft.lowMaxBookings} {L.perMonth}</p>
          </div>
          <p className="shrink-0 text-sm font-extrabold text-[#0b1f4b]">{draft.lowPercent}%</p>
          <input
            type="number"
            min={1}
            title={L.maxBookings}
            aria-label={L.lowMax}
            value={draft.lowMaxBookings}
            onChange={(e) =>
              setDraft((d) => ({ ...d, lowMaxBookings: Number(e.target.value) || 1 }))
            }
            className="h-7 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-center text-[11px] font-bold text-[#0b1f4b]"
          />
          <input
            type="number"
            min={1}
            max={100}
            title={L.percent}
            aria-label={L.lowPercent}
            value={draft.lowPercent}
            onChange={(e) =>
              setDraft((d) => ({ ...d, lowPercent: Number(e.target.value) || 1 }))
            }
            className="h-7 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-center text-[11px] font-bold text-[#0b1f4b]"
          />
        </article>

        <article className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{L.mid}</p>
            <p className="text-[11px] text-slate-500">
              {midMin}–{draft.midMaxBookings} {L.perMonth}
            </p>
          </div>
          <p className="shrink-0 text-sm font-extrabold text-sky-700">{draft.midPercent}%</p>
          <input
            type="number"
            min={midMin}
            title={L.maxBookings}
            aria-label={L.midMax}
            value={draft.midMaxBookings}
            onChange={(e) =>
              setDraft((d) => ({ ...d, midMaxBookings: Number(e.target.value) || midMin }))
            }
            className="h-7 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-center text-[11px] font-bold text-[#0b1f4b]"
          />
          <input
            type="number"
            min={1}
            max={100}
            title={L.percent}
            aria-label={L.midPercent}
            value={draft.midPercent}
            onChange={(e) =>
              setDraft((d) => ({ ...d, midPercent: Number(e.target.value) || 1 }))
            }
            className="h-7 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-center text-[11px] font-bold text-[#0b1f4b]"
          />
        </article>

        <article className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{L.high}</p>
            <p className="text-[11px] text-slate-500">{highMin}+ {L.perMonth}</p>
          </div>
          <p className="shrink-0 text-sm font-extrabold text-emerald-700">{draft.highPercent}%</p>
          <input
            type="number"
            min={1}
            max={100}
            title={L.percent}
            aria-label={L.highPercent}
            value={draft.highPercent}
            onChange={(e) =>
              setDraft((d) => ({ ...d, highPercent: Number(e.target.value) || 1 }))
            }
            className="h-7 w-10 shrink-0 rounded border border-slate-300 px-0.5 text-center text-[11px] font-bold text-[#0b1f4b]"
          />
        </article>
      </div>
    </section>
  );
}
