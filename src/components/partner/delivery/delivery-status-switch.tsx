"use client";

import { cn } from "@/lib/utils";

export function DeliveryStatusSwitch({
  checked,
  disabled,
  onLabel,
  offLabel,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onLabel: string;
  offLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-[#28a745]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[1.55rem]" : "translate-x-1",
        )}
      />
      <span className="sr-only">{checked ? onLabel : offLabel}</span>
    </button>
  );
}
