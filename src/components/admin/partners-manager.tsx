"use client";

import { useEffect, useMemo, useState, Fragment, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { fleetAgeLabel, partnerStatusLabel, PARTNER_SOCIAL_PLATFORMS } from "@/lib/partner";
import type { PartnerApplicationMessage } from "@/lib/partner-application-messages";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { cn } from "@/lib/utils";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { PartnerRowActions } from "@/components/admin/partner-row-actions";
import { ADMIN_BASE } from "@/lib/routes";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type PartnerRow = {
  id: string;
  displayName: string;
  kind: "COMPANY" | "PRIVATE";
  status: string;
  statusLabel?: string;
  sequentialNumber: number | null;
  partnerCode?: string | null;
  personalId?: string;
  fleetSize: number;
  carCount: number;
  email: string;
  phone: string;
  country?: string;
  hasUser?: boolean;
  unreadReapplyCount?: number;
  unreadForAdmin?: number;
  updatedAt?: string;
  source?: "db" | "file";
};

const PRIMARY_STATUSES = new Set([
  "PENDING",
  "INVITED",
  "PENDING_FINAL",
  "NEEDS_CORRECTION",
]);
const PENDING_STATUSES = new Set([
  ...PRIMARY_STATUSES,
  "PENDING_REMODERATION",
]);
const ACTIVE_STATUSES = new Set(["APPROVED", "SUSPENDED"]);

type Filter = "PRIMARY" | "PENDING" | "COMPANY" | "PRIVATE" | "REJECTED" | "DIRECTORY";

function partnerUnread(p: PartnerRow) {
  return Number(p.unreadForAdmin) || Number(p.unreadReapplyCount) || 0;
}

/** Unread messages, or applications still waiting on admin action. */
function partnerAttention(p: PartnerRow) {
  const unread = partnerUnread(p);
  if (unread > 0) return unread;
  if (
    p.status === "PENDING" ||
    p.status === "PENDING_FINAL" ||
    p.status === "NEEDS_CORRECTION" ||
    p.status === "PENDING_REMODERATION"
  ) {
    return 1;
  }
  return 0;
}

function partnersInFilter(list: PartnerRow[], filter: Filter) {
  if (filter === "DIRECTORY") {
    return list.filter((p) => ACTIVE_STATUSES.has(p.status));
  }
  if (filter === "PRIMARY" || filter === "PENDING") {
    return list.filter((p) =>
      filter === "PENDING" ? PENDING_STATUSES.has(p.status) : PRIMARY_STATUSES.has(p.status),
    );
  }
  if (filter === "COMPANY") {
    return list.filter(
      (p) =>
        p.kind === "COMPANY" &&
        (ACTIVE_STATUSES.has(p.status) || p.status === "PENDING_REMODERATION"),
    );
  }
  if (filter === "PRIVATE") {
    return list.filter(
      (p) =>
        p.kind === "PRIVATE" &&
        (ACTIVE_STATUSES.has(p.status) || p.status === "PENDING_REMODERATION"),
    );
  }
  return list.filter((p) => p.status === "REJECTED");
}

/** Total rows in tab + how many need admin attention. */
function tabBadge(list: PartnerRow[]) {
  const pending = list.reduce((sum, p) => sum + partnerAttention(p), 0);
  return { count: list.length, pending };
}

function fleetDisplay(p: { fleetSize: number; carCount: number }) {
  const declared = Number(p.fleetSize) || 0;
  const listed = Number(p.carCount) || 0;
  if (listed > 0 && listed !== declared) {
    return { primary: declared, hint: `${listed} listed` };
  }
  return { primary: declared || listed, hint: null as string | null };
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900 break-words">{value || "—"}</dd>
    </div>
  );
}

function messengerLabels(values: string[]) {
  return values
    .map((value) => PARTNER_SOCIAL_PLATFORMS.find((p) => p.value === value)?.label ?? value)
    .join(", ");
}

