"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  broadcastProgressKey,
  viberMessageHref,
  whatsappMessageHref,
  type BroadcastMessenger,
  type BroadcastMessengerLine,
} from "@/lib/partners/broadcast-messenger";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

export function PartnerMessengerRow({
  line,
  text,
  opened,
  onOpen,
  copy,
}: {
  line: BroadcastMessengerLine;
  text: string;
  opened: Set<string>;
  onOpen: (line: BroadcastMessengerLine, messenger: BroadcastMessenger) => void;
  copy: PartnerBroadcastCopy;
}) {
  const waDone = opened.has(broadcastProgressKey(line.key, "wa"));
  const viberDone = opened.has(broadcastProgressKey(line.key, "viber"));
  const ready = Boolean(text) && Boolean(line.digits);
  const has = (platform: string) => line.messengers.includes(platform);
  const button = "inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-xs font-bold";

  return (
    <li
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2",
        (waDone || viberDone) && "bg-emerald-50/70",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{line.name}</p>
        <p className={cn("text-xs", line.digits ? "font-mono text-slate-600" : "font-semibold text-amber-700")}>
          {line.phone || copy.noPhone}
        </p>
      </div>
      {line.digits ? (
        <div className="flex flex-wrap gap-1.5">
          <a
            href={ready ? whatsappMessageHref(line.digits, text) : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!ready}
            onClick={(e) => {
              if (!ready) return e.preventDefault();
              onOpen(line, "wa");
            }}
            className={cn(
              button,
              has("WHATSAPP") ? "bg-[#25d366] text-white" : "border border-[#25d366] bg-white text-[#128c4a]",
              waDone && "opacity-60",
              !ready && "pointer-events-none opacity-40",
            )}
          >
            {waDone ? <Check className="h-3.5 w-3.5" /> : null}
            WhatsApp
          </a>
          <a
            href={ready ? viberMessageHref(line.digits, text) : undefined}
            aria-disabled={!ready}
            onClick={(e) => {
              if (!ready) return e.preventDefault();
              onOpen(line, "viber");
            }}
            className={cn(
              button,
              has("VIBER") ? "bg-[#7360f2] text-white" : "border border-[#7360f2] bg-white text-[#5b48d6]",
              viberDone && "opacity-60",
              !ready && "pointer-events-none opacity-40",
            )}
          >
            {viberDone ? <Check className="h-3.5 w-3.5" /> : null}
            Viber
          </a>
        </div>
      ) : null}
    </li>
  );
}
