"use client";

import { partnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";
import { PartnerSelectionDock } from "@/components/admin/partner-broadcast/partner-selection-dock";

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
    <>
      <div className="mb-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
          {selected > 0 ? (
            <span className="text-sm font-semibold text-sky-800">{copy.selected.replace("{n}", String(selected))}</span>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-slate-500">{copy.hint}</p>
      </div>
      {selected > 0 ? (
        <PartnerSelectionDock copy={copy} selected={selected} onClear={onClear} onSend={onSend} />
      ) : null}
    </>
  );
}
