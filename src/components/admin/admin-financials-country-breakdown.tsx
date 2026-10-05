"use client";

import { useState } from "react";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

export type CountryFinanceRow = {
  iso2: string;
  label: string;
  bookings: number;
  revenue: number;
  deposit: number;
  balance: number;
};

export function AdminFinancialsCountryBreakdown({
  rows,
  linkBase,
  from,
  to,
  cancelled = false,
}: {
  rows: CountryFinanceRow[];
  linkBase: string;
  from: string;
  to: string;
  cancelled?: boolean;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const title = cancelled
    ? phrase("Partner cancelled by country", "პარტნიორის გაუქმება ქვეყნების მიხედვით", "Отмены партнёра по странам")
    : phrase("Breakdown by partner country", "პარტნიორის ქვეყნების მიხედვით", "По странам партнёров");
  const subtitle = cancelled
    ? phrase(
        "Sorted by highest cancelled volume. Partner-cancelled bookings only.",
        "დალაგებულია გაუქმებული მოცულობის მიხედვით. მხოლოდ პარტნიორის გაუქმებული ჯავშნები.",
        "По убыванию отменённого объёма. Только брони, отменённые партнёром.",
      )
    : phrase(
        "Sorted by highest gross volume. Same totals as above, split by partner country.",
        "დალაგებულია საერთო მოცულობის მიხედვით. იგივე ჯამები, დაყოფილი პარტნიორის ქვეყნით.",
        "По убыванию общего объёма. Те же итоги, разбитые по стране партнёра.",
      );
  const colCountry = phrase("Country", "ქვეყანა", "Страна");
  const colBookings = cancelled
    ? phrase("Cancelled bookings", "გაუქმებული ჯავშნები", "Отменённые брони")
    : phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони");
  const colPaid = phrase("Paid online", "ონლაინ გადახდილი", "Оплачено онлайн");
  const colDue = phrase("Due at pick-up", "გადასახდელი მიღებისას", "К оплате при получении");
  const colGross = phrase("Gross volume", "საერთო მოცულობა", "Общий объём");
  const [open, setOpen] = useState(true);

  if (rows.length === 0) return null;

  return (
    <section className="mb-8 overflow-hidden rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span
          className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open ? (
        <ResponsiveDataList
          desktop={
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-100">
                  <th className="p-4">{colCountry}</th>
                  <th className="p-4">{colBookings}</th>
                  <th className="p-4">{colPaid}</th>
                  <th className="p-4">{colDue}</th>
                  <th className="p-4">{colGross}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.iso2} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-semibold text-[#0b1f4b]">
                      <a
                        className="text-sky-700 hover:underline"
                        href={`${linkBase}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&country=${encodeURIComponent(row.iso2)}`}
                      >
                        {row.label} ({row.iso2})
                      </a>
                    </td>
                    <td className="p-4">{row.bookings}</td>
                    <td className="p-4 font-semibold text-sky-700">
                      <AdminMoneyText amountEur={row.deposit} />
                    </td>
                    <td className="p-4 font-semibold text-amber-700">
                      <AdminMoneyText amountEur={row.balance} />
                    </td>
                    <td className="p-4 font-semibold text-green-600">
                      <AdminMoneyText amountEur={row.revenue} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={rows.map((row) => (
            <MobileDataCard key={row.iso2}>
              <MobileDataRow label={colCountry}>
                <a
                  className="text-sky-700 hover:underline"
                  href={`${linkBase}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&country=${encodeURIComponent(row.iso2)}`}
                >
                  {row.label} ({row.iso2})
                </a>
              </MobileDataRow>
              <MobileDataRow label={colBookings}>{row.bookings}</MobileDataRow>
              <MobileDataRow label={colPaid}>
                <span className="font-semibold text-sky-700">
                  <AdminMoneyText amountEur={row.deposit} />
                </span>
              </MobileDataRow>
              <MobileDataRow label={colDue}>
                <span className="font-semibold text-amber-700">
                  <AdminMoneyText amountEur={row.balance} />
                </span>
              </MobileDataRow>
              <MobileDataRow label={colGross}>
                <span className="font-semibold text-green-600">
                  <AdminMoneyText amountEur={row.revenue} />
                </span>
              </MobileDataRow>
            </MobileDataCard>
          ))}
        />
      ) : null}
    </section>
  );
}
