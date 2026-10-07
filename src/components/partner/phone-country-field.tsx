"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { DIAL_CODES, formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

const OPTIONS = WORLD_COUNTRIES.filter((c) => DIAL_CODES[c.iso2])
  .map((c) => ({
    iso2: c.iso2,
    name: c.name,
    dial: DIAL_CODES[c.iso2],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

function matchesQuery(
  option: (typeof OPTIONS)[number],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const hay = `${option.name} ${option.iso2} +${option.dial} ${option.dial}`.toLowerCase();
  if (hay.includes(q.replace(/^\+/, ""))) return true;
  if (digits && option.dial.includes(digits)) return true;
  return false;
}

export function DialCodeSelect({
  iso2,
  label,
  onChange,
  invalid,
}: {
  iso2: string;
  label: string;
  onChange: (iso2: string) => void;
  invalid?: boolean;
}) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = OPTIONS.find((c) => c.iso2 === iso2) ?? OPTIONS.find((c) => c.iso2 === "GE") ?? OPTIONS[0];
  const filtered = useMemo(() => {
    const list = OPTIONS.filter((c) => matchesQuery(c, query));
    const digits = query.replace(/\D/g, "");
    if (!digits) return list;
    return [...list].sort((a, b) => {
      const score = (item: (typeof OPTIONS)[number]) => {
        if (item.dial === digits) return 0;
        if (item.dial.startsWith(digits)) return 1;
        if (item.dial.includes(digits)) return 2;
        return 3;
      };
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });
  }, [query]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 280);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = Math.min(340, Math.max(200, spaceBelow > 240 ? spaceBelow - 12 : rect.top - 12));
    const openUp = spaceBelow < 240 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: Math.max(12, left),
      width,
      maxHeight,
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      zIndex: 9999,
    });
  };

  const openPanel = (initialQuery = "") => {
    setQuery(initialQuery);
    setHighlight(0);
    placePanel();
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const onScroll = () => placePanel();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-dial-code-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, filtered]);

  const pick = (nextIso2: string) => {
    onChange(nextIso2);
    setOpen(false);
    setQuery("");
    buttonRef.current?.focus();
  };

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = filtered[highlight];
      if (hit) pick(hit.iso2);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-dial-code-panel
            style={panelStyle}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl"
          >
            <div className="border-b border-slate-100 bg-white p-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onSearchKey}
                placeholder={t.searchCode}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                aria-label={`${label} ${t.searchCode}`}
              />
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-white p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">{t.noCodes}</p>
              ) : (
                filtered.map((c, index) => (
                  <button
                    key={c.iso2}
                    type="button"
                    data-active={index === highlight ? "true" : "false"}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-800",
                      c.iso2 === iso2 ? "bg-sky-50 font-semibold text-sky-950" : "",
                      index === highlight ? "ring-1 ring-sky-300" : "hover:bg-slate-50",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(c.iso2)}
                  >
                    <CountryFlag iso2={c.iso2} title={c.name} />
                    <span className="tabular-nums text-slate-900">+{c.dial}</span>
                    <span className="truncate text-slate-500">{c.name}</span>
                    <span className="ms-auto text-xs font-bold text-slate-400">{c.iso2}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-full min-h-[3rem] w-[8.75rem] items-center gap-1.5 rounded-xl border bg-white px-2.5 text-sm font-normal text-slate-900",
          invalid ? "border-red-500 bg-red-50 ring-2 ring-red-200" : "border-slate-200",
        )}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(event) => {
          if (event.key.length === 1 && /[0-9a-z+]/i.test(event.key)) {
            event.preventDefault();
            openPanel(event.key);
          } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPanel();
          }
        }}
      >
        <CountryFlag iso2={selected.iso2} title={selected.name} />
        <span className="tabular-nums text-slate-900">+{selected.dial}</span>
        <span className="text-xs font-bold text-slate-400">{selected.iso2}</span>
      </button>
      {panel}
    </div>
  );
}

export function PhoneCountryField({
  label,
  iso2,
  national,
  required,
  invalid,
  onIso2Change,
  onNationalChange,
  children,
}: {
  label: string;
  iso2: string;
  national: string;
  required?: boolean;
  invalid?: boolean;
  onIso2Change: (iso2: string) => void;
  onNationalChange: (national: string) => void;
  children?: ReactNode;
}) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const preview = formatInternationalPhone(iso2, national);

  return (
    <div className="block text-slate-900">
      <p className="text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </p>
      <div className="mt-1 flex gap-2">
        <DialCodeSelect iso2={iso2} label={label} onChange={onIso2Change} invalid={invalid} />
        <input
          type="tel"
          inputMode="tel"
          className={cn(
            "min-w-0 flex-1 rounded-xl border bg-white p-3 text-base font-normal text-slate-900 caret-slate-900 outline-none transition placeholder:text-slate-400",
            invalid
              ? "border-2 border-red-500 bg-red-50 ring-2 ring-red-200"
              : "border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
          )}
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          placeholder={t.phonePlaceholder}
          autoComplete="tel-national"
          aria-label={label}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
        />
      </div>
      {preview ? (
        <p className="mt-1 text-xs font-normal text-slate-500">
          {t.savedAs.replace("{phone}", preview).replace("{country}", worldCountryName(iso2))}
        </p>
      ) : null}
      {children}
    </div>
  );
}
