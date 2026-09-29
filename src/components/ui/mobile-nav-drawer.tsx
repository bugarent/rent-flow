"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-height slide-over drawer for portal hamburger menus.
 * Locks body scroll while open; closes on Escape / backdrop.
 */
export function MobileNavDrawer({
  open,
  onClose,
  title,
  children,
  side = "left",
  closeLabel = "Close menu",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right";
  closeLabel?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        className={cn(
          "absolute inset-y-0 flex w-[min(100%,20rem)] flex-col bg-[#0b1f4b] text-white shadow-2xl",
          side === "left" ? "start-0" : "end-0",
          className,
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          {title ? <p className="truncate text-sm font-extrabold tracking-wide">{title}</p> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">{children}</div>
      </div>
    </div>
  );
}
