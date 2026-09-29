"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
          From
          <input type="date" className="mt-1 block rounded-xl border p-2" value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          To
          <input type="date" className="mt-1 block rounded-xl border p-2" value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button disabled={loading} className="rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white">
          {loading ? "Loading..." : "Search"}
        </button>
        <p className="text-sm text-slate-500">{stats.totalActive} active bookings in range</p>
      </form>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Car rental statistics</h2>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Example / details</th>
                    <th className="p-3">Active bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categoryStats.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-semibold">{row.name}</td>
                      <td className="p-3 text-slate-500">{row.details}</td>
                      <td className="p-3 font-bold">{row.bookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          mobile={stats.categoryStats.map((row) => (
            <MobileDataCard key={row.id}>
              <MobileDataRow label="Category">{row.name}</MobileDataRow>
              <MobileDataRow label="Example / details">
                <span className="font-medium text-slate-500">{row.details}</span>
              </MobileDataRow>
              <MobileDataRow label="Active bookings">{row.bookings}</MobileDataRow>
            </MobileDataCard>
          ))}
        />
        <h3 className="mb-3 mt-6 font-bold">By model</h3>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Model</th>
                    <th className="p-3">Active bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.modelStats.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-500" colSpan={2}>
                        No active bookings in this date range.
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
                No active bookings in this date range.
              </p>
            ) : (
              stats.modelStats.map((row) => (
                <MobileDataCard key={row.model}>
                  <MobileDataRow label="Model">{row.model}</MobileDataRow>
                  <MobileDataRow label="Active bookings">{row.bookings}</MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Airport statistics</h2>
        <ResponsiveDataList
          desktop={
            <div className="overflow-x-auto rounded-xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3">Airport</th>
                    <th className="p-3">IATA</th>
                    <th className="p-3">Active bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.airportStats.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-500" colSpan={3}>
                        No airport bookings in this date range.
                      </td>
                    </tr>
                  ) : (
                    stats.airportStats.map((row) => (
                      <tr key={row.iata} className="border-t">
                        <td className="p-3 font-semibold">{row.title}</td>
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
                No airport bookings in this date range.
              </p>
            ) : (
              stats.airportStats.map((row) => (
                <MobileDataCard key={row.iata}>
                  <MobileDataRow label="Airport">{row.title}</MobileDataRow>
                  <MobileDataRow label="IATA">{row.iata}</MobileDataRow>
                  <MobileDataRow label="Active bookings">{row.bookings}</MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      </section>
    </div>
  );
}
