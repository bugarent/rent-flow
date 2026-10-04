"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { WORLD_COUNTRIES } from "@/lib/catalog/world-countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

const OPTIONS = [...WORLD_COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
);

type Copy = {
  placeholder: string;
  search: string;
  empty: string;
};

const COPY: Record<string, Copy> = {
  en: {
    placeholder: "Select country of residence",
    search: "Type to search…",
    empty: "No matching countries",
  },
  ka: {
    placeholder: "აირჩიეთ საცხოვრებელი ქვეყანა",
    search: "ჩაწერეთ ძებნისთვის…",
    empty: "ქვეყანა ვერ მოიძებნა",
  },
  ru: {
    placeholder: "Выберите страну проживания",
    search: "Начните вводить…",
    empty: "Страны не найдены",
  },
  fr: {
    placeholder: "Sélectionnez le pays de résidence",
    search: "Tapez pour rechercher…",
    empty: "Aucun pays trouvé",
  },
  de: {
    placeholder: "Wohnsitzland wählen",
    search: "Tippen zum Suchen…",
    empty: "Keine Länder gefunden",
  },
  pl: {
    placeholder: "Wybierz kraj zamieszkania",
    search: "Wpisz, aby wyszukać…",
    empty: "Nie znaleziono krajów",
  },
  ar: {
    placeholder: "اختر بلد الإقامة",
    search: "اكتب للبحث…",
    empty: "لا توجد دول مطابقة",
  },
};

function copyFor(locale: string): Copy {
  return COPY[locale] || COPY.en;
}

function matchesQuery(name: string, iso2: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    name.toLowerCase().startsWith(q) ||
    name.toLowerCase().includes(q) ||
    iso2.toLowerCase().startsWith(q)
  );
}

function rankMatch(name: string, iso2: string, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const n = name.toLowerCase();
  const code = iso2.toLowerCase();
  if (n.startsWith(q)) return 0;
  if (code.startsWith(q)) return 1;
  if (n.includes(` ${q}`)) return 2;
  return 3;
}

export function ResidenceCountrySelect({
  valueIso2,
  onChange,
  locale,
  invalid = false,
  label,
}: {
  /** ISO 3166-1 alpha-2, or empty when unset. */
  valueIso2: string;
  onChange: (iso2: string, name: string) => void;
  locale: string;
  invalid?: boolean;
  /** Visible label, e.g. “ვცხოვრობ”. */
  label: string;
}) {
  const t = copyFor(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = OPTIONS.find((c) => c.iso2 === valueIso2) ?? null;

  const filtered = useMemo(() => {
    const list = OPTIONS.filter((c) => matchesQuery(c.name, c.iso2, query));
    if (!query.trim()) return list;
    return [...list].sort(
      (a, b) =>
        rankMatch(a.name, a.iso2, query) - rankMatch(b.name, b.iso2, query) ||
        a.name.localeCompare(b.name),
    );
  }, [query]);

  const placePanel = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 300);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxHeight = Math.min(360, Math.max(220, spaceBelow > 260 ? spaceBelow - 12 : rect.top - 12));
    const openUp = spaceBelow < 260 && rect.top > spaceBelow;
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
      if ((target as HTMLElement).closest?.("[data-residence-country-panel]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, filtered]);

  const pick = (iso2: string, name: string) => {
    onChange(iso2, name);
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
      if (hit) pick(hit.iso2, hit.name);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            data-residence-country-panel
            style={panelStyle}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl"
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
                placeholder={t.search}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400"
                aria-label={t.search}
              />
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto bg-white p-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">{t.empty}</p>
              ) : (
                filtered.map((c, index) => (
                  <button
                    key={c.iso2}
                    type="button"
                    data-active={index === highlight ? "true" : "false"}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                      c.iso2 === valueIso2
                        ? "bg-sky-50 font-semibold text-sky-950"
                        : "text-slate-800",
                      index === highlight ? "ring-1 ring-sky-300" : "hover:bg-slate-50",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pick(c.iso2, c.name)}
                  >
                    <CountryFlag iso2={c.iso2} title={c.name} />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-xs font-bold text-slate-400">{c.iso2}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative w-full">
      <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-invalid={invalid || undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm outline-none transition",
          invalid
            ? "border-2 border-red-500 bg-red-50 ring-2 ring-red-200"
            : "border-slate-300 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
        )}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(event) => {
          if (event.key.length === 1 && /[a-zа-яა-ჰ]/i.test(event.key)) {
            event.preventDefault();
            openPanel(event.key);
          } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) openPanel();
          }
        }}
      >
        {selected ? (
          <>
            <CountryFlag iso2={selected.iso2} title={selected.name} />
            <span className="min-w-0 flex-1 truncate font-semibold text-[#0b1f4b]">
              {selected.name}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-slate-400">{t.placeholder}</span>
        )}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}
