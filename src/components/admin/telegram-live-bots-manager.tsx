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

function emptyBot(): BotDraft {
  return {
    id: `new-${Date.now()}`,
    label: "",
    botUsername: "rentairportcarsbot",
    botToken: "",
    chatId: "",
    active: false,
    botTokenSet: false,
  };
}

export function TelegramLiveBotsManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const c = dictionary.common;
  const s = dictionary.sections;
  const [bots, setBots] = useState<BotDraft[]>(initial.bots);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBots(initial.bots);
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
          bots: bots.map((b) => ({
            id: b.id.startsWith("new-") ? undefined : b.id,
            label: b.label,
            botUsername: b.botUsername,
            botToken: b.botToken,
            chatId: b.chatId,
            active: b.active,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string; bots?: BotDraft[] };
      if (!res.ok) throw new Error(data.error || c.failed);
      setBots(data.bots || []);
      setMessage(`${c.saved} — ${s.liveBotSavedNote}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const updateBot = (id: string, patch: Partial<BotDraft>) => {
    setBots((prev) =>
      prev.map((b) => {
        if (b.id !== id) {
          // Activating one deactivates others in the UI
          if (patch.active === true) return { ...b, active: false };
          return b;
        }
        return { ...b, ...patch };
      }),
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.liveBotsTitle}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.liveBotsHelp}</p>
      </div>

      <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
        {bots.map((bot, index) => (
          <li key={bot.id} className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-700">
                <input
                  type="radio"
                  name="active-live-bot"
                  checked={bot.active}
                  disabled={busy}
                  onChange={() => updateBot(bot.id, { active: true })}
                />
                #{index + 1} {bot.active ? `· ${s.liveBotActive}` : ""}
              </label>
              <button
                type="button"
                disabled={busy}
                className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                onClick={() => setBots((prev) => prev.filter((row) => row.id !== bot.id))}
              >
                {c.delete}
              </button>
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">
              {s.liveBotName}
              <input
                className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
                value={bot.label}
                disabled={busy}
                onChange={(e) => updateBot(bot.id, { label: e.target.value })}
                placeholder={s.liveBotNamePh}
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              {s.botUsername}
              <input
                className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
                value={bot.botUsername}
                disabled={busy}
                onChange={(e) => updateBot(bot.id, { botUsername: e.target.value })}
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
                onChange={(e) => updateBot(bot.id, { botToken: e.target.value })}
                placeholder={
                  bot.botTokenSet
                    ? bot.botTokenMasked || `•••• ${s.liveBotTokenSaved}`
                    : "123456:ABC…"
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              {s.liveBotChatId}
              <input
                className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
                value={bot.chatId}
                disabled={busy}
                onChange={(e) => updateBot(bot.id, { chatId: e.target.value })}
                placeholder={s.liveBotChatPh}
              />
            </label>
          </li>
        ))}
      </ul>

      {bots.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
          {s.liveBotsEmpty}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setBots((prev) => [...prev, emptyBot()])}
          className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          {c.add} {s.liveBotAdd}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
        >
          {busy ? c.saving : c.save}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
