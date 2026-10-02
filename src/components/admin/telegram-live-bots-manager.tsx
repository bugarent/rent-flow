"use client";

import { useEffect, useState } from "react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type BotDraft = {
  id: string;
  label: string;
  botUsername: string;
  botToken: string;
  chatId: string;
  active: boolean;
  botTokenSet?: boolean;
  botTokenMasked?: string;
};

type Props = {
  initial: { bots: BotDraft[] };
};

function blankBot(): BotDraft {
  return {
    id: `new-${Date.now()}`,
    label: "",
    botUsername: "rentairportcarsbot",
    botToken: "",
    chatId: "",
    active: true,
    botTokenSet: false,
  };
}

function pickBot(bots: BotDraft[]): BotDraft {
  const chosen = bots.find((bot) => bot.active) || bots[0];
  if (!chosen) return blankBot();
  return { ...chosen, botToken: "", active: true };
}

export function TelegramLiveBotsManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const c = dictionary.common;
  const s = dictionary.sections;
  const [bot, setBot] = useState<BotDraft>(() => pickBot(initial.bots));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBot(pickBot(initial.bots));
  }, [initial]);

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/telegram-live-bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bots: [
            {
              id: bot.id.startsWith("new-") ? undefined : bot.id,
              label: bot.label,
              botUsername: bot.botUsername,
              botToken: bot.botToken,
              chatId: bot.chatId,
              active: true,
            },
          ],
        }),
      });
      const data = (await res.json()) as { error?: string; bots?: BotDraft[] };
      if (!res.ok) throw new Error(data.error || c.failed);
      setBot(pickBot(data.bots || []));
      setMessage(s.liveBotSavedNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.liveBotsTitle}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.liveBotsHelp}</p>
      </div>

      <label className="block text-[11px] font-semibold text-slate-600">
        {s.liveBotName}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          value={bot.label}
          disabled={busy}
          onChange={(e) => setBot((prev) => ({ ...prev, label: e.target.value }))}
          placeholder={s.liveBotNamePh}
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {s.botUsername}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          value={bot.botUsername}
          disabled={busy}
          onChange={(e) => setBot((prev) => ({ ...prev, botUsername: e.target.value }))}
          placeholder="rentairportcarsbot"
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {s.botToken}
        <input
          type="password"
          autoComplete="new-password"
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          value={bot.botToken}
          disabled={busy}
          onChange={(e) => setBot((prev) => ({ ...prev, botToken: e.target.value }))}
          placeholder={
            bot.botTokenSet ? bot.botTokenMasked || `•••• ${s.liveBotTokenSaved}` : "123456:ABC…"
          }
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {s.liveBotChatId}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          value={bot.chatId}
          disabled={busy}
          onChange={(e) => setBot((prev) => ({ ...prev, chatId: e.target.value }))}
          placeholder={s.liveBotChatPh}
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
      >
        {busy ? c.saving : c.save}
      </button>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
