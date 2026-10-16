"use client";

import { Send, X } from "lucide-react";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

/** Stays on screen while the admin scrolls the list, so "send" is always one tap away. */
export function PartnerSelectionDock({
  copy,
  selected,
  onClear,
  onSend,
}: {
  copy: PartnerBroadcastCopy;
  selected: number;
  onClear: () => void;
  onSend: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        role="region"
        aria-label={copy.selected.replace("{n}", String(selected))}
        className="pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl bg-[#0b1f4b] px-3 py-2 text-white shadow-2xl ring-1 ring-white/10"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          {copy.selected.replace("{n}", String(selected))}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/30 px-3 text-sm font-semibold hover:bg-white/10"
        >
          <X className="h-4 w-4" />
          {copy.clear}
        </button>
        <button
          type="button"
          onClick={onSend}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#25d366] px-4 text-sm font-extrabold text-[#06351c] hover:bg-[#2ee073] sm:min-h-10 sm:w-auto"
        >
          <Send className="h-4 w-4" />
          {copy.sendMessage}
        </button>
      </div>
    </div>
  );
}