function ApplicationSnapshotView({ snapshot }: { snapshot: PartnerApplicationMessage["snapshot"] }) {
  return (
    <dl className="mt-2 space-y-1 text-[11px] text-slate-700">
      <DetailRow label="First name" value={snapshot.firstName} />
      <DetailRow label="Last name" value={snapshot.lastName} />
      <DetailRow label="Email" value={snapshot.email} />
      <DetailRow
        label="Entity type"
        value={snapshot.kind === "PRIVATE" ? "Private representative" : "Company"}
      />
      <DetailRow
        label={
          snapshot.kind === "PRIVATE"
            ? "Personal identification number"
            : "Company tax / identification number"
        }
        value={snapshot.identificationNumber}
      />
      <DetailRow
        label="Primary phone"
        value={`${snapshot.phone}${snapshot.phoneCountryIso2 ? ` (${snapshot.phoneCountryIso2})` : ""}`}
      />
      <DetailRow label="Active messengers" value={messengerLabels(snapshot.messengers) || "—"} />
      <DetailRow label="Fleet size" value={String(snapshot.fleetSize)} />
      <DetailRow label="Fleet average age" value={fleetAgeLabel(snapshot.fleetAgeRange)} />
      <DetailRow
        label="Operating countries"
        value={
          snapshot.countryIso2s.length
            ? snapshot.countryIso2s.map((iso2) => worldCountryName(iso2)).join(", ")
            : "—"
        }
      />
    </dl>
  );
}

type PartnersManagerMode = "directory" | "queue" | "primary" | "catalog";

