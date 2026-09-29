"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  PARTNER_LOCALES,
  PARTNER_LOCALE_LABELS,
} from "@/lib/i18n/partner-config";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { cn } from "@/lib/utils";

export function PartnerLanguageSelect({
  className,
  variant = "dark",
  compact = false,
  flagOnly = false,
}: {
  className?: string;
  variant?: "dark" | "light";
  compact?: boolean;
  /** Show flag (+ chevron) only — saves top-bar width */
  flagOnly?: boolean;
}) {
  const { locale, setLocale, dictionary } = usePartnerLocale();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = () => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 168);
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    setCoords({ top: rect.bottom + 8, left, minWidth: menuWidth });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold",
          compact || flagOnly ? "h-7" : "h-9 px-2.5 text-xs",
          variant === "dark"
            ? "border border-white/25 bg-white/10 text-white hover:bg-white/15"
            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={dictionary.language}
        title={dictionary.language}
      >
        <LocaleFlag locale={locale} className="h-3 w-4" />
        {!flagOnly ? (
          <span className={cn(compact ? "hidden lg:inline" : "hidden sm:inline")}>
            {PARTNER_LOCALE_LABELS[locale]}
          </span>
        ) : null}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              className="fixed z-[200] max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              style={{ top: coords.top, left: coords.left, minWidth: coords.minWidth }}
            >
              {PARTNER_LOCALES.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={code === locale}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
                    code === locale && "bg-slate-50 font-semibold text-[#0b1f4b]",
                  )}
                >
                  <LocaleFlag locale={code} className="h-3.5 w-5" />
                  {PARTNER_LOCALE_LABELS[code]}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
