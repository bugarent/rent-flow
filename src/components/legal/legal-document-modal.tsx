"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function LegalDocumentModal({
  open,
  onClose,
  title,
  body,
  fileUrl,
  openFileLabel,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  fileUrl?: string;
  openFileLabel?: string;
  closeLabel: string;
}) {
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

  const href = String(fileUrl || "").trim();

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-document-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(94dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
          <h2
            id="legal-document-modal-title"
            className="text-[15px] font-bold tracking-wide text-slate-900 sm:text-base"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{body}</p>
          ) : null}
          {href ? (
            <p className={body ? "mt-4" : undefined}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
              >
                {openFileLabel || href}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
