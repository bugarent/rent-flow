"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  ADMIN_CURRENCIES,
  ADMIN_CURRENCY_LABELS,
  ADMIN_LOCALES,
  ADMIN_LOCALE_LABELS,
  type AdminCurrency,
  type AdminLocale,
} from "@/lib/i18n/admin-config";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { CountryFlag } from "@/components/ui/country-flag";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { cn } from "@/lib/utils";

const CURRENCY_FLAG_ISO2: Record<AdminCurrency, string> = {
  EUR: "EU",
  USD: "US",
  GBP: "GB",
  GEL: "GE",
};

function AdminDropdown({
  label,
  trigger,
  children,
  className,
}: {
  label: string;
  trigger: (open: boolean) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  className?: string;
}) {
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
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2.5 text-xs font-semibold text-white hover:bg-white/15"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
      >
        {trigger(open)}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
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
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function AdminLanguageSelect({ className }: { className?: string }) {
  const { locale, setLocale, dictionary } = useAdminLocale();

  return (
    <AdminDropdown
      className={className}
      label={dictionary.language}
      trigger={() => (
        <>
          <LocaleFlag locale={locale} className="h-3.5 w-5" />
          <span className="hidden sm:inline">{ADMIN_LOCALE_LABELS[locale]}</span>
        </>
      )}
    >
      {(close) =>
        ADMIN_LOCALES.map((code: AdminLocale) => (
          <button
            key={code}
            type="button"
            role="option"
            aria-selected={code === locale}
            onClick={() => {
              setLocale(code);
              close();
            }}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
              code === locale && "bg-slate-50 font-semibold text-[#0b1f4b]",
            )}
          >
            <LocaleFlag locale={code} className="h-3.5 w-5" />
            {ADMIN_LOCALE_LABELS[code]}
          </button>
        ))
      }
    </AdminDropdown>
  );
}

export function AdminCurrencySelect({ className }: { className?: string }) {
  const { currency, setCurrency, dictionary } = useAdminLocale();

  return (
    <AdminDropdown
      className={className}
      label={dictionary.common.currency}
      trigger={() => (
        <span className="tracking-tight">{ADMIN_CURRENCY_LABELS[currency]}</span>
      )}
    >
      {(close) =>
        ADMIN_CURRENCIES.map((code: AdminCurrency) => (
          <button
            key={code}
            type="button"
            role="option"
            aria-selected={code === currency}
            onClick={() => {
              setCurrency(code);
              close();
            }}
            className={cn(
              "flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50",
              code === currency && "bg-slate-50 font-semibold text-[#0b1f4b]",
            )}
          >
            <CountryFlag
              iso2={CURRENCY_FLAG_ISO2[code]}
              title={ADMIN_CURRENCY_LABELS[code]}
              className="h-3.5 w-5 rounded-[2px]"
            />
            {ADMIN_CURRENCY_LABELS[code]}
          </button>
        ))
      }
    </AdminDropdown>
  );
}
