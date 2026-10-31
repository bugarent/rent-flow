"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ADMIN_BASE } from "@/lib/routes";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { cn } from "@/lib/utils";
import { ModerationListingCard } from "@/components/admin/moderation-listing-card";
import type { ModerationCarView, ModerationPartnerRow } from "@/components/admin/moderation-hub";

type PartnerGroup = {
  key: string;
  partnerId: string;
  name: string;
  email: string;
  code: string;
  phone: string;
  cars: ModerationCarView[];
};

/** Pending listings grouped per partner; each group starts collapsed and shows how many cars wait. */
export function ModerationListingsByPartner({
  cars,
  partners,
  openUserLabel,
  openPersonalInfoLabel,
  onCarDone,
}: {
  cars: ModerationCarView[];
  partners: ModerationPartnerRow[];
  openUserLabel: string;
  openPersonalInfoLabel: string;
  onCarDone: (carId: string) => void;
}) {
  const { locale } = useAdminLocale();
  const L = useBpLabels();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const t = {
    waiting: uiText(locale, "awaiting moderation", "მოდერაციის მოლოდინში", "ждут модерации"),
    cars: uiText(locale, "cars", "მანქანა", "авто"),
    show: uiText(locale, "Show cars", "მანქანების ნახვა", "Показать авто"),
    hide: uiText(locale, "Hide", "დამალვა", "Скрыть"),
  };

  const groups = useMemo<PartnerGroup[]>(() => {
    const partnerById = new Map(partners.map((p) => [p.id, p]));
    const byKey = new Map<string, PartnerGroup>();
    for (const car of cars) {
      const key = car.partnerId || `email:${car.partnerEmail || car.partnerName}`;
      let group = byKey.get(key);
      if (!group) {
        const partner = car.partnerId ? partnerById.get(car.partnerId) : undefined;
        group = {
          key,
          partnerId: car.partnerId,
          name: partner?.displayName || car.partnerName || "—",
          email: car.partnerEmail || partner?.email || "",
          code: partner?.partnerCode || "",
          phone: partner?.phone || "",
          cars: [],
        };
        byKey.set(key, group);
      }
      group.cars.push(car);
    }
    return [...byKey.values()];
  }, [cars, partners]);

  const toggle = (key: string) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const open = openKeys.includes(group.key);
        const fresh = group.cars.filter((c) => c.status === "PENDING").length;
        const updates = group.cars.filter((c) => c.status === "PENDING_REMODERATION").length;
        const panelId = `moderation-partner-${group.key}`;
        return (
          <section
            key={group.key}
            className="overflow-hidden rounded-xl border-2 border-amber-300 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-base font-extrabold text-[#0b1f4b]">{group.name}</h3>
                  {group.code ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-700">
                      {group.code}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  {group.partnerId ? (
                    <Link
                      href={`${ADMIN_BASE}/moderation/partners/${encodeURIComponent(group.partnerId)}?returnTab=listings`}
                      className="break-all font-bold text-[#1d6fe8] hover:underline"
                      aria-label={`${openPersonalInfoLabel}: ${group.email || group.name}`}
                    >
                      {group.email || openUserLabel}
                    </Link>
                  ) : group.email ? (
                    <span className="break-all">{group.email}</span>
                  ) : null}
                  {group.phone && group.phone !== "—" ? <span>{group.phone}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-white">
                    {group.cars.length} {t.cars} · {t.waiting}
                  </span>
                  {fresh > 0 ? (
                    <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                      {L.newListing}: {fresh}
                    </span>
                  ) : null}
                  {updates > 0 ? (
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-950">
                      {L.correction}: {updates}
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn(
                  "inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold sm:w-auto",
                  open ? "bg-slate-100 text-[#0b1f4b] hover:bg-slate-200" : "bg-[#0b1f4b] text-white hover:bg-[#16336e]",
                )}
              >
                {open ? t.hide : `${t.show} (${group.cars.length})`}
                <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
              </button>
            </div>
            {open ? (
              <div id={panelId} className="space-y-3 border-t border-amber-200 bg-amber-50/40 p-3 sm:p-4">
                {group.cars.map((car) => (
                  <ModerationListingCard
                    key={car.id}
                    car={car}
                    showPartner={false}
                    openUserLabel={openUserLabel}
                    openPersonalInfoLabel={openPersonalInfoLabel}
                    onDone={() => onCarDone(car.id)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
