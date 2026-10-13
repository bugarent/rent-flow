"use client";

import { Send } from "lucide-react";
import { partnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

export function PartnerSelectionBar({
  locale,
  total,
  selected,
  onToggleAll,
  onClear,
  onSend,
}: {
  locale: string;
  total: number;
  selected: number;
  onToggleAll: () => void;
  onClear: () => void;
  onSend: () => void;
}) {
  const copy = partnerBroadcastCopy(locale);
  const all = total > 0 && selected === total;
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={all}
          ref={(el) => {
            if (el) el.indeterminate = selected > 0 && !all;
          }}
          onChange={onToggleAll}
          disabled={total === 0}
          className="h-4 w-4 accent-[#0b1f4b]"
        />
        {copy.selectAll}
      </label>
      <span className="text-sm text-slate-500">{copy.selected.replace("{n}", String(selected))}</span>
      <div className="ms-auto flex flex-wrap gap-2">
        {selected > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700"
          >
            {copy.clear}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSend}
          disabled={selected === 0}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b1f4b] px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {copy.sendMessage}
        </button>
      </div>
    </div>
  );
}
