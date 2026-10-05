"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { PartnerRowActions } from "@/components/admin/partner-row-actions";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type Tab = "partners" | "customers";

type DirectoryCountry = { iso2: string; name: string; count: number };

type PartnerRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: string;
  country: string;
  countryIso2s: string[];
  countries: Array<{ iso2: string; name: string }>;
  activeCars: number;
  fleetSize: number;
};

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  country: string;
  countryIso2: string;
  email: string;
  phone: string;
  status: string;
};

export function DirectoryDashboard({
  seedPartners = [],
}: {
  seedPartners?: Array<{
    id: string;
    displayName: string;
    kind: string;
    status: string;
    sequentialNumber: number | null;
    partnerCode: string | null;
    email: string;
    phone: string;
    carCount: number;
    fleetSize: number;
  }>;
}) {
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);
  const [tab, setTab] = useState<Tab>("partners");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [countries, setCountries] = useState<DirectoryCountry[]>([]);
  const [partnerRows, setPartnerRows] = useState<PartnerRow[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);

  const seedKey = useMemo(
    () =>
      seedPartners
        .map((p) => `${p.id}:${p.status}:${p.carCount}`)
        .sort()
        .join("|"),
    [seedPartners],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ tab });
    if (country) params.set("country", country);
    fetch(`/api/admin/directory?${params}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || phrase("Could not load directory", "დირექტორიის ჩატვირთვა ვერ მოხერხდა", "Не удалось загрузить каталог"));
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        const apiRows = Array.isArray(data.rows) ? data.rows : [];
        setTotal(Number(data.total) || apiRows.length || 0);
        setCountries(Array.isArray(data.countries) ? data.countries : []);
        if (tab === "partners") {
          if (apiRows.length === 0 && seedPartners.length) {
            const active = seedPartners.filter(
              (p) => p.status === "APPROVED" || p.status === "SUSPENDED",
            );
            setPartnerRows(
              active.map((p) => ({
                id: p.id,
                code: p.partnerCode ?? (p.sequentialNumber != null ? `PRT-${p.sequentialNumber}` : "—"),
                name: p.displayName,
                kind: p.kind,
                companyName: p.displayName,
                contactName: p.displayName,
                email: p.email,
                phone: p.phone,
                status: p.status,
                country: "—",
                countryIso2s: [],
                countries: [],
                activeCars: p.carCount || 0,
                fleetSize: p.fleetSize,
              })),
            );
            setTotal(active.length);
          } else {
            setPartnerRows(apiRows);
          }
        } else {
          setCustomerRows(apiRows);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (tab === "partners" && seedPartners.length) {
          const active = seedPartners.filter(
            (p) => p.status === "APPROVED" || p.status === "SUSPENDED",
          );
          const rows = active.map((p) => ({
            id: p.id,
            code: p.partnerCode ?? (p.sequentialNumber != null ? `PRT-${p.sequentialNumber}` : "—"),
            name: p.displayName,
            kind: p.kind,
            companyName: p.displayName,
            contactName: p.displayName,
            email: p.email,
            phone: p.phone,
            status: p.status,
            country: "—",
            countryIso2s: [] as string[],
            countries: [] as Array<{ iso2: string; name: string }>,
            activeCars: p.carCount || 0,
            fleetSize: p.fleetSize,
          }));
          setPartnerRows(rows);
          setTotal(rows.length);
          setCountries([]);
          setError("");
          return;
        }
        setError(phrase("Could not load directory", "დირექტორიის ჩატვირთვა ვერ მოხერხდა", "Не удалось загрузить каталог"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, country, seedKey]);

  const countryOptions = useMemo(() => {
    const seen = new Set(countries.map((c) => c.iso2));
    const extras = WORLD_COUNTRIES.filter((c) => !seen.has(c.iso2)).map((c) => ({
      iso2: c.iso2,
      name: c.name,
      count: 0,
    }));
    return [...countries, ...extras].sort((a, b) => a.name.localeCompare(b.name));
  }, [countries]);

  const selectedCountryName = country
    ? worldCountryName(country)
    : phrase("all countries", "ყველა ქვეყანა", "все страны");
  const selectedCount = country
    ? (countries.find((c) => c.iso2 === country)?.count ?? total)
    : total;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
        {(["partners", "customers"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
              tab === value ? "bg-[#0b1f4b] text-white" : "border bg-white text-slate-600"
            }`}
          >
            {value === "partners" ? phrase("Partners", "პარტნიორები", "Партнёры") : phrase("Customers", "მომხმარებლები", "Клиенты")}
          </button>
        ))}
        <label className="text-sm font-semibold text-slate-700">
          {phrase("Country", "ქვეყანა", "Страна")}
          <select
            className="mt-1 block w-full rounded-xl border bg-white p-2.5 font-normal"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">{phrase("All countries", "ყველა ქვეყანა", "Все страны")}</option>
            {countryOptions.map((c) => (
              <option key={c.iso2} value={c.iso2}>
                {c.name} {c.count ? `(${c.count})` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border bg-white px-4 py-2.5 text-sm">
          <p className="text-slate-500">
            {tab === "partners" ? phrase("Active partners", "აქტიური პარტნიორები", "Активные партнёры") : phrase("Customers", "მომხმარებლები", "Клиенты")}
          </p>
          <p className="text-xl font-extrabold text-[#0b1f4b]">{loading ? "…" : selectedCount}</p>
          <p className="text-xs text-slate-500">{selectedCountryName}</p>
        </div>
      </div>

      {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">{tab === "partners" ? phrase("Company / partner", "კომპანია / პარტნიორი", "Компания / партнёр") : phrase("Customer name", "მომხმარებლის სახელი", "Имя клиента")}</th>
                  <th className="p-3">{phrase("Country", "ქვეყანა", "Страна")}</th>
                  {tab === "partners" ? <th className="p-3">{phrase("Active cars", "აქტიური მანქანები", "Активные авто")}</th> : <th className="p-3">{phrase("Status", "სტატუსი", "Статус")}</th>}
                  {tab === "partners" ? <th className="p-3 text-right">{phrase("Actions", "მოქმედებები", "Действия")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tab === "partners" ? 5 : 4} className="p-8 text-center text-slate-500">
                      {phrase("Loading…", "იტვირთება…", "Загрузка…")}
                    </td>
                  </tr>
                ) : tab === "partners" ? (
                  partnerRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        {phrase("No partners found for this filter.", "ამ ფილტრით პარტნიორი ვერ მოიძებნა.", "По этому фильтру партнёры не найдены.")}
                      </td>
                    </tr>
                  ) : (
                    partnerRows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-sky-50/60">
                        <td className="p-3 font-mono font-bold text-[#0b1f4b]">{row.code}</td>
                        <td className="p-3 font-semibold text-sky-800">{row.name}</td>
                        <td className="p-3">{row.country}</td>
                        <td className="p-3">{row.activeCars}</td>
                        <td className="p-3">
                          <PartnerRowActions
                            partnerId={row.id}
                            email={row.email}
                            phone={row.phone}
                            status={row.status}
                            returnTab="directory"
                          />
                        </td>
                      </tr>
                    ))
                  )
                ) : customerRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      {phrase("No customers found for this filter.", "ამ ფილტრით მომხმარებელი ვერ მოიძებნა.", "По этому фильтру клиенты не найдены.")}
                    </td>
                  </tr>
                ) : (
                  customerRows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-mono font-bold text-[#0b1f4b]">{row.code}</td>
                      <td className="p-3 font-semibold">{row.name}</td>
                      <td className="p-3">{row.country}</td>
                      <td className="p-3">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          loading ? (
            <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              {phrase("Loading…", "იტვირთება…", "Загрузка…")}
            </p>
          ) : tab === "partners" ? (
            partnerRows.length === 0 ? (
              <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
                {phrase("No partners found for this filter.", "ამ ფილტრით პარტნიორი ვერ მოიძებნა.", "По этому фильтру партнёры не найдены.")}
              </p>
            ) : (
              partnerRows.map((row) => (
                <MobileDataCard key={row.id}>
                  <MobileDataRow label="ID">
                    <span className="font-mono font-bold text-[#0b1f4b]">{row.code}</span>
                  </MobileDataRow>
                  <MobileDataRow label={phrase("Company / partner", "კომპანია / პარტნიორი", "Компания / партнёр")}>
                    <span className="font-semibold text-sky-800">{row.name}</span>
                  </MobileDataRow>
                  <MobileDataRow label={phrase("Country", "ქვეყანა", "Страна")}>{row.country}</MobileDataRow>
                  <MobileDataRow label={phrase("Active cars", "აქტიური მანქანები", "Активные авто")}>{row.activeCars}</MobileDataRow>
                  <div className="mt-3 border-t border-slate-100 pt-3 [&_button]:min-h-11">
                    <PartnerRowActions
                      partnerId={row.id}
                      email={row.email}
                      phone={row.phone}
                      status={row.status}
                      returnTab="directory"
                    />
                  </div>
                </MobileDataCard>
              ))
            )
          ) : customerRows.length === 0 ? (
            <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              {phrase("No customers found for this filter.", "ამ ფილტრით მომხმარებელი ვერ მოიძებნა.", "По этому фильтру клиенты не найдены.")}
            </p>
          ) : (
            customerRows.map((row) => (
              <MobileDataCard key={row.id}>
                <MobileDataRow label="ID">
                  <span className="font-mono font-bold text-[#0b1f4b]">{row.code}</span>
                </MobileDataRow>
                <MobileDataRow label={phrase("Customer name", "მომხმარებლის სახელი", "Имя клиента")}>{row.name}</MobileDataRow>
                <MobileDataRow label={phrase("Country", "ქვეყანა", "Страна")}>{row.country}</MobileDataRow>
                <MobileDataRow label={phrase("Status", "სტატუსი", "Статус")}>{row.status}</MobileDataRow>
              </MobileDataCard>
            ))
          )
        }
      />
    </div>
  );
}
