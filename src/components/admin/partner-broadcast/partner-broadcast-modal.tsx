"use client";

import { useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PARTNER_BROADCAST_MAX_TEXT,
  type PartnerBroadcastChannel,
  type PartnerBroadcastContact,
  type PartnerBroadcastResult,
} from "@/lib/partners/broadcast-types";
import { partnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";
import { PartnerMessengerLinks } from "@/components/admin/partner-broadcast/partner-messenger-links";

export default function PartnerBroadcastModal({
  partnerIds,
  locale,
  onClose,
}: {
  partnerIds: string[];
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
          body: JSON.stringify({ action: "contacts", partnerIds }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "contacts");
        setContacts(data.contacts as PartnerBroadcastContact[]);
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
  }, [partnerIds, copy.errorGeneric]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  const list = contacts ?? [];
  const reach: Record<PartnerBroadcastChannel, number> = {
    telegram: list.filter((c) => c.hasTelegram).length,
    email: list.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)).length,
    sms: list.filter((c) => c.phone.replace(/\D/g, "").length >= 9).length,
  };

  const toggleChannel = (channel: PartnerBroadcastChannel) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });

  const send = async () => {
    setError("");
    const body = text.trim();
    if (!body || body.length > PARTNER_BROADCAST_MAX_TEXT) {
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
        body: JSON.stringify({ action: "send", partnerIds, text: body, channels: picked }),
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

  const channelRows: Array<{ key: PartnerBroadcastChannel; label: string; disabled: boolean; note?: string }> = [
    { key: "telegram", label: copy.telegram, disabled: false },
    { key: "email", label: copy.email, disabled: false },
    { key: "sms", label: copy.sms, disabled: !smsConfigured, note: smsConfigured ? undefined : copy.smsOff },
  ];

  const summary = results
    ? (["telegram", "email", "sms"] as const)
        .filter((key) => results.some((r) => r[key] !== undefined))
        .map((key) => ({
          key,
          label: channelRows.find((row) => row.key === key)?.label ?? key,
          sent: results.filter((r) => r[key] === true).length,
          total: results.filter((r) => r[key] !== undefined).length,
        }))
    : [];
  const unreached = results
    ? results.filter((r) => !r.telegram && !r.email && !r.sms).map((r) => r.name)
    : [];

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
            <p className="text-xs text-slate-500">{copy.recipients.replace("{n}", String(partnerIds.length))}</p>
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
          ) : results ? (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
              <p className="font-extrabold">{copy.doneTitle}</p>
              {summary.map((row) => (
                <p key={row.key}>
                  {copy.sentOf
                    .replace("{channel}", row.label)
                    .replace("{sent}", String(row.sent))
                    .replace("{total}", String(row.total))}
                </p>
              ))}
              {unreached.length ? (
                <p className="text-amber-900">
                  <span className="font-bold">{copy.failedFor}</span> {unreached.join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-800">{copy.textLabel}</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, PARTNER_BROADCAST_MAX_TEXT))}
                  rows={5}
                  placeholder={copy.textPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-[#0b1f4b] focus:ring-2 focus:ring-[#0b1f4b]/15 sm:text-sm"
                />
                <span className="mt-0.5 block text-end text-[11px] text-slate-400">
                  {text.length} / {PARTNER_BROADCAST_MAX_TEXT}
                </span>
              </label>

              <fieldset>
                <legend className="mb-1.5 text-sm font-bold text-slate-800">{copy.channels}</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {channelRows.map((row) => (
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
                        onChange={() => toggleChannel(row.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b1f4b]"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{row.label}</span>
                        <span className="block text-xs text-slate-500">
                          {row.note ??
                            copy.reachable.replace("{n}", String(reach[row.key])).replace("{total}", String(list.length))}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {text.trim() && list.length ? (
                <PartnerMessengerLinks contacts={list} text={text.trim()} copy={copy} />
              ) : null}
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
