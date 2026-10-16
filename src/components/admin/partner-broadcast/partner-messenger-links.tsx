"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  broadcastMessengerLines,
  broadcastProgressKey,
  viberMessageHref,
  whatsappMessageHref,
  type BroadcastMessenger,
  type BroadcastMessengerLine,
} from "@/lib/partners/broadcast-messenger";
import type { PartnerBroadcastContact } from "@/lib/partners/broadcast-types";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";
import { PartnerMessengerRow } from "@/components/admin/partner-broadcast/partner-messenger-row";

/**
 * One chat per selected number; the admin presses send inside WhatsApp / Viber.
 * Browsers allow one window per click, so "next" opens exactly one chat each time.
 */
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
  const openedRef = useRef<Set<string>>(new Set());
  const [copiedNote, setCopiedNote] = useState(false);
  const lines = useMemo(() => broadcastMessengerLines(contacts), [contacts]);
  const reachable = lines.filter((line) => line.digits);

  const pending = (messenger: BroadcastMessenger) =>
    reachable.filter((line) => !opened.has(broadcastProgressKey(line.key, messenger)));
  const waLeft = pending("wa");
  const viberLeft = pending("viber");
  const allContacted = reachable.every(
    (line) =>
      opened.has(broadcastProgressKey(line.key, "wa")) || opened.has(broadcastProgressKey(line.key, "viber")),
  );

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(true);
      window.setTimeout(() => setCopiedNote(false), 1800);
    } catch {
      setCopiedNote(false);
    }
  };

  const markOpened = (line: BroadcastMessengerLine, messenger: BroadcastMessenger) => {
    if (messenger === "viber") void copyText();
    openedRef.current.add(broadcastProgressKey(line.key, messenger));
    setOpened(new Set(openedRef.current));
  };

  const resetProgress = () => {
    openedRef.current = new Set();
    setOpened(new Set());
  };

  const openNext = (messenger: BroadcastMessenger) => {
    const line = reachable.find((item) => !openedRef.current.has(broadcastProgressKey(item.key, messenger)));
    if (!line || !text) return;
    markOpened(line, messenger);
    if (messenger === "wa") window.open(whatsappMessageHref(line.digits, text), "_blank", "noopener,noreferrer");
    else window.location.href = viberMessageHref(line.digits, text);
  };

  const nextButton = "inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-3 text-sm font-bold text-white disabled:opacity-40";

  return (
    <div className="rounded-lg border border-slate-200">
      <div className="space-y-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{copy.messengersTitle}</p>
          <p className="text-xs leading-5 text-slate-500">{text ? copy.messengersHint : copy.writeFirst}</p>
        </div>
        {reachable.length ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => openNext("wa")}
                disabled={!text || !waLeft.length}
                className={`${nextButton} bg-[#25d366]`}
              >
                {copy.nextWhatsapp.replace("{n}", String(waLeft.length))}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openNext("viber")}
                disabled={!text || !viberLeft.length}
                className={`${nextButton} bg-[#7360f2]`}
              >
                {copy.nextViber.replace("{n}", String(viberLeft.length))}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <span className="font-semibold text-slate-700">
                {allContacted ? `${copy.allOpened} · ` : ""}
                {copy.progress
                  .replace("{wa}", String(reachable.length - waLeft.length))
                  .replace("{viber}", String(reachable.length - viberLeft.length))
                  .replace(/\{total\}/g, String(reachable.length))}
              </span>
              {opened.size ? (
                <button
                  type="button"
                  onClick={resetProgress}
                  className="min-h-8 font-semibold text-slate-500 underline-offset-2 hover:underline"
                >
                  {copy.resetProgress}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
        {copiedNote ? <p className="text-xs font-semibold text-emerald-700">{copy.copied}</p> : null}
      </div>
      <ul className="max-h-[45dvh] divide-y divide-slate-100 overflow-y-auto sm:max-h-72">
        {lines.map((line) => (
          <PartnerMessengerRow
            key={line.key}
            line={line}
            text={text}
            opened={opened}
            onOpen={markOpened}
            copy={copy}
          />
        ))}
      </ul>
    </div>
  );
}
