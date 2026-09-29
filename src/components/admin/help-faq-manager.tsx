"use client";

import { useEffect, useState } from "react";
import type { HelpFaqConfig, HelpFaqItem } from "@/lib/catalog/help-faq";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type Props = {
  initial: HelpFaqConfig;
};

function emptyDraft(): HelpFaqItem {
  return {
    id: `new-${Date.now()}`,
    question: "",
    answer: "",
    sortOrder: 0,
  };
}

export function HelpFaqManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const c = dictionary.common;
  const [items, setItems] = useState<HelpFaqItem[]>(initial.items);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(initial.items);
  }, [initial]);

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/help-faq", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      setItems(data.items || []);
      setMessage(`${c.saved} — shown in Help on the website.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (id: string, patch: Partial<HelpFaqItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">Help FAQ</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Shown when visitors click Help. Add troubleshooting Q&amp;A.
        </p>
      </div>

      <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5">
        {items.map((item, index) => (
          <li key={item.id} className="space-y-1.5 rounded-lg border border-slate-200 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">#{index + 1}</p>
              <button
                type="button"
                disabled={busy}
                className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                onClick={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}
              >
                {c.delete}
              </button>
            </div>
            <label className="block text-[11px] font-semibold text-slate-600">
              Question
              <input
                className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
                value={item.question}
                disabled={busy}
                onChange={(e) => updateItem(item.id, { question: e.target.value })}
                placeholder="What should the customer ask?"
              />
            </label>
            <label className="block text-[11px] font-semibold text-slate-600">
              Answer / instructions
              <textarea
                className="mt-0.5 min-h-[64px] w-full rounded-lg border p-2 text-xs font-normal"
                value={item.answer}
                disabled={busy}
                onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                placeholder="Explain what the customer should do…"
              />
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setItems((prev) => [...prev, emptyDraft()])}
          className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          {c.add} question
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
