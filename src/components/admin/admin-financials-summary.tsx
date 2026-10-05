"use client";

import { AdminPillTabs } from "@/components/admin/admin-pill-tabs";
import { AdminMoneyText } from "@/components/admin/admin-money-text";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";

export function AdminFinancialsSummary({
  isPartnerCancelled,
  activeHref,
  cancelledHref,
  count,
  from,
  to,
  countryLabel,
  totalDeposit,
  totalBalance,
  totalCommission,
  totalRevenue,
  showDbWarning,
  dbOffline,
  queryError,
}: {
  isPartnerCancelled: boolean;
  activeHref: string;
  cancelledHref: string;
  count: number;
  from: string;
  to: string;
  countryLabel: string;
  totalDeposit: number;
  totalBalance: number;
  totalCommission: number;
  totalRevenue: number;
  showDbWarning: boolean;
  dbOffline: boolean;
  queryError: string;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);

  return (
    <>
      <AdminPillTabs
        tabs={[
          {
            href: activeHref,
            label: phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони"),
            active: !isPartnerCancelled,
          },
          {
            href: cancelledHref,
            label: phrase("Partner cancelled", "პარტნიორმა გააუქმა", "Отменено партнёром"),
            active: isPartnerCancelled,
          },
        ]}
      />

      {showDbWarning ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {dbOffline
              ? phrase(
                  "Database offline — connection refused",
                  "ბაზა მიუწვდომელია — კავშირი უარყოფილია",
                  "База недоступна — соединение отклонено",
                )
              : phrase("Could not load booking data", "ჯავშნების ჩატვირთვა ვერ მოხერხდა", "Не удалось загрузить брони")}
          </p>
          {queryError ? <p className="mt-1 leading-relaxed">{queryError}</p> : null}
          <p className="mt-2 text-xs text-amber-800">
            {phrase(
              "PostgreSQL is not running. Start it, then push the schema.",
              "PostgreSQL არ მუშაობს. გაუშვით და შემდეგ განაახლეთ სქემა.",
              "PostgreSQL не запущен. Запустите его и обновите схему.",
            )}{" "}
            <code className="rounded bg-amber-100 px-1">docker compose up -d</code>
            {", "}
            <code className="rounded bg-amber-100 px-1">npx prisma db push</code>
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">
            {isPartnerCancelled
              ? phrase("Partner cancelled", "პარტნიორმა გააუქმა", "Отменено партнёром")
              : phrase("Active bookings", "აქტიური ჯავშნები", "Активные брони")}
          </h3>
          <p className="mt-2 text-3xl font-extrabold">{count}</p>
          <p className="mt-1 text-xs text-slate-400">
            {from} → {to}
            {countryLabel ? ` · ${countryLabel}` : ""}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">
            {phrase("Paid online (deposit)", "ონლაინ გადახდილი (დეპოზიტი)", "Оплачено онлайн (депозит)")}
          </h3>
          <p className="mt-2 text-3xl font-extrabold text-sky-700">
            <AdminMoneyText amountEur={totalDeposit} />
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">
            {isPartnerCancelled
              ? phrase("Was due at pick-up", "მიღებისას უნდა გადახდილიყო", "Было к оплате при получении")
              : phrase("Due at pick-up", "გადასახდელი მიღებისას", "К оплате при получении")}
          </h3>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">
            <AdminMoneyText amountEur={totalBalance} />
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {isPartnerCancelled
              ? phrase("Est. commission lost", "სავარაუდო დაკარგული საკომისიო", "Ориент. потерянная комиссия")
              : phrase("Est. commission", "სავარაუდო საკომისიო", "Ориент. комиссия")}{" "}
            <AdminMoneyText amountEur={totalCommission} />
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500">
            {isPartnerCancelled
              ? phrase("Cancelled volume", "გაუქმებული მოცულობა", "Отменённый объём")
              : phrase("Gross volume", "საერთო მოცულობა", "Общий объём")}
          </h3>
          <p className="mt-2 text-3xl font-extrabold text-green-600">
            <AdminMoneyText amountEur={totalRevenue} />
          </p>
        </div>
      </div>
    </>
  );
}
