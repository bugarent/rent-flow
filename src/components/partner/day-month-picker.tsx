"use client";

import { useMemo } from "react";

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const INTL_TAG: Record<string, string> = { ka: "ka-GE", zh: "zh-CN", ko: "ko-KR", th: "th-TH" };

function parse(value: string): { month: number; day: number } {
  const m = /^(?:\d{4}-)?(\d{1,2})-(\d{1,2})/.exec(String(value || ""));
  const month = m ? Math.min(12, Math.max(1, Number(m[1]))) : 1;
  const day = m ? Math.min(MONTH_DAYS[month - 1], Math.max(1, Number(m[2]))) : 1;
  return { month, day };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Day + month only (`MM-DD`); the period repeats every year. */
export function DayMonthPicker({
  value,
  onChange,
  locale,
  label,
}: {
  value: string;
  onChange: (md: string) => void;
  locale: string;
  label: string;
}) {
  const { month, day } = parse(value);
  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(INTL_TAG[locale] || locale || "en", { month: "long" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2024, i, 15))));
  }, [locale]);
  const selectClass =
    "min-h-10 rounded-md border border-[#c5ced8] bg-white px-2 py-2 text-base outline-none focus:border-[#5b4a8a] sm:text-sm";

  return (
    <div className="mt-1 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2" role="group" aria-label={label}>
      <select
        aria-label={`${label} — day`}
        value={day}
        onChange={(e) => onChange(`${pad(month)}-${pad(Number(e.target.value))}`)}
        className={selectClass}
      >
        {Array.from({ length: MONTH_DAYS[month - 1] }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} — month`}
        value={month}
        onChange={(e) => {
          const nextMonth = Number(e.target.value);
          onChange(`${pad(nextMonth)}-${pad(Math.min(day, MONTH_DAYS[nextMonth - 1]))}`);
        }}
        className={selectClass}
      >
        {monthNames.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
