"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  RentalTermsList,
  type RentalTermsItem,
} from "@/components/cars/rental-terms-list";

export type { RentalTermsItem };

export function RentalTermsModal({
  open,
  onClose,
  title,
  items,
  disclaimer,
  closeLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: RentalTermsItem[];
  disclaimer: string;
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

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rental-terms-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.28)] ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
          <h2
            id="rental-terms-modal-title"
            className="text-[15px] font-bold tracking-wide text-slate-900 sm:text-base"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <RentalTermsList items={items} disclaimer={disclaimer} />
        </div>
      </div>
    </div>
  );
}
