"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { europeAndAsiaCountries, worldCountryName } from "@/lib/catalog/world-countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

type CountryOption = { iso2: string; name: string; hoverRegion: "Europe" | "Asia" };

function matchesCountry(country: CountryOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return country.name.toLowerCase().includes(q) || country.iso2.toLowerCase().includes(q);
}

export function OperatingCountriesHover({
  countryIso2s,
  onChange,
}: {
  countryIso2s: string[];
  onChange: (iso2s: string[]) => void;
}) {
  const { dictionary } = useSurfaceDictionary();
  const t = dictionary.partner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<CountryOption[]>(europeAndAsiaCountries());
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/operating-countries")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.countries) || !data.countries.length) return;
        setOptions(data.countries as CountryOption[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const placePanel = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 340);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = Math.min(380, Math.max(220, spaceBelow > 240 ? spaceBelow - 16 : rect.top - 16));
    const openUp = spaceBelow < 240 && rect.top > spaceBelow;
    setPanelStyle({
      position: "fixed",
      left: Math.max(12, left),
      width,
      maxHeight,
      top: openUp ? undefined : rect.bottom + 8,
      bottom: openUp ? window.innerHeight - rect.top + 8 : undefined,
      zIndex: 80,
    });
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
      if ((target as HTMLElement).closest?.("[data-operating-countries-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(
    () =>
      options
        .filter((c) => matchesCountry(c, query))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [options, query],
  );
  const selectedNames = countryIso2s.map((iso2) => worldCountryName(iso2));
  const summary =
    selectedNames.length === 0
      ? t.selectCountries
      : selectedNames.length <= 2
        ? selectedNames.join(", ")
        : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2}`;

  const toggle = (iso2: string) => {
    onChange(countryIso2s.includes(iso2) ? countryIso2s.filter((item) => item !== iso2) : [...countryIso2s, iso2]);
  };

  const openPanel = () => {
    placePanel();
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const onOpenClick = () => {
    if (open) setOpen(false);
    else openPanel();
  };

  const renderList = (items: CountryOption[]) => (
    <ul className="space-y-1">
      {items.map((c) => (
        <li key={c.iso2}>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={countryIso2s.includes(c.iso2)}
              onChange={() => toggle(c.iso2)}
            />
            <CountryFlag iso2={c.iso2} title={c.name} />
            <span>{c.name}</span>
          </label>
        </li>
      ))}
    </ul>
  );

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-operating-countries-panel
            style={panelStyle}
            className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xl"
          >
            <div className="shrink-0 border-b p-3">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder={t.operatingSearch}
                className="w-full rounded-lg border px-3 py-2 text-sm font-normal outline-none focus:border-sky-400"
                aria-label={t.operatingSearch}
              />
              <p className="mt-2 text-xs text-slate-500">{t.operatingHint}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  {t.operatingEmpty.replace("{query}", query)}
                </p>
              ) : (
                renderList(filtered)
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold",
          countryIso2s.length ? "border-sky-400 bg-sky-50 text-sky-950" : "border-slate-200 bg-white text-slate-700",
        )}
      >
        <span className="flex min-w-0 items-start gap-2">
          {countryIso2s.slice(0, 3).map((iso2) => (
            <CountryFlag key={iso2} iso2={iso2} className="mt-1" />
          ))}
          <span className="min-w-0">
            {t.operatingCountries} <span className="text-red-500">*</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">{summary}</span>
          </span>
        </span>
        <button
          ref={triggerRef}
          type="button"
          className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-700"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={onOpenClick}
        >
          {t.hover}
        </button>
      </div>
      {panel}
    </div>
  );
}
