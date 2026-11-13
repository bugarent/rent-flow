"use client";

import { Plus, X } from "lucide-react";
import type { ExtraServicePricing } from "@/lib/extras/pricing";
import { localizedExtraCopy } from "@/lib/extras/localized-copy";
import type { EquipmentPanelCopy } from "@/components/partner/extras/equipment-panel-copy";

type PickerRow = { service: ExtraServicePricing };

/** Services the partner has not added yet, plus a button to create their own. */
export function ServicePicker({
  id,
  rows,
  locale,
  t,
  priceHint,
  onAdd,
  onCreate,
  onClose,
}: {
  id: string;
  rows: PickerRow[];
  locale: string;
  t: EquipmentPanelCopy;
  priceHint: (service: ExtraServicePricing) => string;
  onAdd: (serviceId: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <section
      id={id}
      className="mb-4 scroll-mt-24 rounded-xl border border-emerald-200 bg-white shadow-sm"
      aria-label={t.inactiveTitle}
    >
      <div className="flex items-start justify-between gap-2 border-b border-emerald-100 bg-[#e8f5e9] px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[#0b1f4b]">{t.inactiveTitle}</h2>
          <p className="mt-0.5 text-xs text-slate-600">{t.inactiveHint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          title={t.close}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/70 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-slate-500">{t.allAdded}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map(({ service }) => {
            const name = localizedExtraCopy(locale, service.name, service.nameI18n);
            const description = service.description
              ? localizedExtraCopy(locale, service.description, service.descriptionI18n)
              : "";
            return (
              <li key={service.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="break-words text-sm font-bold leading-snug text-[#0b1f4b]">{name}</p>
                  {description ? (
                    <p className="line-clamp-2 text-xs text-slate-500" title={description}>
                      {description}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-xs font-semibold text-amber-800/90">{priceHint(service)}</p>
                <button
                  type="button"
                  onClick={() => onAdd(service.id)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#28a745] px-3 text-xs font-bold text-white hover:bg-[#23923d]"
                >
                  <Plus className="h-4 w-4" />
                  {t.addOne}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-slate-100 px-3 py-3">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#1d6fe8] bg-sky-50 px-4 text-sm font-bold text-[#1d6fe8] hover:bg-sky-100 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t.createNew.replace("+ ", "")}
        </button>
      </div>
    </section>
  );
}
