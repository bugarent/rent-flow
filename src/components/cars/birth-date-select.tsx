"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Labels = {
  day: string;
  month: string;
  year: string;
  months: readonly string[];
};

const LABELS: Record<string, Labels> = {
  en: {
    day: "Day",
    month: "Month",
    year: "Year",
    months: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
  },
  ka: {
    day: "დღე",
    month: "თვე",
    year: "წელი",
    months: [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკემბერი",
    ],
  },
  ru: {
    day: "День",
    month: "Месяц",
    year: "Год",
    months: [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ],
  },
  fr: {
    day: "Jour",
    month: "Mois",
    year: "Année",
    months: [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ],
  },
  de: {
    day: "Tag",
    month: "Monat",
    year: "Jahr",
    months: [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember",
    ],
  },
  pl: {
    day: "Dzień",
    month: "Miesiąc",
    year: "Rok",
    months: [
      "Styczeń",
      "Luty",
      "Marzec",
      "Kwiecień",
      "Maj",
      "Czerwiec",
      "Lipiec",
      "Sierpień",
      "Wrzesień",
      "Październik",
      "Listopad",
      "Grudzień",
    ],
  },
  ar: {
    day: "اليوم",
    month: "الشهر",
    year: "السنة",
    months: [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ],
  },
};

function labelsFor(locale: string): Labels {
  return LABELS[locale] || LABELS.en;
}

function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

function parseIso(value: string): { day: string; month: string; year: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return { day: "", month: "", year: "" };
  return { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) };
}

function toIso(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
  const maxDay = daysInMonth(y, mo);
  if (d < 1 || d > maxDay || mo < 1 || mo > 12) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function BirthDateSelect({
  value,
  onChange,
  locale,
  invalid = false,
  className,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  locale: string;
  invalid?: boolean;
  className?: string;
}) {
  const labels = labelsFor(locale);
  const parsed = parseIso(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);

  useEffect(() => {
    const next = parseIso(value);
    if (!next.year && !next.month && !next.day) return;
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const list: number[] = [];
    for (let y = now - 16; y >= now - 100; y -= 1) list.push(y);
    return list;
  }, []);

  const maxDay = daysInMonth(Number(year) || 0, Number(month) || 0);
  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay],
  );

  const selectClass = cn(
    "w-full rounded-md border p-2.5 text-sm outline-none transition",
    invalid
      ? "border-2 border-red-500 bg-red-50 ring-2 ring-red-200"
      : "border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
  );

  const commit = (nextDay: string, nextMonth: string, nextYear: string) => {
    let d = nextDay;
    const max = daysInMonth(Number(nextYear) || 0, Number(nextMonth) || 0);
    if (d && Number(d) > max) d = String(max);
    setDay(d);
    setMonth(nextMonth);
    setYear(nextYear);
    onChange(toIso(d, nextMonth, nextYear));
  };

  return (
    <div className={cn("mt-1 grid grid-cols-3 gap-2", className)}>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">{labels.day}</span>
        <select
          className={selectClass}
          value={day}
          aria-label={labels.day}
          onChange={(e) => commit(e.target.value, month, year)}
        >
          <option value="">{labels.day}</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">{labels.month}</span>
        <select
          className={selectClass}
          value={month}
          aria-label={labels.month}
          onChange={(e) => commit(day, e.target.value, year)}
        >
          <option value="">{labels.month}</option>
          {labels.months.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">{labels.year}</span>
        <select
          className={selectClass}
          value={year}
          aria-label={labels.year}
          onChange={(e) => commit(day, month, e.target.value)}
        >
          <option value="">{labels.year}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
