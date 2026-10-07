"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  LOCALES,
  LOCALE_LABELS,
  type Currency,
  type Locale,
} from "@/lib/i18n/config";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

/** Soft glass chip — separated without a loud white/blue fill. */
export const headerChipClass =
  "inline-flex h-11 min-h-11 shrink-0 items-center gap-2 rounded-md border border-white/70 bg-white/90 px-4 text-sm font-semibold leading-none text-[#0b1f4b] shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-white sm:h-11 sm:gap-2.5 sm:px-5 sm:text-[15px]";

const CURRENCY_FLAG_ISO2: Record<Currency, string> = {
  EUR: "EU",
  USD: "US",
  GBP: "GB",
  GEL: "GE",
};

function Dropdown({
  trigger,
  children,
  menuClassName,
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  menuClassName?: string;
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
    const menuWidth = Math.max(rect.width, 160);
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    setCoords({
      top: rect.bottom + 8,
      left,
      minWidth: menuWidth,
    });
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

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div ref={wrapRef} className="relative flex h-11 shrink-0 items-center">
      {trigger(open, toggle)}
      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              className={cn(
                "fixed z-[200] max-h-[min(46vh,320px)] w-[min(calc(100vw-1rem),16rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl",
                menuClassName,
              )}
              style={{ top: coords.top, left: coords.left, minWidth: coords.minWidth }}
            >
              {children(close)}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function LanguageSelect({
  locale,
  onChange,
  buttonClassName,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
  buttonClassName?: string;
}) {
  return (
    <Dropdown
      trigger={(open, toggle) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          className={cn(headerChipClass, buttonClassName)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Language: ${LOCALE_LABELS[locale]}`}
        >
          <LocaleFlag locale={locale} />
          <span className="hidden sm:inline">{LOCALE_LABELS[locale]}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      )}
    >
        {(close) =>
        LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="option"
            aria-selected={code === locale}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(code);
              close();
            }}
            className={cn(
              "flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50",
              code === locale && "bg-slate-50 font-semibold text-[#1A3B5D]",
            )}
          >
            <LocaleFlag locale={code} />
            <span className="min-w-0 flex-1 truncate">{LOCALE_LABELS[code]}</span>
          </button>
        ))
      }
    </Dropdown>
  );
}

export function CurrencySelect({
  currency,
  onChange,
  buttonClassName,
}: {
  currency: Currency;
  onChange: (currency: Currency) => void;
  buttonClassName?: string;
}) {
  return (
    <Dropdown
      menuClassName="min-w-[160px]"
      trigger={(open, toggle) => (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }}
          className={cn(headerChipClass, buttonClassName)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Currency: ${CURRENCY_LABELS[currency]}`}
        >
          <span className="font-semibold tracking-tight">{CURRENCY_LABELS[currency]}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      )}
    >
      {(close) =>
        CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            role="option"
            aria-selected={code === currency}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(code);
              close();
            }}
            className={cn(
              "flex min-h-11 w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50",
              code === currency && "bg-slate-50 font-semibold text-[#1A3B5D]",
            )}
          >
            <CountryFlag
              iso2={CURRENCY_FLAG_ISO2[code]}
              title={CURRENCY_LABELS[code]}
              className="h-4 w-[22px] rounded-[3px] shadow-[0_0_0_1px_rgba(15,23,42,0.18)]"
            />
            {CURRENCY_LABELS[code]}
          </button>
        ))
      }
    </Dropdown>
  );
}
