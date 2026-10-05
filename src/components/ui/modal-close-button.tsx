"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModalCloseButton({
  onClick,
  label = "Close",
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute end-2.5 top-2.5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100",
        className,
      )}
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
