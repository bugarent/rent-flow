"use client";

import { CalendarSync } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { CarIcalImport, type CarIcalFeedStatus } from "@/components/partner/integration/car-ical-import";
import { integrationCopy } from "@/components/partner/integration/integration-copy";

export type IcalImportCar = {
  id: string;
  label: string;
  registrationNumber: string;
  feed: CarIcalFeedStatus | null;
};

export function IcalImportCard({ cars, loading }: { cars: IcalImportCar[]; loading: boolean }) {
  const { locale } = usePartnerLocale();
  const t = integrationCopy(locale);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <CalendarSync className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#0b1f4b]">{t.icalTitle}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{t.icalHint}</p>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-slate-500">{t.loading}</p> : null}
      {!loading && cars.length === 0 ? <p className="mt-4 text-sm text-slate-500">{t.empty}</p> : null}

      <ul className="mt-4 space-y-3">
        {cars.map((car) => (
          <li key={car.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="mb-2 break-words text-sm font-bold text-[#0b1f4b]">
              {car.label}
              {car.registrationNumber ? ` · ${car.registrationNumber}` : ""}
            </p>
            <CarIcalImport carId={car.id} initial={car.feed} showLabel={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
