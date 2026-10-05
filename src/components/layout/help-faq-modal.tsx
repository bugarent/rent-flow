"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { HelpFaqItem } from "@/lib/catalog/help-faq";
import { usePreferences } from "@/components/providers/preferences-context";

export function HelpFaqModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dictionary } = usePreferences();
  const [items, setItems] = useState<HelpFaqItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void fetch("/api/help-faq", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setExpandedId(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-2 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={dictionary.nav.help}
      onClick={onClose}
    >
      <div
        className="flex h-[96dvh] max-h-[96dvh] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_64px_rgba(11,31,75,0.22)] ring-1 ring-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-7 pb-5 pt-6 sm:px-8">
          <div className="pr-12">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#0b1f4b]">{dictionary.nav.help}</h2>
            <p className="mt-1 text-sm leading-snug text-slate-500">FAQ &amp; instructions</p>
          </div>
          <button
            type="button"
            className="absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
          {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading…</p> : null}
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No help articles yet.</p>
          ) : null}

          <ul className="space-y-3">
            {items.map((item) => {
              const openItem = expandedId === item.id;
              return (
                <li
                  key={item.id}
                  className={`overflow-hidden rounded-xl border transition ${
                    openItem ? "border-[#0b1f4b]/20 bg-white shadow-sm" : "border-slate-200/90 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-5 py-4 text-left"
                    aria-expanded={openItem}
                    onClick={() => setExpandedId(openItem ? null : item.id)}
                  >
                    <span className="flex-1 text-base font-semibold leading-snug text-[#0b1f4b]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition duration-200 ${
                        openItem ? "rotate-180 text-[#0b1f4b]" : ""
                      }`}
                    />
                  </button>
                  {openItem ? (
                    <div className="border-t border-slate-100 bg-[#f7f9fc] px-5 pb-5 pt-4">
                      <p className="text-[15px] leading-[1.7] text-slate-600 whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
