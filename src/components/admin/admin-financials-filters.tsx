"use client";

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";

export type FinanceCountryOption = { iso2: string; label: string };

/** ISO YYYY-MM-DD → DD/MM/YYYY */
function isoToDmy(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** DD/MM/YYYY or D/M/YYYY → ISO YYYY-MM-DD, or "" if invalid */
function dmyToIso(raw: string) {
  const cleaned = raw.trim().replace(/[.\-]/g, "/");
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function DmyDateField({
  label,
  name,
  defaultIso,
}: {
  label: string;
  name: string;
  defaultIso: string;
}) {
  const [text, setText] = useState(() => isoToDmy(defaultIso));
  const [iso, setIso] = useState(defaultIso);
  const [isoSeen, setIsoSeen] = useState(defaultIso);
  const pickerRef = useRef<HTMLInputElement>(null);
  const { locale } = useAdminLocale();
  if (defaultIso !== isoSeen) {
    setIsoSeen(defaultIso);
    setIso(defaultIso);
    setText(isoToDmy(defaultIso));
  }

  function commitText(next: string) {
    setText(next);
    const parsed = dmyToIso(next);
    if (parsed) setIso(parsed);
  }

  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <div className="relative mt-1.5">
        <input
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/YYYY"
          value={text}
          onChange={(e) => commitText(e.target.value)}
          onBlur={() => {
            if (iso) setText(isoToDmy(iso));
          }}
          className="block w-full rounded-xl border border-slate-200 p-2.5 pr-10 font-normal"
          aria-label={`${label} (day / month / year)`}
          required
        />
        <input type="hidden" name={name} value={iso} required />
        <input
          ref={pickerRef}
          type="date"
          lang="en-GB"
          value={iso}
          onChange={(e) => {
            const v = e.target.value;
            setIso(v);
            setText(isoToDmy(v));
          }}
          className="absolute inset-y-0 right-0 w-10 cursor-pointer opacity-0"
          tabIndex={-1}
          aria-hidden
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label={`Open calendar for ${label}`}
          onClick={() => {
            const el = pickerRef.current;
            if (!el) return;
            try {
              el.showPicker?.();
            } catch {
              el.click();
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <span className="mt-1 block text-[11px] font-normal text-slate-400">
        {uiText(locale, "DD / MM / YYYY", "დდ / თთ / წწწწ", "ДД / ММ / ГГГГ")}
      </span>
    </label>
  );
}

function CountryCombobox({
  options,
  defaultIso2,
}: {
  options: FinanceCountryOption[];
  defaultIso2: string;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [iso2, setIso2] = useState(defaultIso2);
  const [iso2Seen, setIso2Seen] = useState(defaultIso2);
  const rootRef = useRef<HTMLDivElement>(null);
  if (defaultIso2 !== iso2Seen) {
    setIso2Seen(defaultIso2);
    setIso2(defaultIso2);
  }
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((c) => c.iso2 === iso2) ?? null;

  const displayValue = open
    ? query
    : selected
      ? `${selected.label} (${selected.iso2})`
      : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.label.toLowerCase().startsWith(q) || c.iso2.toLowerCase().startsWith(q),
    );
  }, [options, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <label className="relative text-sm font-semibold text-slate-700">
      {phrase("Partner country", "პარტნიორის ქვეყანა", "Страна партнёра")}
      <input type="hidden" name="country" value={iso2} />
      <div ref={rootRef} className="relative mt-1.5">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={phrase("All countries — type to search", "ყველა ქვეყანა — აკრიფეთ საძებნად", "Все страны — введите для поиска")}
          value={displayValue}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          className="block w-full rounded-xl border border-slate-200 p-2.5 font-normal"
        />
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            <li>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setIso2("");
                  setQuery("");
                  setOpen(false);
                }}
              >
                {phrase("All countries", "ყველა ქვეყანა", "Все страны")}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">
                {phrase("No matching countries", "ქვეყანა ვერ მოიძებნა", "Страны не найдены")}
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.iso2 === iso2}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setIso2(c.iso2);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {c.label} ({c.iso2})
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </label>
  );
}

type FinancePeriod = "1m" | "6m" | "1y" | "all";

const FINANCE_PERIODS: FinancePeriod[] = ["1m", "6m", "1y", "all"];

function isoLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function periodRange(id: FinancePeriod, now = new Date()) {
  const to = isoLocal(now);
  if (id === "all") return { from: "2000-01-01", to };
  const months = id === "1m" ? 1 : id === "6m" ? 6 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return { from: isoLocal(start), to };
}

function matchingPeriod(from: string, to: string): FinancePeriod | "" {
  for (const id of ["1m", "6m", "1y", "all"] as const) {
    const range = periodRange(id);
    if (from === range.from && to === range.to) return id;
  }
  return "";
}

export function AdminFinancialsFilters({
  from,
  to,
  country,
  countries,
  isPartnerCancelled,
}: {
  from: string;
  to: string;
  country: string;
  countries: FinanceCountryOption[];
  isPartnerCancelled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const periodLabel = (id: FinancePeriod) => {
    if (id === "1m") return phrase("Last month", "ბოლო თვე", "Последний месяц");
    if (id === "6m") return phrase("Last 6 months", "ბოლო 6 თვე", "Последние 6 месяцев");
    if (id === "1y") return phrase("Last year", "ბოლო წელი", "Последний год");
    return phrase("Full period", "სრული პერიოდი", "Весь период");
  };
  const activePeriod = matchingPeriod(from, to);

  function applyPeriod(id: FinancePeriod) {
    const range = periodRange(id);
    const params = new URLSearchParams();
    params.set("tab", "financials");
    if (isPartnerCancelled) params.set("view", "partner-cancelled");
    params.set("from", range.from);
    params.set("to", range.to);
    const selected = formRef.current
      ? String(new FormData(formRef.current).get("country") || "").trim()
      : country;
    if (selected) params.set("country", selected.toUpperCase());
    router.push(`${ADMIN_BASE}/bookings?${params.toString()}`);
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={`${ADMIN_BASE}/bookings`}
      className="mb-8 rounded-2xl border bg-white p-5"
      lang={locale === "ka" ? "ka" : locale === "ru" ? "ru" : "en"}
    >
      <input type="hidden" name="tab" value="financials" />
      {isPartnerCancelled ? <input type="hidden" name="view" value="partner-cancelled" /> : null}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={phrase("Quick period", "სწრაფი პერიოდი", "Быстрый период")}>
        {FINANCE_PERIODS.map((id) => {
          const selected = id === activePeriod;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => applyPeriod(id)}
              className={
                selected
                  ? "rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-bold text-white"
                  : "rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50"
              }
            >
              {periodLabel(id)}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <DmyDateField label={phrase("Start date", "საწყისი თარიღი", "Дата начала")} name="from" defaultIso={from} />
        <DmyDateField label={phrase("End date", "საბოლოო თარიღი", "Дата окончания")} name="to" defaultIso={to} />
        <CountryCombobox options={countries} defaultIso2={country} />
        <button
          type="submit"
          className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white hover:bg-sky-700"
        >
          {phrase("Apply filters", "ფილტრის გამოყენება", "Применить фильтры")}
        </button>
      </div>
    </form>
  );
}
