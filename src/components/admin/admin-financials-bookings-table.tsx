"use client";

import { useState } from "react";
import { formatBookingRef } from "@/lib/ids";
import { toNumber } from "@/lib/utils";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

export type FinancialBookingRow = {
  id: string;
  sequentialNumber: number;
  createdAt: string;
  totalPriceEur: number;
  depositPaidEur: number;
  balanceDueEur: number;
  customerName: string;
  carLabel: string;
  partnerName: string;
  partnerCode: string;
  countryIso2: string;
  countryLabel: string;
};

export function AdminFinancialsBookingsTable({
  bookings,
  emptyMessage,
  title = "Active bookings",
  subtitle,
}: {
  bookings: FinancialBookingRow[];
  emptyMessage: string;
  title?: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(true);
  const resolvedSubtitle =
    subtitle ??
    `${bookings.length} booking${bookings.length === 1 ? "" : "s"} for financial calculation`;

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
      >
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{resolvedSubtitle}</p>
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
                  <th className="p-4">#</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Car</th>
                  <th className="p-4">Partner</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Due</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-600">
                        {formatBookingRef(booking.sequentialNumber) ??
                          `11R${booking.sequentialNumber}`}
                      </td>
                      <td className="p-4">{booking.customerName}</td>
                      <td className="p-4">{booking.carLabel}</td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{booking.partnerName}</div>
                        {booking.partnerCode ? (
                          <span className="mt-0.5 block text-xs font-semibold text-sky-700">
                            {booking.partnerCode}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {booking.countryLabel} ({booking.countryIso2})
                      </td>
                      <td className="p-4">
                        {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-4 font-semibold text-green-600">
                        <AdminMoneyText amountEur={toNumber(booking.totalPriceEur)} />
                      </td>
                      <td className="p-4 font-semibold text-sky-700">
                        <AdminMoneyText amountEur={Number(booking.depositPaidEur) || 0} />
                      </td>
                      <td className="p-4 font-semibold text-amber-700">
                        <AdminMoneyText amountEur={Number(booking.balanceDueEur) || 0} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          }
          mobile={
            bookings.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : (
              bookings.map((booking) => (
                <MobileDataCard key={booking.id}>
                  <MobileDataRow label="#">
                    {formatBookingRef(booking.sequentialNumber) ??
                      `11R${booking.sequentialNumber}`}
                  </MobileDataRow>
                  <MobileDataRow label="Customer">{booking.customerName}</MobileDataRow>
                  <MobileDataRow label="Car">{booking.carLabel}</MobileDataRow>
                  <MobileDataRow label="Partner">
                    <div>
                      <div className="font-medium text-slate-800">{booking.partnerName}</div>
                      {booking.partnerCode ? (
                        <span className="mt-0.5 block text-xs font-semibold text-sky-700">
                          {booking.partnerCode}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </MobileDataRow>
                  <MobileDataRow label="Country">
                    {booking.countryLabel} ({booking.countryIso2})
                  </MobileDataRow>
                  <MobileDataRow label="Date">
                    {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                  </MobileDataRow>
                  <MobileDataRow label="Total">
                    <span className="font-semibold text-green-600">
                      <AdminMoneyText amountEur={toNumber(booking.totalPriceEur)} />
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label="Paid">
                    <span className="font-semibold text-sky-700">
                      <AdminMoneyText amountEur={Number(booking.depositPaidEur) || 0} />
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label="Due">
                    <span className="font-semibold text-amber-700">
                      <AdminMoneyText amountEur={Number(booking.balanceDueEur) || 0} />
                    </span>
                  </MobileDataRow>
                </MobileDataCard>
              ))
            )
          }
        />
      ) : null}
    </section>
  );
}
