"use client";

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import {
  PARTNER_BROADCAST_MAX_TEXT,
  type PartnerBroadcastChannel,
  type PartnerBroadcastContact,
  type PartnerBroadcastResult,
  type PartnerBroadcastTarget,
} from "@/lib/partners/broadcast-types";
import { partnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";
import { PartnerMessengerLinks } from "@/components/admin/partner-broadcast/partner-messenger-links";
import {
  PartnerAutoChannels,
  partnerAutoChannelRows,
} from "@/components/admin/partner-broadcast/partner-auto-channels";
import { PartnerBroadcastResults } from "@/components/admin/partner-broadcast/partner-broadcast-results";

export default function PartnerBroadcastModal({
  targets,
  locale,
  onClose,
}: {
  targets: PartnerBroadcastTarget[];
  locale: string;
  onClose: () => void;
}) {
  const copy = partnerBroadcastCopy(locale);
  const [contacts, setContacts] = useState<PartnerBroadcastContact[] | null>(null);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [text, setText] = useState("");
  const [channels, setChannels] = useState<Set<PartnerBroadcastChannel>>(
    () => new Set<PartnerBroadcastChannel>(["telegram", "email"]),
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<PartnerBroadcastResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/partners/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "contacts", targets }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "contacts");
        const loaded = (data.contacts as PartnerBroadcastContact[]).map((contact) => ({
          ...contact,
          phones: Array.isArray(contact.phones) ? contact.phones : contact.phone ? [contact.phone] : [],
        }));
        setContacts(loaded);
        setSmsConfigured(Boolean(data.smsConfigured));
      } catch {
        if (!cancelled) {
          setContacts([]);
          setError(copy.errorGeneric);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targets, copy.errorGeneric]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  const list = contacts ?? [];
  const trimmed = text.trim();
  const phoneTotal = list.reduce((sum, contact) => sum + contact.phones.length, 0);
  const recipientTotal =
    contacts === null
      ? targets.reduce((sum, target) => sum + Math.max(target.slots.length, 1), 0)
      : list.reduce((sum, contact) => sum + Math.max(contact.phones.length, 1), 0);
  const reach: Record<PartnerBroadcastChannel, number> = {
    telegram: list.filter((c) => c.hasTelegram).length,
    email: list.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)).length,
    sms: list.reduce(
      (sum, contact) => sum + contact.phones.filter((phone) => phone.replace(/\D/g, "").length >= 9).length,
      0,
    ),
  };
  const totals: Record<PartnerBroadcastChannel, number> = {
    telegram: list.length,
    email: list.length,
    sms: phoneTotal,
  };
  const channelRows = partnerAutoChannelRows(copy, smsConfigured);

  const toggleChannel = (channel: PartnerBroadcastChannel) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });

  const send = async () => {
    setError("");
    if (!trimmed || trimmed.length > PARTNER_BROADCAST_MAX_TEXT) {
      setError(copy.errorText);
      return;
    }
    const picked = [...channels].filter((c) => c !== "sms" || smsConfigured);
    if (!picked.length) {
      setError(copy.noChannel);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/partners/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", targets, text: trimmed, channels: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "send");
      setResults(data.results as PartnerBroadcastResult[]);
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-broadcast-title"
      onClick={() => {
        if (!sending) onClose();
      }}
    >
      <div
        className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id="partner-broadcast-title" className="text-base font-extrabold text-[#0b1f4b]">
              {copy.title}
            </h2>
            <p className="text-xs text-slate-500">{copy.recipients.replace("{n}", String(recipientTotal))}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label={copy.close}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {contacts === null ? (
            <p className="text-sm text-slate-500">{copy.loading}</p>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-800">{copy.textLabel}</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, PARTNER_BROADCAST_MAX_TEXT))}
                  rows={4}
                  placeholder={copy.textPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-[#0b1f4b] focus:ring-2 focus:ring-[#0b1f4b]/15 sm:text-sm"
                />
                <span className="mt-0.5 block text-end text-[11px] text-slate-400">
                  {text.length} / {PARTNER_BROADCAST_MAX_TEXT}
                </span>
              </label>

              {list.length ? <PartnerMessengerLinks contacts={list} text={trimmed} copy={copy} /> : null}

              {results ? (
                <PartnerBroadcastResults results={results} rows={channelRows} copy={copy} />
              ) : (
                <PartnerAutoChannels
                  rows={channelRows}
                  channels={channels}
                  reach={reach}
                  totals={totals}
                  onToggle={toggleChannel}
                  copy={copy}
                />
              )}
            </>
          )}
          {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700"
          >
            {copy.close}
          </button>
          {results ? null : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || contacts === null || !list.length}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b1f4b] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? copy.sending : copy.send}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
