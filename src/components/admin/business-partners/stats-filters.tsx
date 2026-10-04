"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { businessPartnerCategoryMatches } from "@/lib/catalog/business-partners";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";

export type StatsCountryOption = { iso2: string; label: string };

function isoToDmy(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

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
  const L = useBpLabels();
  const [text, setText] = useState(() => isoToDmy(defaultIso));
  const [iso, setIso] = useState(defaultIso);
  const pickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(isoToDmy(defaultIso));
    setIso(defaultIso);
  }, [defaultIso]);

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
          aria-label={label}
          required
        />
        <input type="hidden" name={name} value={iso} required />
        <input
          ref={pickerRef}
          type="date"
          lang={uiLocaleTag(L.locale)}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={iso}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            setIso(v);
            setText(isoToDmy(v));
          }}
          tabIndex={-1}
          aria-hidden
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-sky-500 hover:text-sky-700"
          aria-label="Open calendar"
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
      <span className="mt-1 block text-[11px] font-normal text-slate-400">DD / MM / YYYY</span>
    </label>
  );
}

function CountryCombobox({
  options,
  defaultIso2,
}: {
  options: StatsCountryOption[];
  defaultIso2: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const L = useBpLabels();
  const [iso2, setIso2] = useState(defaultIso2);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((c) => c.iso2 === iso2) ?? null;
  const displayValue = open ? query : selected ? `${selected.label} (${selected.iso2})` : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.label.toLowerCase().startsWith(q) || c.iso2.toLowerCase().startsWith(q),
    );
  }, [options, query]);

  useEffect(() => {
    setIso2(defaultIso2);
  }, [defaultIso2]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <label className="relative text-sm font-semibold text-slate-700">
      {L.partnerCountry}
      <input type="hidden" name="country" value={iso2} />
      <div ref={rootRef} className="relative mt-1.5">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={L.allCountriesSearch}
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
                {L.allCountries}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">{L.noCountryMatch}</li>
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

function CategorySelect({
  options,
  defaultCategory,
}: {
  options: string[];
  defaultCategory: string;
}) {
  const L = useBpLabels();
  return (
    <label className="text-sm font-semibold text-slate-700">
      {L.category}
      <select
        name="category"
        defaultValue={defaultCategory}
        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white p-2.5 font-normal text-slate-800"
      >
        <option value="">{L.allCategories}</option>
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchField({ defaultValue }: { defaultValue: string }) {
  const L = useBpLabels();
  return (
    <label className="text-sm font-semibold text-slate-700">
      {L.search}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={L.searchPlaceholder}
        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white p-2.5 font-normal text-slate-800"
        autoComplete="off"
      />
    </label>
  );
}

export function BusinessPartnerStatsFilters({
  from,
  to,
  country,
  countries,
  category,
  categories,
  q = "",
  tab = "stats",
}: {
  from: string;
  to: string;
  country: string;
  countries: StatsCountryOption[];
  category: string;
  categories: string[];
  q?: string;
  tab?: "stats" | "list" | "countries" | "moderation";
}) {
  const L = useBpLabels();
  return (
    <form
      method="get"
      action={`${ADMIN_BASE}/business-partners`}
      className="mb-8 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:items-end"
      lang={uiLocaleTag(L.locale)}
    >
      <input type="hidden" name="tab" value={tab} />
      <DmyDateField label={L.startDate} name="from" defaultIso={from} />
      <DmyDateField label={L.endDate} name="to" defaultIso={to} />
      <SearchField defaultValue={q} />
      <CountryCombobox options={countries} defaultIso2={country} />
      <CategorySelect options={categories} defaultCategory={category} />
      <button
        type="submit"
        className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white hover:bg-sky-700"
      >
        {L.applyFilters}
      </button>
    </form>
  );
}

export function defaultStatsDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
  };
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function filterPartnersForStats<
  T extends {
    createdAt: string;
    countryIso2?: string;
    category?: string;
    status: string;
    fullName?: string;
    email?: string;
    phone?: string;
    referralCode?: string;
    notes?: string;
    website?: string;
  },
>(
  partners: T[],
  fromIso: string,
  toIso: string,
  countryIso2: string,
  category = "",
  q = "",
): T[] {
  const wantCountry = countryIso2.trim().toUpperCase();
  const wantCategory = category.trim();
  const query = q.trim().toLowerCase();

  return partners.filter((p) => {
    if (fromIso || toIso) {
      const created = Date.parse(p.createdAt);
      const fromMs = fromIso ? Date.parse(`${fromIso}T00:00:00.000Z`) : NaN;
      const toMs = toIso ? Date.parse(`${toIso}T23:59:59.999Z`) : NaN;
      if (Number.isFinite(fromMs) && Number.isFinite(created) && created < fromMs) return false;
      if (Number.isFinite(toMs) && Number.isFinite(created) && created > toMs) return false;
    }
    if (wantCountry && String(p.countryIso2 || "").toUpperCase() !== wantCountry) return false;
    if (wantCategory && !businessPartnerCategoryMatches(String(p.category || ""), wantCategory)) {
      return false;
    }
    if (query) {
      const haystack = [
        p.fullName,
        p.email,
        p.phone,
        p.referralCode,
        p.category,
        p.countryIso2,
        p.notes,
        p.website,
        p.status,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
