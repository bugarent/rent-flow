"use client";

import { useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> & {
  type?: "date" | "datetime-local";
  value?: string;
  defaultValue?: string;
  /** Classes for the native input when it must keep its own box (rare). */
  inputClassName?: string;
};

/** `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` → `DD.MM.YYYY` / `DD.MM.YYYY HH:mm`. */
export function formatDateInputValue(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(raw.trim());
  if (!m) return "";
  const date = `${m[3]}.${m[2]}.${m[1]}`;
  return m[4] ? `${date} ${m[4]}:${m[5]}` : date;
}

/**
 * Date field that always reads day → month → year, independent of the browser locale.
 * A transparent native input sits on top so the platform calendar picker still opens.
 */
export function DateInput({
  type = "date",
  value,
  defaultValue,
  onChange,
  onClick,
  className,
  inputClassName,
  placeholder,
  disabled,
  ...rest
}: DateInputProps) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : inner;
  const shown = formatDateInputValue(current ?? "");
  const hint = placeholder ?? (type === "datetime-local" ? "dd.mm.yyyy --:--" : "dd.mm.yyyy");

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) setInner(e.target.value);
    onChange?.(e);
  };

  return (
    <span
      className={cn(
        "relative min-w-0 items-center tabular-nums focus-within:ring-2 focus-within:ring-sky-200",
        disabled && "cursor-not-allowed opacity-70",
        className,
        /(^|\s)(block|w-full)(\s|$)/.test(className ?? "") ? "flex" : "inline-flex",
      )}
    >
      <span className={cn("pointer-events-none min-w-0 flex-1 truncate", !shown && "text-slate-400")}>
        {shown || hint}
      </span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="pointer-events-none ms-1.5 h-4 w-4 shrink-0 opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <input
        {...rest}
        type={type}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        disabled={disabled}
        onChange={handleChange}
        onClick={(e) => {
          onClick?.(e);
          if (disabled || e.defaultPrevented) return;
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* picker unavailable (e.g. not a user gesture) — native focus still works */
          }
        }}
        className={cn(
          "absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          inputClassName,
        )}
      />
    </span>
  );
}
