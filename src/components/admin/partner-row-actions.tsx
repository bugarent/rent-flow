"use client";

import { useState } from "react";
import { Ban, Trash2, Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Labels = {
  details: string;
  delete: string;
  block: string;
  unblock: string;
  confirmDelete: string;
  blockTitle: string;
  blockHelp: string;
  extraEmail: string;
  plate: string;
  notes: string;
  saveBlock: string;
  cancel: string;
  failed: string;
};

function labelsFor(locale: string): Labels {
  const t = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  return {
    details: t("Details", "დეტალები", "Детали"),
    delete: t("Delete", "წაშლა", "Удалить"),
    block: t("Block", "დაბლოკვა", "Заблокировать"),
    unblock: t("Unblock", "განბლოკვა", "Разблокировать"),
    confirmDelete: t(
      "Delete this partner?",
      "წავშალოთ ეს პარტნიორი?",
      "Удалить этого партнёра?",
    ),
    blockTitle: t("Block partner", "პარტნიორის დაბლოკვა", "Блокировка партнёра"),
    blockHelp: t(
      "If the extra fields stay empty, only this partner's email and phone are blocked.",
      "თუ დამატებით ველებს ცარიელს დატოვებთ, დაიბლოკება მხოლოდ ამ პარტნიორის ელფოსტა და ტელეფონი.",
      "Если дополнительные поля пустые, блокируются только email и телефон этого партнёра.",
    ),
    extraEmail: t(
      "Extra email (optional)",
      "დამატებითი ელფოსტა (არასავალდებულო)",
      "Дополнительный email (необязательно)",
    ),
    plate: t(
      "Plate number (optional)",
      "მანქანის ნომერი (არასავალდებულო)",
      "Номер авто (необязательно)",
    ),
    notes: t("Other note (optional)", "სხვა შენიშვნა (არასავალდებულო)", "Заметка (необязательно)"),
    saveBlock: t("Block", "დაბლოკვა", "Заблокировать"),
    cancel: t("Cancel", "გაუქმება", "Отмена"),
    failed: t("Action failed", "მოქმედება ვერ შესრულდა", "Действие не выполнено"),
  };
}

export function PartnerRowActions({
  partnerId,
  email,
  phone,
  status,
  returnTab = "directory",
  locale,
  className,
  compact = false,
}: {
  partnerId: string;
  email?: string;
  phone?: string;
  status?: string;
  returnTab?: string;
  locale?: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const adminLocale = useAdminLocale().locale;
  const t = labelsFor(locale || adminLocale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);
  const [extraEmail, setExtraEmail] = useState("");
  const [plate, setPlate] = useState("");
  const [notes, setNotes] = useState("");
  const blocked = status === "SUSPENDED";

  const openDetails = () => {
    const onModeration = returnTab === "primary" || returnTab === "profiles";
    const base = onModeration
      ? `${ADMIN_BASE}/moderation/partners/${partnerId}`
      : `${ADMIN_BASE}/partners/${partnerId}`;
    router.push(`${base}?returnTab=${encodeURIComponent(returnTab)}`);
  };

  const deletePartner = async () => {
    if (!window.confirm(t.confirmDelete)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.failed);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BLOCK",
          email,
          phone,
          extraEmail: extraEmail.trim(),
          plate: plate.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.failed);
      setBlockOpen(false);
      setExtraEmail("");
      setPlate("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const unblock = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNBLOCK", email, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t.failed);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={cn("flex items-center justify-end", compact ? "flex-nowrap gap-1" : "flex-wrap gap-1.5", className)}>
        <button
          type="button"
          onClick={openDetails}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50",
            compact ? "h-6 px-1.5 text-[11px]" : "h-8 px-2.5 text-xs",
          )}
        >
          <Eye className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {t.details}
        </button>
        {blocked ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void unblock()}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50",
              compact ? "h-6 px-1.5 text-[11px]" : "h-8 px-2.5 text-xs",
            )}
          >
            {t.unblock}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setBlockOpen(true)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50",
              compact ? "h-6 px-1.5 text-[11px]" : "h-8 px-2.5 text-xs",
            )}
          >
            <Ban className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {t.block}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void deletePartner()}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50",
            compact ? "h-6 px-1.5 text-[11px]" : "h-8 px-2.5 text-xs",
          )}
        >
          <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {t.delete}
        </button>
      </div>
      {error ? <p className="mt-1 text-right text-xs text-rose-600">{error}</p> : null}

      {blockOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-extrabold text-[#0b1f4b]">{t.blockTitle}</h3>
              <button
                type="button"
                onClick={() => setBlockOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label={t.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-slate-600">{t.blockHelp}</p>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {email || "—"} · {phone || "—"}
              </p>
              <label className="block text-xs font-semibold text-slate-600">
                {t.extraEmail}
                <input
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm"
                  value={extraEmail}
                  onChange={(e) => setExtraEmail(e.target.value)}
                  type="email"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                {t.plate}
                <input
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm font-mono uppercase"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                {t.notes}
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setBlockOpen(false)}
                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitBlock()}
                className="h-9 rounded-md bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {t.saveBlock}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
