"use client";

import { useState } from "react";
import { formatBookingRef } from "@/lib/ids";
import { toNumber } from "@/lib/utils";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
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
  partnerKind?: "COMPANY" | "PRIVATE";
  countryIso2: string;
  countryLabel: string;
};

const PARTNER_KIND_LABELS = {
  ka: { COMPANY: "კომპანია", PRIVATE: "კერძო" },
  ru: { COMPANY: "Компания", PRIVATE: "Частное лицо" },
  en: { COMPANY: "Company", PRIVATE: "Private" },
} as const;

function PartnerCell({ booking }: { booking: FinancialBookingRow }) {
  const { locale } = useAdminLocale();
  const labels = locale === "ka" ? PARTNER_KIND_LABELS.ka : locale === "ru" ? PARTNER_KIND_LABELS.ru : PARTNER_KIND_LABELS.en;
  const kind = booking.partnerKind;
  return (
    <div>
      <div className="font-medium text-slate-800">{booking.partnerName}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
        {kind ? (
          <span
            className={
              kind === "PRIVATE"
                ? "rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700"
                : "rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700"
            }
          >
            {labels[kind]}
          </span>
        ) : null}
        {booking.partnerCode ? (
          <span className="font-semibold text-sky-700">{booking.partnerCode}</span>
        ) : null}
        {!kind && !booking.partnerCode ? <span className="text-slate-400">—</span> : null}
      </div>
    </div>
  );
}

export function AdminFinancialsBookingsTable({
  bookings,
  cancelled = false,
  countryLabel = "",
  dbOffline = false,
}: {
  bookings: FinancialBookingRow[];
  cancelled?: boolean;
  countryLabel?: string;
  dbOffline?: boolean;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const place = countryLabel ? ` · ${countryLabel}` : "";
  const title = cancelled
    ? phrase("Partner cancelled bookings", "პარტნიორის გაუქმებული ჯავშნები", "Брони, отменённые партнёром")
    : phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони");
  const resolvedSubtitle = cancelled
    ? `${bookings.length} ${phrase("partner-cancelled", "პარტნიორმა გააუქმა", "отменено партнёром")}${place}`
    : `${bookings.length} ${phrase("for financial calculation", "ფინანსური გაანგარიშებისთვის", "для финансового расчёта")}${place}`;
  const emptyMessage = dbOffline
    ? cancelled
      ? phrase(
          "No partner-cancelled bookings in this period. Database is offline.",
          "ამ პერიოდში პარტნიორის გაუქმებული ჯავშანი არ არის. ბაზა მიუწვდომელია.",
          "За этот период нет броней, отменённых партнёром. База недоступна.",
        )
      : phrase(
          "No active bookings in this period. Database is offline.",
          "ამ პერიოდში აქტიური ჯავშანი არ არის. ბაზა მიუწვდომელია.",
          "За этот период нет активных броней. База недоступна.",
        )
    : cancelled
      ? phrase(
          `No partner-cancelled bookings in this period${place}.`,
          `ამ პერიოდში პარტნიორის გაუქმებული ჯავშანი არ არის${place}.`,
          `За этот период нет броней, отменённых партнёром${place}.`,
        )
      : phrase(
          `No active bookings in this period${place}.`,
          `ამ პერიოდში აქტიური ჯავშანი არ არის${place}.`,
          `За этот период нет активных броней${place}.`,
        );
  const colCustomer = phrase("Customer", "მომხმარებელი", "Клиент");
  const colCar = phrase("Car", "მანქანა", "Авто");
  const colPartner = phrase("Partner", "პარტნიორი", "Партнёр");
  const colCountry = phrase("Country", "ქვეყანა", "Страна");
  const colDate = phrase("Date", "თარიღი", "Дата");
  const colTotal = phrase("Total", "ჯამი", "Итого");
  const colPaid = phrase("Paid", "გადახდილი", "Оплачено");
  const colDue = phrase("Due", "დარჩენილი", "К оплате");
  const [open, setOpen] = useState(true);

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
                  <th className="p-4">{colCustomer}</th>
                  <th className="p-4">{colCar}</th>
                  <th className="p-4">{colPartner}</th>
                  <th className="p-4">{colCountry}</th>
                  <th className="p-4">{colDate}</th>
                  <th className="p-4">{colTotal}</th>
                  <th className="p-4">{colPaid}</th>
                  <th className="p-4">{colDue}</th>
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
                        <PartnerCell booking={booking} />
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
                  <MobileDataRow label={colCustomer}>{booking.customerName}</MobileDataRow>
                  <MobileDataRow label={colCar}>{booking.carLabel}</MobileDataRow>
                  <MobileDataRow label={colPartner}>
                    <PartnerCell booking={booking} />
                  </MobileDataRow>
                  <MobileDataRow label={colCountry}>
                    {booking.countryLabel} ({booking.countryIso2})
                  </MobileDataRow>
                  <MobileDataRow label={colDate}>
                    {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                  </MobileDataRow>
                  <MobileDataRow label={colTotal}>
                    <span className="font-semibold text-green-600">
                      <AdminMoneyText amountEur={toNumber(booking.totalPriceEur)} />
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={colPaid}>
                    <span className="font-semibold text-sky-700">
                      <AdminMoneyText amountEur={Number(booking.depositPaidEur) || 0} />
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={colDue}>
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