export function PartnersManager({
  initialPartners,
  mode = "directory",
}: {
  initialPartners: PartnerRow[];
  /** directory = approved/rejected partners; queue = pending applications for moderation */
  mode?: PartnersManagerMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAdminLocale();
  const [filter, setFilter] = useState<Filter>(
    mode === "queue" ? "PENDING" : mode === "primary" ? "PRIMARY" : mode === "catalog" ? "DIRECTORY" : "COMPANY",
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<PartnerApplicationMessage[]>([]);

  const t = useMemo(() => {
    if (locale === "ka") {
      return {
        primary: "პირველადი მოდერაცია",
        company: "კომპანიის პარტნიორები",
        private: "კერძო პარტნიორები",
        rejected: "უარყოფილი მოთხოვნები",
        directory: "დირექტორია",
        pending: "დასამტკიცებელი პარტნიორები",
        idCol: "საიდენტიფიკაციო ნომერი",
        nameCol: "სახელი",
        countryCol: "ქვეყანა",
        typeCol: "ტიპი",
        fleetCol: "ფლოტის ზომა",
        statusCol: "სტატუსი",
        actionsCol: "მოქმედებები",
        companyType: "კომპანია",
        privateType: "კერძო",
        details: "დეტალები",
        close: "დახურვა",
        basicInfo: "ძირითადი ინფორმაცია",
        listedCars: "განცხადებები / მანქანები",
        noCars: "მანქანის განცხადება ჯერ არ არის",
        fleetDeclared: "ფლოტის ზომა (განაცხადი)",
        fleetListed: "ჩამონათვალში",
        empty: "ამ სიაში პარტნიორი არ არის.",
        taxId: "კომპანიის საგადასახადო / საიდენტიფიკაციო ნომერი",
        personalId: "პირადი ნომერი",
        partnerCode: "პარტნიორის კოდი",
      };
    }
    if (locale === "ru") {
      return {
        primary: "Первичная модерация",
        company: "Компании-партнёры",
        private: "Частные партнёры",
        rejected: "Отклонённые заявки",
        directory: "Каталог",
        pending: "Партнёры на одобрение",
        idCol: "Идентификационный номер",
        nameCol: "Имя",
        countryCol: "Страна",
        typeCol: "Тип",
        fleetCol: "Размер флота",
        statusCol: "Статус",
        actionsCol: "Действия",
        companyType: "Компания",
        privateType: "Частное лицо",
        details: "Детали",
        close: "Закрыть",
        basicInfo: "Основная информация",
        listedCars: "Объявления / автомобили",
        noCars: "Объявлений пока нет",
        fleetDeclared: "Размер флота (заявка)",
        fleetListed: "В каталоге",
        empty: "В этом списке нет партнёров.",
        taxId: "Налоговый / идентификационный номер компании",
        personalId: "Личный номер",
        partnerCode: "Код партнёра",
      };
    }
    return {
      primary: "Primary moderation",
      company: "Company partners",
      private: "Private partners",
      rejected: "Rejected requests",
      directory: "Directory",
      pending: "Partners pending approval",
      idCol: "Identification number",
      nameCol: "Name",
      countryCol: "Country",
      typeCol: "Type",
      fleetCol: "Fleet size",
      statusCol: "Status",
      actionsCol: "Actions",
      companyType: "Company",
      privateType: "Private",
      details: "Details",
      close: "Close",
      basicInfo: "Basic information",
      listedCars: "Listings / cars",
      noCars: "No car listings yet",
      fleetDeclared: "Fleet size (application)",
      fleetListed: "Listed",
      empty: "No partners in this list.",
      taxId: "Company tax / identification number",
      personalId: "Personal identification number",
      partnerCode: "Partner code",
    };
  }, [locale]);

  const filterBadges = useMemo(() => {
    const defs: Filter[] =
      mode === "queue"
        ? ["PENDING"]
        : mode === "primary"
          ? ["PRIMARY"]
          : mode === "catalog"
        ? ["DIRECTORY"]
        : ["COMPANY", "PRIVATE", "REJECTED"];
    return Object.fromEntries(
      defs.map((key) => [key, tabBadge(partnersInFilter(initialPartners, key))]),
    ) as Record<Filter, { count: number; pending: number }>;
  }, [initialPartners, mode]);

  const rows = useMemo(() => {
    const filtered = partnersInFilter(initialPartners, filter)
      .slice()
      .sort((a, b) => {
        const ua = partnerAttention(a);
        const ub = partnerAttention(b);
        if (ub !== ua) return ub - ua;
        return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
      });
    return filtered.map((p) => ({
      ...p,
      idNumber: (p.personalId || "").trim() || "—",
      partnerCodeLabel: p.partnerCode ?? (p.sequentialNumber ? `PRT-${p.sequentialNumber}` : null),
      statusLabel: p.statusLabel ?? partnerStatusLabel(p.status),
      fleet: fleetDisplay(p),
    }));
  }, [filter, initialPartners]);

  const reviewHref = (id: string) => {
    const base = `${ADMIN_BASE}/moderation/partners/${encodeURIComponent(id)}`;
    if (mode === "primary") return `${base}?returnTab=primary`;
    if (mode === "catalog" || filter === "DIRECTORY") return `${base}?returnTab=directory`;
    if (mode === "directory" && (filter === "COMPANY" || filter === "PRIVATE")) {
      return `${base}?returnTab=${filter.toLowerCase()}`;
    }
    return base;
  };

  /** Same full review window as Profiles → Open review (AdminPartnerReviewPanel). */
  const openDetail = (id: string) => {
    setMessage("");
    router.push(reviewHref(id));
  };

  useEffect(() => {
    const partnerId = searchParams.get("partner")?.trim();
    if (!partnerId) return;
    router.replace(reviewHref(partnerId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from deep link
  }, [searchParams]);

  useEffect(() => {
    if (mode !== "directory") return;
    const partnerTab = searchParams.get("partnerTab")?.trim().toUpperCase();
    const legacyTab = searchParams.get("tab")?.trim().toLowerCase();
    if (
      partnerTab === "COMPANY" ||
      partnerTab === "PRIVATE" ||
      partnerTab === "REJECTED" ||
      partnerTab === "PENDING"
    ) {
      setFilter(partnerTab as Filter);
      return;
    }
    if (legacyTab === "directory") return;
  }, [mode, searchParams]);

  const selectFilter = (value: Filter) => {
    setFilter(value);
    setExpandedId(null);
    setExpandedMessages([]);
    if (mode !== "directory") return;
    const params = new URLSearchParams(searchParams.toString());
    // Stay on Moderation → Partners (default tab has no `tab` query).
    params.delete("tab");
    if (value === "PRIMARY") params.delete("partnerTab");
    else params.set("partnerTab", value.toLowerCase());
    const qs = params.toString();
    router.replace(qs ? `${ADMIN_BASE}/moderation?${qs}` : `${ADMIN_BASE}/moderation`);
  };
  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedMessages([]);
      return;
    }
    setExpandedId(id);
    const res = await fetch(`/api/admin/partners/${id}`);
    const data = await res.json();
    if (res.ok) {
      setExpandedMessages((data.applicationMessages as PartnerApplicationMessage[]) || []);
      router.refresh();
    } else {
      setExpandedMessages([]);
    }
  };

  const runAction = async (id: string, action: string, extra?: Record<string, unknown>) => {
    setLoadingId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setMessage(data.message || `Status → ${data.status}`);
      const nextStatus = String(data.status || "");
      const kind = (data.partner?.kind || data.kind) as string | undefined;
      if (mode === "directory") {
        if (nextStatus === "APPROVED") {
          setFilter(kind === "PRIVATE" ? "PRIVATE" : "COMPANY");
        } else if (nextStatus === "REJECTED") {
          setFilter("REJECTED");
        }
      } else if (mode === "queue" && PENDING_STATUSES.has(nextStatus)) {
        setFilter("PENDING");
      }
      router.refresh();
      // Open the same review window as Profiles (not the legacy summary modal).
      if (mode === "queue" && nextStatus === "APPROVED") {
        router.replace(`${ADMIN_BASE}/moderation`);
      } else {
        openDetail(id);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoadingId(null);
    }
  };

  const filters: Array<{ value: Filter; label: string }> =
    mode === "queue"
      ? [{ value: "PENDING", label: t.pending }]
      : mode === "primary"
        ? [{ value: "PRIMARY", label: t.primary }]
        : [
            { value: "COMPANY", label: t.company },
            { value: "PRIVATE", label: t.private },
            { value: "REJECTED", label: t.rejected },
          ];

  return (
    <div>
      {message ? (
        <p className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950">
          {message}
        </p>
      ) : null}
      {mode === "directory" || filters.length > 1 ? (
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => {
          const badge = filterBadges[item.value];
          const hasPending = badge.pending > 0;
          const count = badge.count;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                selectFilter(item.value);
              }}
              className={cn(
                "relative rounded-full px-4 py-2 text-sm font-semibold transition",
                filter === item.value && !hasPending && "bg-[#0b1f4b] text-white",
                filter === item.value && hasPending && "bg-amber-400 text-amber-950 ring-2 ring-amber-500",
                filter !== item.value && !hasPending && "border bg-white text-slate-600",
                filter !== item.value &&
                  hasPending &&
                  "border border-amber-400 bg-amber-100 font-extrabold text-amber-950",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold",
                  hasPending
                    ? filter === item.value
                      ? "bg-amber-950 text-white"
                      : "bg-amber-500 text-white"
                    : filter === item.value
                      ? "bg-white/25 text-white"
                      : "bg-slate-200 text-slate-700",
                )}
                title={hasPending ? "Needs attention" : "Items in this list"}
              >
                {count > 99 ? "99+" : count}
              </span>
            </button>
          );
        })}
      </div>
      ) : mode === "queue" ? (
        <div className="mb-4">
          <span className="relative inline-flex rounded-full bg-[#0b1f4b] px-4 py-2 text-sm font-semibold text-white">
            {t.pending}
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-extrabold text-white">
              {filterBadges.PENDING.count > 99 ? "99+" : filterBadges.PENDING.count}
            </span>
          </span>
        </div>
      ) : null}

      {(() => {
        const showCountry = filter === "DIRECTORY";
        const hideId = filter === "DIRECTORY";
        const colCount = 6;
        return (
      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100">
                <tr>
                  {hideId ? null : <th className="whitespace-nowrap px-2 py-1">{t.idCol}</th>}
                  <th className="whitespace-nowrap px-2 py-1">{t.nameCol}</th>
                  {showCountry ? <th className="whitespace-nowrap px-2 py-1">{t.countryCol}</th> : null}
                  <th className="whitespace-nowrap px-2 py-1">{t.typeCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{t.fleetCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{t.statusCol}</th>
                  <th className="whitespace-nowrap px-2 py-1">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="p-6 text-center text-slate-500">
                      {t.empty}
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => {
                    const unread = partnerUnread(p);
                    const attention = partnerAttention(p);
                    const open = expandedId === p.id;
                    return (
                      <Fragment key={p.id}>
                        <tr
                          className={cn(
                            "border-t border-l-4",
                            p.status === "PENDING_REMODERATION"
                              ? "border-l-amber-400 bg-amber-100"
                              : attention > 0
                                ? "border-l-orange-500 bg-orange-100"
                                : "border-l-transparent bg-white",
                          )}
                        >
                          {hideId ? null : (
                          <td
                            className={cn(
                              "whitespace-nowrap px-2 py-0.5 align-middle font-mono font-bold leading-none",
                              attention > 0 ? "text-orange-950" : "",
                            )}
                          >
                            <span>{p.idNumber}</span>
                            {p.partnerCodeLabel ? (
                              mode === "queue" ? (
                                <button
                                  type="button"
                                  onClick={() => openDetail(p.id)}
                                  className="ml-2 text-[10px] font-bold text-emerald-800 hover:underline"
                                >
                                  {p.partnerCodeLabel}
                                </button>
                              ) : (
                                <span className="ml-2 text-[10px] font-semibold text-slate-500">
                                  {p.partnerCodeLabel}
                                </span>
                              )
                            ) : mode === "queue" ? (
                              <button
                                type="button"
                                onClick={() => openDetail(p.id)}
                                className="ml-2 text-[10px] font-bold text-emerald-800 hover:underline"
                              >
                                Open review
                              </button>
                            ) : null}
                          </td>
                          )}
                          <td className="max-w-[16rem] px-2 py-0.5 align-middle leading-none">
                            <button
                              type="button"
                              onClick={() => openDetail(p.id)}
                              className={cn(
                                "font-semibold hover:underline",
                                attention > 0 ? "font-extrabold text-orange-950" : "text-sky-800",
                              )}
                            >
                              {p.displayName}
                            </button>
                            <span
                              className={cn(
                                "ml-2 text-[10px]",
                                attention > 0 ? "font-semibold text-orange-900/80" : "text-slate-500",
                              )}
                            >
                              {p.email}
                            </span>
                            {hideId && p.partnerCodeLabel ? (
                              <span className="ml-2 text-[10px] font-semibold text-slate-500">
                                {p.partnerCodeLabel}
                              </span>
                            ) : null}
                          </td>
                          {showCountry ? (
                            <td className="whitespace-nowrap px-2 py-0.5 align-middle text-slate-700">
                              {p.country || "—"}
                            </td>
                          ) : null}
                          <td className={cn("whitespace-nowrap px-2 py-0.5 align-middle", attention > 0 && "font-semibold text-orange-950")}>
                            {p.kind === "COMPANY" ? t.companyType : t.privateType}
                          </td>
                          <td className={cn("whitespace-nowrap px-2 py-0.5 align-middle", attention > 0 && "font-semibold text-orange-950")}>
                            <span className="font-bold">{p.fleet.primary}</span>
                            {p.fleet.hint ? (
                              <span className="ml-1 text-[10px] font-medium text-slate-500">{p.fleet.hint}</span>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-2 py-0.5 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-semibold leading-4",
                                p.status === "REJECTED"
                                  ? "bg-red-600 text-white"
                                  : p.status === "APPROVED" || p.status === "SUSPENDED"
                                    ? "bg-emerald-600 text-white"
                                    : attention > 0 ||
                                        p.status === "PENDING" ||
                                        p.status === "INVITED" ||
                                        p.status === "PENDING_FINAL" ||
                                        p.status === "NEEDS_CORRECTION" ||
                                        p.status === "PENDING_REMODERATION"
                                      ? "bg-amber-400 text-amber-950"
                                      : "bg-slate-100",
                              )}
                            >
                              {p.status === "REJECTED"
                                ? locale === "ka"
                                  ? "უარყოფილი"
                                  : p.statusLabel
                                : p.statusLabel}
                              {attention > 0 ? (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold text-white">
                                  {attention > 99 ? "99+" : attention}
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-0.5 align-middle">
                            <div className="flex flex-nowrap items-center gap-1">
                              {filter === "REJECTED" || unread > 0 ? (
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-bold",
                                    attention > 0 && "border-orange-400 bg-white text-orange-950",
                                  )}
                                  onClick={() => void toggleExpand(p.id)}
                                >
                                  {open ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                  Messages{unread > 0 ? ` (${unread})` : ""}
                                </button>
                              ) : null}
                              {p.status === "PENDING" ? (
                                <button
                                  type="button"
                                  disabled={loadingId === p.id}
                                  className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white"
                                  onClick={() => runAction(p.id, "INVITE")}
                                >
                                  Approve & invite
                                </button>
                              ) : null}
                              {p.status === "PENDING_FINAL" ||
                              p.status === "NEEDS_CORRECTION" ||
                              p.status === "PENDING_REMODERATION" ? (
                                <button
                                  type="button"
                                  disabled={loadingId === p.id}
                                  className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white"
                                  onClick={() => runAction(p.id, "FINAL_APPROVE")}
                                >
                                  {p.status === "PENDING_REMODERATION"
                                    ? "Approve remoderation"
                                    : "Final approve"}
                                </button>
                              ) : null}
                              <PartnerRowActions
                                compact
                                partnerId={p.id}
                                email={p.email}
                                phone={p.phone}
                                status={p.status}
                                returnTab={
                                  filter === "COMPANY"
                                    ? "company"
                                    : filter === "PRIVATE"
                                      ? "private"
                                      : filter === "REJECTED"
                                        ? "rejected"
                                        : "directory"
                                }
                              />
                            </div>
                          </td>
                        </tr>
                        {open ? (
                          <tr className="border-t bg-slate-50">
                            <td colSpan={6} className="p-4">
                              <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Application history
                                </p>
                                {expandedMessages.length === 0 ? (
                                  <p className="text-sm text-slate-500">No stored messages yet.</p>
                                ) : (
                                  expandedMessages
                                    .slice()
                                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                                    .map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={cn(
                                          "rounded-xl border bg-white p-3 text-sm",
                                          msg.kind === "REAPPLY" && !msg.readByAdmin
                                            ? "border-amber-300 ring-1 ring-amber-200"
                                            : "border-slate-200",
                                        )}
                                      >
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                          <span
                                            className={cn(
                                              "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                                              msg.kind === "REAPPLY"
                                                ? "bg-amber-100 text-amber-900"
                                                : "bg-slate-100 text-slate-700",
                                            )}
                                          >
                                            {msg.kind === "REAPPLY" ? "New request" : "Original"}
                                          </span>
                                          <span className="text-xs text-slate-500">
                                            {new Date(msg.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                        <ApplicationSnapshotView snapshot={msg.snapshot} />
                                      </div>
                                    ))
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          rows.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">
              {t.empty}
            </p>
          ) : (
            rows.map((p) => {
              const unread = partnerUnread(p);
              const attention = partnerAttention(p);
              const open = expandedId === p.id;
              return (
                <MobileDataCard
                  key={p.id}
                  className={cn(
                    "border-l-4",
                    p.status === "PENDING_REMODERATION"
                      ? "border-l-amber-400 bg-amber-50"
                      : attention > 0
                        ? "border-l-orange-500 bg-orange-50"
                        : "border-l-transparent",
                  )}
                >
                  <MobileDataRow label={showCountry ? t.countryCol : t.idCol}>
                    {showCountry ? (
                      <div className="text-end font-semibold text-slate-800">{p.country || "—"}</div>
                    ) : (
                    <div className={cn("text-end font-mono font-bold", attention > 0 && "text-orange-950")}>
                      <div>{p.idNumber}</div>
                      {p.partnerCodeLabel ? (
                        mode === "queue" ? (
                          <button
                            type="button"
                            onClick={() => openDetail(p.id)}
                            className="mt-0.5 block text-[11px] font-bold text-emerald-800 hover:underline"
                          >
                            {p.partnerCodeLabel}
                          </button>
                        ) : (
                          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                            {p.partnerCodeLabel}
                          </p>
                        )
                      ) : mode === "queue" ? (
                        <button
                          type="button"
                          onClick={() => openDetail(p.id)}
                          className="mt-0.5 block text-[11px] font-bold text-emerald-800 hover:underline"
                        >
                          Open review
                        </button>
                      ) : null}
                    </div>
                    )}
                  </MobileDataRow>
                  <MobileDataRow label={t.nameCol}>
                    <div className="text-end">
                      <button
                        type="button"
                        onClick={() => openDetail(p.id)}
                        className={cn(
                          "font-semibold hover:underline",
                          attention > 0 ? "font-extrabold text-orange-950" : "text-sky-800",
                        )}
                      >
                        {p.displayName}
                      </button>
                      <p
                        className={cn(
                          "text-xs",
                          attention > 0 ? "font-semibold text-orange-900/80" : "text-slate-500",
                        )}
                      >
                        {p.email}
                      </p>
                    </div>
                  </MobileDataRow>
                  <MobileDataRow label={t.typeCol}>
                    <span className={cn(attention > 0 && "font-semibold text-orange-950")}>
                      {p.kind === "COMPANY" ? t.companyType : t.privateType}
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={t.fleetCol}>
                    <div className={cn("text-end", attention > 0 && "font-semibold text-orange-950")}>
                      <span className="font-bold">{p.fleet.primary}</span>
                      {p.fleet.hint ? (
                        <p className="text-[11px] font-medium text-slate-500">{p.fleet.hint}</p>
                      ) : null}
                    </div>
                  </MobileDataRow>
                  <MobileDataRow label={t.statusCol}>
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold",
                        p.status === "REJECTED"
                          ? "bg-red-600 text-white"
                          : p.status === "APPROVED" || p.status === "SUSPENDED"
                            ? "bg-emerald-600 text-white"
                            : attention > 0 ||
                                p.status === "PENDING" ||
                                p.status === "INVITED" ||
                                p.status === "PENDING_FINAL" ||
                                p.status === "NEEDS_CORRECTION" ||
                                p.status === "PENDING_REMODERATION"
                              ? "bg-amber-400 text-amber-950"
                              : "bg-slate-100",
                      )}
                    >
                      {p.status === "REJECTED"
                        ? locale === "ka"
                          ? "უარყოფილი"
                          : p.statusLabel
                        : p.statusLabel}
                      {attention > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-extrabold text-white">
                          {attention > 99 ? "99+" : attention}
                        </span>
                      ) : null}
                    </span>
                  </MobileDataRow>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {filter === "REJECTED" || unread > 0 ? (
                      <button
                        type="button"
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-xs font-bold",
                          attention > 0 && "border-orange-400 bg-white text-orange-950",
                        )}
                        onClick={() => void toggleExpand(p.id)}
                      >
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        Messages{unread > 0 ? ` (${unread})` : ""}
                      </button>
                    ) : null}
                    {p.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={loadingId === p.id}
                        className="min-h-11 rounded-lg bg-green-600 px-3 text-xs font-bold text-white"
                        onClick={() => runAction(p.id, "INVITE")}
                      >
                        Approve & invite
                      </button>
                    ) : null}
                    {p.status === "PENDING_FINAL" ||
                    p.status === "NEEDS_CORRECTION" ||
                    p.status === "PENDING_REMODERATION" ? (
                      <button
                        type="button"
                        disabled={loadingId === p.id}
                        className="min-h-11 rounded-lg bg-green-600 px-3 text-xs font-bold text-white"
                        onClick={() => runAction(p.id, "FINAL_APPROVE")}
                      >
                        {p.status === "PENDING_REMODERATION"
                          ? "Approve remoderation"
                          : "Final approve"}
                      </button>
                    ) : null}
                    <div className="w-full [&_button]:min-h-11">
                      <PartnerRowActions
                        partnerId={p.id}
                        email={p.email}
                        phone={p.phone}
                        status={p.status}
                        returnTab={
                          filter === "COMPANY"
                            ? "company"
                            : filter === "PRIVATE"
                              ? "private"
                              : filter === "REJECTED"
                                ? "rejected"
                                : "directory"
                        }
                      />
                    </div>
                  </div>
                  {open ? (
                    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Application history
                      </p>
                      {expandedMessages.length === 0 ? (
                        <p className="text-sm text-slate-500">No stored messages yet.</p>
                      ) : (
                        expandedMessages
                          .slice()
                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                          .map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                "rounded-xl border bg-white p-3 text-sm",
                                msg.kind === "REAPPLY" && !msg.readByAdmin
                                  ? "border-amber-300 ring-1 ring-amber-200"
                                  : "border-slate-200",
                              )}
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                                    msg.kind === "REAPPLY"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-slate-100 text-slate-700",
                                  )}
                                >
                                  {msg.kind === "REAPPLY" ? "New request" : "Original"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <ApplicationSnapshotView snapshot={msg.snapshot} />
                            </div>
                          ))
                      )}
                    </div>
                  ) : null}
                </MobileDataCard>
              );
            })
          )
        }
      />
        );
      })()}
    </div>
  );
}