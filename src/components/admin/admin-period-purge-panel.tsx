"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

type Mode = "bookings" | "finances" | "both";

type Preview = {
  from: string;
  to: string;
  liveBookings: number;
  financeRows: number;
  financeVolumeEur: number;
};

function copyFor(locale: string) {
  if (locale === "ka") {
    return {
      title: "პერიოდის მიხედვით წაშლა",
      help: "აირჩიეთ პერიოდი (ჯავშნის შექმნის თარიღი) და რისი წაშლა გსურთ. წაშლა შეუქცევადია.",
      from: "დან",
      to: "მდე",
      modes: {
        bookings: ["მხოლოდ ჯავშნები", "ჯავშნები წაიშლება, ფინანსები და სტატისტიკა დარჩება."],
        finances: ["მხოლოდ ფინანსები", "ფინანსები წაიშლება, ჯავშნები სიაში დარჩება."],
        both: ["ორივე", "წაიშლება ჯავშნებიც და ფინანსებიც."],
      } as Record<Mode, [string, string]>,
      check: "შემოწმება",
      bookings: "ჯავშანი",
      financeRows: "ფინანსური ჩანაწერი",
      volume: "ბრუნვა",
      confirm: "ვადასტურებ, რომ ეს მონაცემები სამუდამოდ წაიშლება",
      del: "წაშლა",
      deleting: "იშლება…",
      ask: "ნამდვილად გსურთ წაშლა? ამის დაბრუნება შეუძლებელია.",
      done: (b: number, f: number) => `წაიშალა: ჯავშანი ${b}, ფინანსური ჩანაწერი ${f}.`,
      failed: "წაშლა ვერ მოხერხდა",
    };
  }
  if (locale === "ru") {
    return {
      title: "Удаление за период",
      help: "Выберите период (дата создания брони) и что удалить. Удаление необратимо.",
      from: "С",
      to: "По",
      modes: {
        bookings: ["Только брони", "Брони удаляются, финансы и статистика остаются."],
        finances: ["Только финансы", "Финансы удаляются, брони остаются в списке."],
        both: ["Оба", "Удаляются и брони, и финансы."],
      } as Record<Mode, [string, string]>,
      check: "Проверить",
      bookings: "броней",
      financeRows: "фин. записей",
      volume: "Оборот",
      confirm: "Подтверждаю, что данные будут удалены навсегда",
      del: "Удалить",
      deleting: "Удаление…",
      ask: "Точно удалить? Это нельзя отменить.",
      done: (b: number, f: number) => `Удалено: броней ${b}, фин. записей ${f}.`,
      failed: "Не удалось удалить",
    };
  }
  return {
    title: "Delete by period",
    help: "Pick a period (booking creation date) and what to delete. This cannot be undone.",
    from: "From",
    to: "To",
    modes: {
      bookings: ["Bookings only", "Bookings are deleted; finances and statistics stay."],
      finances: ["Finances only", "Finances are deleted; bookings stay in the list."],
      both: ["Both", "Bookings and finances are both deleted."],
    } as Record<Mode, [string, string]>,
    check: "Check",
    bookings: "bookings",
    financeRows: "finance records",
    volume: "Volume",
    confirm: "I confirm this data will be permanently deleted",
    del: "Delete",
    deleting: "Deleting…",
    ask: "Delete for sure? This cannot be undone.",
    done: (b: number, f: number) => `Deleted: ${b} bookings, ${f} finance records.`,
    failed: "Could not delete",
  };
}

const MODES: Mode[] = ["bookings", "finances", "both"];

export function AdminPeriodPurgePanel({ from, to }: { from: string; to: string }) {
  const { locale } = useAdminLocale();
  const t = copyFor(locale);
  const router = useRouter();
  const [range, setRange] = useState({ from, to });
  const [mode, setMode] = useState<Mode>("bookings");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const call = async (dryRun: boolean) => {
    const res = await fetch("/api/admin/bookings/period-purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...range, mode, dryRun }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      preview?: Preview;
      deletedBookings?: number;
      deletedFinanceRows?: number;
    };
    if (!res.ok) throw new Error(data.error || t.failed);
    return data;
  };

  const resetPreview = () => {
    setPreview(null);
    setAgreed(false);
    setMessage("");
  };

  const check = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await call(true);
      setPreview(data.preview ?? null);
      setAgreed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const purge = async () => {
    if (!agreed || !window.confirm(t.ask)) return;
    setBusy(true);
    setError("");
    try {
      const data = await call(false);
      setMessage(t.done(data.deletedBookings ?? 0, data.deletedFinanceRows ?? 0));
      setPreview(null);
      setAgreed(false);
      // Totals, tables and statistics on this page are server-rendered.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const affected =
    preview &&
    (mode === "bookings"
      ? preview.liveBookings
      : mode === "finances"
        ? preview.financeRows
        : preview.liveBookings + preview.financeRows);

  return (
    <details className="mt-8 rounded-xl border border-rose-200 bg-white shadow-sm">
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-extrabold text-rose-800">
        <Trash2 className="h-4 w-4 shrink-0" />
        {t.title}
      </summary>
      <div className="space-y-4 border-t border-rose-100 p-4">
        <p className="text-xs text-slate-600">{t.help}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["from", "to"] as const).map((key) => (
            <label key={key} className="block text-xs font-semibold text-slate-600">
              {key === "from" ? t.from : t.to}
              <DateInput
                type="date"
                value={range[key]}
                disabled={busy}
                onChange={(e) => {
                  setRange((prev) => ({ ...prev, [key]: e.target.value }));
                  resetPreview();
                }}
                className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base sm:text-sm"
              />
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3" role="radiogroup">
          {MODES.map((m) => (
            <label
              key={m}
              className={cn(
                "flex min-h-12 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm",
                mode === m ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white",
              )}
            >
              <input
                type="radio"
                name="period-purge-mode"
                className="mt-0.5 h-4 w-4 accent-rose-600"
                checked={mode === m}
                disabled={busy}
                onChange={() => {
                  setMode(m);
                  setAgreed(false);
                }}
              />
              <span className="min-w-0">
                <span className="block font-bold text-slate-900">{t.modes[m][0]}</span>
                <span className="block text-xs text-slate-600">{t.modes[m][1]}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={busy || !range.from || !range.to}
          onClick={() => void check()}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
        >
          {t.check}
        </button>

        {preview ? (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">
              {preview.from} → {preview.to}
            </p>
            <ul className="space-y-1 text-xs">
              {mode !== "finances" ? (
                <li>
                  <span className="font-black tabular-nums">{preview.liveBookings}</span> {t.bookings}
                </li>
              ) : null}
              {mode !== "bookings" ? (
                <li>
                  <span className="font-black tabular-nums">{preview.financeRows}</span> {t.financeRows} ·{" "}
                  {t.volume} <AdminMoneyText amountEur={preview.financeVolumeEur} />
                </li>
              ) : null}
            </ul>
            <label className="flex min-h-10 cursor-pointer items-start gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-rose-600"
                checked={agreed}
                disabled={busy || !affected}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              {t.confirm}
            </label>
            <button
              type="button"
              disabled={busy || !agreed || !affected}
              onClick={() => void purge()}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              {busy ? t.deleting : `${t.del} · ${t.modes[mode][0]}`}
            </button>
          </div>
        ) : null}

        {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}
        {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
      </div>
    </details>
  );
}
