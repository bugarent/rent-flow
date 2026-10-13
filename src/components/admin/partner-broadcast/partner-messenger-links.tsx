"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { partnerPhoneDigits } from "@/lib/partners/messenger-chat-link";
import type { PartnerBroadcastContact } from "@/lib/partners/broadcast-types";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

/** One chat link per partner; the admin presses send in WhatsApp / Viber themselves. */
export function PartnerMessengerLinks({
  contacts,
  text,
  copy,
}: {
  contacts: PartnerBroadcastContact[];
  text: string;
  copy: PartnerBroadcastCopy;
}) {
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [copiedNote, setCopiedNote] = useState(false);

  const markOpened = (key: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(true);
      window.setTimeout(() => setCopiedNote(false), 1800);
    } catch {
      setCopiedNote(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
        <p className="text-sm font-bold text-slate-800">{copy.messengersTitle}</p>
        <p className="text-xs text-slate-500">{copy.messengersHint}</p>
        {copiedNote ? <p className="mt-1 text-xs font-semibold text-emerald-700">{copy.copied}</p> : null}
      </div>
      <ul className="divide-y divide-slate-100">
        {contacts.map((contact) => {
          const digits = partnerPhoneDigits(contact.phone);
          const wa = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
          const viber = `viber://chat?number=%2B${digits}`;
          const has = (platform: string) => contact.messengers.includes(platform);
          return (
            <li key={contact.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{contact.name}</p>
                <p className="text-xs text-slate-500">{contact.phone || copy.noPhone}</p>
              </div>
              {digits ? (
                <div className="flex flex-wrap gap-1.5">
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markOpened(`${contact.id}:wa`)}
                    className={cn(
                      "inline-flex min-h-9 items-center rounded-md px-3 text-xs font-bold",
                      has("WHATSAPP") ? "bg-[#25d366] text-white" : "border border-[#25d366] text-[#128c4a]",
                      opened.has(`${contact.id}:wa`) && "opacity-60",
                    )}
                  >
                    WhatsApp{opened.has(`${contact.id}:wa`) ? " ✓" : ""}
                  </a>
                  <a
                    href={viber}
                    onClick={() => {
                      void copyText();
                      markOpened(`${contact.id}:viber`);
                    }}
                    className={cn(
                      "inline-flex min-h-9 items-center rounded-md px-3 text-xs font-bold",
                      has("VIBER") ? "bg-[#7360f2] text-white" : "border border-[#7360f2] text-[#5b48d6]",
                      opened.has(`${contact.id}:viber`) && "opacity-60",
                    )}
                  >
                    Viber{opened.has(`${contact.id}:viber`) ? " ✓" : ""}
                  </a>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
