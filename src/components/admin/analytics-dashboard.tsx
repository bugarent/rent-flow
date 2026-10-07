"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { uiText } from "@/lib/i18n/ui-text";
import { DateInput } from "@/components/ui/date-input";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type Stats = {
  totalActive: number;
  categoryStats: Array<{ id: string; name: string; details: string; bookings: number }>;
  modelStats: Array<{ model: string; bookings: number }>;
  airportStats: Array<{ title: string; iata: string; bookings: number }>;
};

export function AnalyticsDashboard({
  initial,
  initialFrom,
  initialTo,
  basePath,
  preserveParams,
}: {
  initial: Stats;
  initialFrom: string;
  initialTo: string;
  basePath?: string;
  preserveParams?: Record<string, string>;
}) {
  const router = useRouter();
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const record = (value: string) => knownText(locale, value);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [stats, setStats] = useState(initial);
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (preserveParams) {
      for (const [key, value] of Object.entries(preserveParams)) {
        if (value) params.set(key, value);
      }
    }
    const res = await fetch(`/api/admin/analytics?${params.toString()}`);
    setStats(await res.json());
    const qs = params.toString();
    router.replace(basePath ? `${basePath}?${qs}` : `?${qs}`);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={search} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4">
        <label className="text-sm font-semibold">
          {phrase("From", "დან", "С")}
          <DateInput type="date" className="mt-1 block rounded-xl border p-2" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          {phrase("To", "მდე", "По")}
          <DateInput type="date" className="mt-1 block rounded-xl border p-2" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button disabled={loading} className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white">
          {loading ? phrase("Loading...", "იტვირთება...", "Загрузка...") : phrase("Search", "ძებნა", "Поиск")}
        </button>
        <p className="text-sm text-slate-500">
          {stats.totalActive} {phrase("active bookings in range", "აქტიური ჯავშანი პერიოდში", "активных броней за период")}
        </p>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">{phrase("Car rental statistics", "ქირაობის სტატისტიკა", "Статистика аренды")}</h2>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">{phrase("Category", "კატეგორია", "Категория")}</th>
                    <th className="p-3">{phrase("Example / details", "მაგალითი / დეტალები", "Пример / детали")}</th>
                    <th className="p-3">{phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categoryStats.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-semibold">{record(row.name)}</td>
                      <td className="p-3 text-slate-500">{record(row.details)}</td>
                      <td className="p-3 font-bold">{row.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          mobile={stats.categoryStats.map((row) => (
            <MobileDataCard key={row.id}>
              <MobileDataRow label={phrase("Category", "კატეგორია", "Категория")}>{record(row.name)}</MobileDataRow>
              <MobileDataRow label={phrase("Example / details", "მაგალითი / დეტალები", "Пример / детали")}>
                <span className="font-medium text-slate-500">{record(row.details)}</span>
              </MobileDataRow>
              <MobileDataRow label={phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}>{row.bookings}</MobileDataRow>
            </MobileDataCard>
          ))}
        />
        <h3 className="mb-3 mt-6 font-bold">{phrase("By model", "მოდელის მიხედვით", "По модели")}</h3>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">{phrase("Model", "მოდელი", "Модель")}</th>
                    <th className="p-3">{phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.modelStats.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-500" colSpan={2}>
                        {phrase("No active bookings in this date range.", "ამ პერიოდში აქტიური ჯავშანი არ არის.", "За этот период активных броней нет.")}
                      </td>
                    </tr>
                  ) : (
                    stats.modelStats.map((row) => (
                      <tr key={row.model} className="border-t">
                        <td className="p-3 font-semibold">{row.model}</td>
                        <td className="p-3 font-bold">{row.bookings}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          }
          mobile={
            stats.modelStats.length === 0 ? (
              <p className="rounded-xl border bg-white p-3 text-sm text-slate-500">
                {phrase("No active bookings in this date range.", "ამ პერიოდში აქტიური ჯავშანი არ არის.", "За этот период активных броней нет.")}
              </p>
            ) : (
              stats.modelStats.map((row) => (
                <MobileDataCard key={row.model}>
                  <MobileDataRow label={phrase("Model", "მოდელი", "Модель")}>{row.model}</MobileDataRow>
                  <MobileDataRow label={phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}>{row.bookings}</MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">{phrase("Airport statistics", "აეროპორტის სტატისტიკა", "Статистика аэропортов")}</h2>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">{phrase("Airport", "აეროპორტი", "Аэропорт")}</th>
                    <th className="p-3">IATA</th>
                    <th className="p-3">{phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.airportStats.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-500" colSpan={3}>
                        {phrase("No airport bookings in this date range.", "ამ პერიოდში აეროპორტის ჯავშანი არ არის.", "За этот период броней в аэропортах нет.")}
                      </td>
                    </tr>
                  ) : (
                    stats.airportStats.map((row) => (
                      <tr key={row.iata} className="border-t">
                        <td className="p-3 font-semibold">{record(row.title)}</td>
                        <td className="p-3">{row.iata}</td>
                        <td className="p-3 font-bold">{row.bookings}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          }
          mobile={
            stats.airportStats.length === 0 ? (
              <p className="rounded-xl border bg-white p-3 text-sm text-slate-500">
                {phrase("No airport bookings in this date range.", "ამ პერიოდში აეროპორტის ჯავშანი არ არის.", "За этот период броней в аэропортах нет.")}
              </p>
            ) : (
              stats.airportStats.map((row) => (
                <MobileDataCard key={row.iata}>
                  <MobileDataRow label={phrase("Airport", "აეროპორტი", "Аэропорт")}>{record(row.title)}</MobileDataRow>
                  <MobileDataRow label="IATA">{row.iata}</MobileDataRow>
                  <MobileDataRow label={phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}>{row.bookings}</MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      </section>
    </div>
  );
}
