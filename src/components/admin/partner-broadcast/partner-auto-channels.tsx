"use client";

import { cn } from "@/lib/utils";
import type { PartnerBroadcastChannel } from "@/lib/partners/broadcast-types";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

export type AutoChannelRow = {
  key: PartnerBroadcastChannel;
  label: string;
  disabled: boolean;
  note?: string;
};

export function partnerAutoChannelRows(copy: PartnerBroadcastCopy, smsConfigured: boolean): AutoChannelRow[] {
  return [
    { key: "telegram", label: copy.telegram, disabled: false },
    { key: "email", label: copy.email, disabled: false },
    { key: "sms", label: copy.sms, disabled: !smsConfigured, note: smsConfigured ? undefined : copy.smsOff },
  ];
}

export function PartnerAutoChannels({
  rows,
  channels,
  reach,
  totals,
  onToggle,
  copy,
}: {
  rows: AutoChannelRow[];
  channels: Set<PartnerBroadcastChannel>;
  reach: Record<PartnerBroadcastChannel, number>;
  totals: Record<PartnerBroadcastChannel, number>;
  onToggle: (channel: PartnerBroadcastChannel) => void;
  copy: PartnerBroadcastCopy;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-slate-800">{copy.channels}</legend>
      <p className="mb-1.5 text-xs text-slate-500">{copy.autoHint}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <label
            key={row.key}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
              row.disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                : channels.has(row.key)
                  ? "border-[#0b1f4b] bg-[#eef3ff]"
                  : "border-slate-200",
            )}
          >
            <input
              type="checkbox"
              disabled={row.disabled}
              checked={!row.disabled && channels.has(row.key)}
              onChange={() => onToggle(row.key)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b1f4b]"
            />
            <span className="min-w-0">
              <span className="block font-semibold">{row.label}</span>
              <span className="block text-xs text-slate-500">
                {row.note ??
                  copy.reachable.replace("{n}", String(reach[row.key])).replace("{total}", String(totals[row.key]))}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
