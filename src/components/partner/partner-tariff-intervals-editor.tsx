"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TariffInterval,
  normalizeTariffIntervals,
  tariffPlusFromDays,
} from "@/lib/partners/company-settings";

/**
 * Day ranges the partner prices cars by. The “to” field keeps what the partner types and is
 * normalized only on blur/Enter, so typing “30” into a row that starts at 6 is not clamped to 6
 * after the first digit.
 */
export function PartnerTariffIntervalsEditor({
  tariffs,
  maxIntervals,
  onChange,
  inputClass,
  accent,
  labels,
}: {
  tariffs: TariffInterval[];
  maxIntervals: number;
  onChange: (next: TariffInterval[]) => void;
  inputClass: string;
  accent: string;
  labels: {
    fromDays: string;
    toDays: string;
    addInterval: string;
    removeInterval: string;
    /** Contains `{n}` for the first day of the open-ended bucket. */
    daysPlus: string;
  };
}) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const commit = (rows: TariffInterval[]) => onChange(normalizeTariffIntervals(rows, maxIntervals));

  const commitDraft = (index: number) => {
    const raw = drafts[index];
    if (raw === undefined) return;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    const n = Math.floor(Number(raw));
    if (!raw.trim() || !Number.isFinite(n)) return;
    commit(tariffs.map((row, i) => (i === index ? { ...row, toDays: n } : { ...row })));
  };

  const add = () => {
    if (tariffs.length >= maxIntervals) return;
    setDrafts({});
    const fromDays = tariffPlusFromDays(tariffs);
    commit([...tariffs, { fromDays, toDays: fromDays }]);
  };

  const remove = (index: number) => {
    setDrafts({});
    commit(tariffs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {tariffs.map((t, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500">{labels.fromDays}</span>
          <input
            className={cn(inputClass, "w-20 bg-slate-50 text-slate-700 sm:w-24")}
            type="number"
            readOnly
            tabIndex={-1}
            value={t.fromDays}
          />
          <span className="text-sm text-slate-500">{labels.toDays}</span>
          <input
            className={cn(inputClass, "w-20 sm:w-24")}
            type="number"
            inputMode="numeric"
            min={t.fromDays}
            max={999}
            value={drafts[index] ?? String(t.toDays)}
            onChange={(e) => {
              const value = e.target.value;
              setDrafts((prev) => ({ ...prev, [index]: value }));
            }}
            onBlur={() => commitDraft(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft(index);
              }
            }}
          />
          <button
            type="button"
            aria-label={labels.removeInterval}
            title={labels.removeInterval}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-red-700 hover:bg-red-50 disabled:opacity-40"
            disabled={tariffs.length <= 1}
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500">
        {labels.daysPlus.replace("{n}", String(tariffPlusFromDays(tariffs)))}
      </div>
      {tariffs.length < maxIntervals ? (
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: accent }}
          onClick={add}
        >
          <Plus className="h-4 w-4" /> {labels.addInterval}
        </button>
      ) : null}
    </div>
  );
}
