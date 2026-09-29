"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { ADMIN_BASE } from "@/lib/routes";

type Labels = {
  details: string;
  approve: string;
  reject: string;
  delete: string;
  close: string;
  loading: string;
  rejectTitle: string;
  rejectHint: string;
  rejectPlaceholder: string;
  rejectConfirm: string;
  rejectRequired: string;
};

function actionLabels(locale: string): Labels {
  if (locale === "ka") {
    return {
      details: "დეტალები",
      approve: "თანხმობა",
      reject: "უარყოფა",
      delete: "წაშლა",
      close: "დახურვა",
      loading: "იტვირთება…",
      rejectTitle: "უარყოფის მიზეზი",
      rejectHint: "დაწერეთ კომენტარი — პარტნიორი დაინახავს განცხადების გვერდზე.",
      rejectPlaceholder: "მაგ.: ფოტოები არასაკმარისია / ფასი არასწორია…",
      rejectConfirm: "უარყოფა და გაგზავნა",
      rejectRequired: "კომენტარი სავალდებულოა",
    };
  }
  if (locale === "ru") {
    return {
      details: "Детали",
      approve: "Согласие",
      reject: "Отклонить",
      delete: "Удалить",
      close: "Закрыть",
      loading: "Загрузка…",
      rejectTitle: "Причина отклонения",
      rejectHint: "Комментарий увидит партнёр на странице объявления.",
      rejectPlaceholder: "Напр.: недостаточно фото / неверная цена…",
      rejectConfirm: "Отклонить и отправить",
      rejectRequired: "Комментарий обязателен",
    };
  }
  return {
    details: "Details",
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    close: "Close",
    loading: "Loading…",
    rejectTitle: "Rejection reason",
    rejectHint: "This comment will be shown to the partner on the listing.",
    rejectPlaceholder: "e.g. photos insufficient / price incorrect…",
    rejectConfirm: "Reject and send",
    rejectRequired: "Comment is required",
  };
}

export function ListingModerationActions({
  carId,
  onDone,
}: {
  carId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const { locale } = useAdminLocale();
  const labels = actionLabels(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const setStatus = async (status: "APPROVED" | "REJECTED", note?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cars/${carId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" ? { rejectionNote: note?.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRejectOpen(false);
      setRejectNote("");
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(labels.delete + "?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cars/${carId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`${ADMIN_BASE}/moderation/listings/${encodeURIComponent(carId)}`}
        className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500"
      >
        {labels.details}
      </Link>
      <button
        type="button"
        disabled={loading}
        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-500 disabled:opacity-50"
        onClick={() => void setStatus("APPROVED")}
      >
        {labels.approve}
      </button>
      <button
        type="button"
        disabled={loading}
        className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-400 disabled:opacity-50"
        onClick={() => {
          setError("");
          setRejectOpen(true);
        }}
      >
        {labels.reject}
      </button>
      <button
        type="button"
        disabled={loading}
        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
        onClick={() => void remove()}
      >
        {labels.delete}
      </button>
      {error ? <p className="w-full text-right text-xs font-semibold text-red-700">{error}</p> : null}

      {rejectOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.rejectTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{labels.rejectHint}</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={labels.rejectPlaceholder}
              autoFocus
            />
            {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || !rejectNote.trim()}
                onClick={() => void setStatus("REJECTED", rejectNote)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {labels.rejectConfirm}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setRejectOpen(false);
                  setRejectNote("");
                  setError("");
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                {labels.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
