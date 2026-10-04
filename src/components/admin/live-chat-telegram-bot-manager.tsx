"use client";

import { useState } from "react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type View = {
  label: string;
  botUsername: string;
  chatId: string;
  enabled: boolean;
  webhookOk: boolean;
  botTokenSet: boolean;
  botTokenMasked: string;
};

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "ონლაინ ჩატის Telegram ბოტი",
      help: "როცა მომხმარებელი ჩატში ოპერატორს ითხოვს, საუბარი ამ ბოტზე მოვა. პასუხი პირდაპირ ბოტში დაწერეთ, /done ასრულებს საუბარს და რიგში შემდეგს აკავშირებს.",
      name: "სახელი",
      namePh: "მაგ. Live chat",
      username: "ბოტის username",
      token: "ბოტის ტოკენი",
      tokenSaved: "შენახულია",
      chatId: "Chat ID (ოპერატორი / ჯგუფი)",
      chatPh: "მაგ. 6624854",
      enabled: "ჩართულია",
      connected: "ბოტი დაკავშირებულია საიტთან",
      notConnected: "ბოტი ჯერ არ არის დაკავშირებული",
      saved: "შენახულია",
      save: "შენახვა",
      saving: "ინახება…",
      failed: "ვერ შეინახა",
      hint: "Chat ID-ის გასაგებად: ჩართეთ ბოტი ნებისმიერი Chat ID-ით, მიწერეთ ბოტს /start და ის გიპასუხებთ თქვენი Chat ID-ით.",
    };
  }
  if (locale === "ru") {
    return {
      title: "Telegram-бот онлайн-чата",
      help: "Когда клиент просит оператора, разговор приходит в этот бот. Отвечайте прямо в боте, /done завершает чат и подключает следующего в очереди.",
      name: "Название",
      namePh: "напр. Live chat",
      username: "Username бота",
      token: "Токен бота",
      tokenSaved: "сохранён",
      chatId: "Chat ID (оператор / группа)",
      chatPh: "напр. 6624854",
      enabled: "Включён",
      connected: "Бот подключён к сайту",
      notConnected: "Бот ещё не подключён",
      saved: "Сохранено",
      save: "Сохранить",
      saving: "Сохранение…",
      failed: "Не удалось сохранить",
      hint: "Чтобы узнать Chat ID: включите бота с любым Chat ID, напишите ему /start — он ответит вашим Chat ID.",
    };
  }
  return {
    title: "Live chat Telegram bot",
    help: "When a customer asks for an operator, the conversation arrives in this bot. Reply in the bot; /done ends the chat and connects the next person in the queue.",
    name: "Name",
    namePh: "e.g. Live chat",
    username: "Bot username",
    token: "Bot token",
    tokenSaved: "saved",
    chatId: "Chat ID (operator / group)",
    chatPh: "e.g. 6624854",
    enabled: "Enabled",
    connected: "Bot is connected to the site",
    notConnected: "Bot is not connected yet",
    saved: "Saved",
    save: "Save",
    saving: "Saving…",
    failed: "Could not save",
    hint: "To find your Chat ID: enable the bot with any Chat ID, send it /start, and it replies with your Chat ID.",
  };
}

const inputClass =
  "mt-0.5 w-full rounded-lg border p-2 text-base font-normal sm:text-xs disabled:bg-slate-50";

export function LiveChatTelegramBotManager({ initial }: { initial: View }) {
  const { locale } = useAdminLocale();
  const t = copyFor(locale);
  const [view, setView] = useState<View>(initial);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/live-chat-telegram-bot", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: view.label,
          botUsername: view.botUsername,
          botToken: token,
          chatId: view.chatId,
          enabled: view.enabled,
        }),
      });
      const data = (await res.json()) as View & { error?: string; webhookError?: string };
      if (!res.ok) throw new Error(data.error || t.failed);
      setView(data);
      setToken("");
      if (data.webhookError) setError(data.webhookError);
      else setMessage(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-[#0b1f4b]">{t.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.help}</p>
        </div>
        <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            className="h-5 w-5 accent-emerald-600"
            checked={view.enabled}
            disabled={busy}
            onChange={(e) => setView((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          {t.enabled}
        </label>
      </div>

      {view.enabled ? (
        <p
          className={
            view.webhookOk
              ? "rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-800"
              : "rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800"
          }
        >
          {view.webhookOk ? t.connected : t.notConnected}
        </p>
      ) : null}

      <label className="block text-[11px] font-semibold text-slate-600">
        {t.name}
        <input
          className={inputClass}
          value={view.label}
          disabled={busy}
          onChange={(e) => setView((prev) => ({ ...prev, label: e.target.value }))}
          placeholder={t.namePh}
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {t.username}
        <input
          className={inputClass}
          value={view.botUsername}
          disabled={busy}
          onChange={(e) => setView((prev) => ({ ...prev, botUsername: e.target.value }))}
          placeholder="rentairportcars_chatbot"
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {t.token}
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={token}
          disabled={busy}
          onChange={(e) => setToken(e.target.value)}
          placeholder={
            view.botTokenSet ? view.botTokenMasked || `•••• ${t.tokenSaved}` : "123456:ABC…"
          }
        />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        {t.chatId}
        <input
          inputMode="numeric"
          className={inputClass}
          value={view.chatId}
          disabled={busy}
          onChange={(e) => setView((prev) => ({ ...prev, chatId: e.target.value }))}
          placeholder={t.chatPh}
        />
      </label>
      <p className="text-[11px] text-slate-500">{t.hint}</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="min-h-10 rounded-lg bg-[#0b1f4b] px-4 py-2 text-xs font-bold text-white disabled:bg-slate-400"
      >
        {busy ? t.saving : t.save}
      </button>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
