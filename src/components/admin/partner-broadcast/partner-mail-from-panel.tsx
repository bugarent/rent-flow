"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";

/** Sender mailbox for messages the admin sends to partners' personal-info emails. */
export function PartnerMailFromPanel({ initialFromEmail }: { initialFromEmail: string }) {
  const { locale } = useAdminLocale();
  const [value, setValue] = useState(initialFromEmail);
  const [saved, setSaved] = useState(initialFromEmail);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const t = {
    title: uiText(
      locale,
      "Sender email for partner messages",
      "პარტნიორებისთვის შეტყობინებების გამგზავნი ელ. ფოსტა",
      "Почта отправителя для сообщений партнёрам",
    ),
    hint: uiText(
      locale,
      "When you pick “Email” in “Send message”, partners receive it at the email in their personal info, from this address. Replies come back here. Leave empty to use the site's default sender.",
      "„შეტყობინების გაგზავნაში“ ელ. ფოსტის არჩევისას პარტნიორები შეტყობინებას მიიღებენ მათ პირად ინფოში მითითებულ მაილზე, ამ მისამართიდან. პასუხებიც აქ მოვა. ცარიელის შემთხვევაში გამოიყენება საიტის ჩვეულებრივი გამგზავნი.",
      "Если в «Отправить сообщение» выбрана почта, партнёры получат его на email из личной информации — с этого адреса. Ответы придут сюда же. Пусто — используется отправитель сайта по умолчанию.",
    ),
    placeholder: uiText(locale, "name@example.com", "name@example.com", "name@example.com"),
    save: uiText(locale, "Save", "შენახვა", "Сохранить"),
    saving: uiText(locale, "Saving…", "ინახება…", "Сохранение…"),
    savedOk: uiText(locale, "Saved", "შენახულია", "Сохранено"),
    invalid: uiText(locale, "Enter a valid email", "ჩაწერეთ სწორი ელ. ფოსტა", "Введите корректный email"),
    failed: uiText(locale, "Could not save", "შენახვა ვერ მოხერხდა", "Не удалось сохранить"),
  };

  const dirty = value.trim() !== saved;

  const save = async () => {
    const next = value.trim();
    if (next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      setNotice({ ok: false, text: t.invalid });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/partners/mail-from", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEmail: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { fromEmail?: string; error?: string };
      if (!res.ok) throw new Error(data.error === "Invalid email" ? t.invalid : t.failed);
      const stored = String(data.fromEmail ?? next);
      setSaved(stored);
      setValue(stored);
      setNotice({ ok: true, text: t.savedOk });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : t.failed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6fe8]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-[#0b1f4b]">{t.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{t.hint}</p>
        </div>
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setNotice(null);
          }}
          placeholder={t.placeholder}
          className="min-h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-base text-[#0b1f4b] outline-none focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20 sm:max-w-md sm:text-sm"
        />
        <button
          type="submit"
          disabled={saving || !dirty}
          className="min-h-10 shrink-0 rounded-lg bg-[#0b1f4b] px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? t.saving : t.save}
        </button>
        {notice ? (
          <span className={`text-xs font-semibold ${notice.ok ? "text-emerald-700" : "text-red-700"}`}>
            {notice.text}
          </span>
        ) : null}
      </form>
    </section>
  );
}
