"use client";

import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { CountryFlag } from "@/components/ui/country-flag";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { PARTNER_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Copy = {
  deliveryCountries: string;
  deliveryHelp: string;
  selectCountry: string;
  pendingSave: string;
  pendingRemove: string;
};

/** Operating countries only — airports and cities are picked per country on the Delivery page. */
export function PartnerOperatingCountriesField({
  committed,
  pendingAdds,
  pendingRemoves,
  options,
  dirty,
  notice,
  errorText,
  invalid,
  highlighted,
  readOnly,
  selectClassName,
  copy,
  deliveryLinkLabel,
  saveLabel,
  removeLabel,
  cancelLabel,
  onAdd,
  onRemove,
  onCancelRemove,
  onSave,
}: {
  committed: string[];
  pendingAdds: string[];
  pendingRemoves: string[];
  options: Array<{ iso2: string; name: string }>;
  dirty: boolean;
  notice: string;
  errorText: string;
  invalid: boolean;
  highlighted: boolean;
  readOnly?: boolean;
  selectClassName: string;
  copy: Copy;
  deliveryLinkLabel: string;
  saveLabel: string;
  removeLabel: string;
  cancelLabel: string;
  onAdd: (iso2: string) => void;
  onRemove: (iso2: string) => void;
  onCancelRemove: (iso2: string) => void;
  onSave: () => void;
}) {
  const visible = committed.filter((iso) => !pendingRemoves.includes(iso));

  return (
    <div>
      <p
        className={cn(
          "mb-1.5 text-sm font-semibold",
          invalid || highlighted ? "text-red-700" : "text-[#3a4553]",
        )}
      >
        {copy.deliveryCountries} <span className="text-[#e11d48]">*</span>
      </p>
      <p className="mb-2 text-xs text-slate-500">
        {copy.deliveryHelp}{" "}
        <Link href={`${PARTNER_BASE}/delivery`} className="font-semibold text-[#1d6fe8] hover:underline">
          {deliveryLinkLabel}
        </Link>
      </p>

      {readOnly ? null : (
        <div className={cn(invalid && "rounded-lg border border-red-500 bg-red-50 p-2")}>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={cn(selectClassName, "min-w-0 flex-1 sm:min-w-[200px]")}
              value=""
              onChange={(e) => {
                onAdd(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">{copy.selectCountry}</option>
              {options
                .filter((c) => !visible.includes(c.iso2) && !pendingAdds.includes(c.iso2))
                .map((c) => (
                  <option key={c.iso2} value={c.iso2}>
                    {c.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!dirty}
              onClick={onSave}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-[#28a745] px-3 py-2.5 text-xs font-bold text-white disabled:opacity-45"
            >
              <Check className="h-3.5 w-3.5" /> {saveLabel}
            </button>
          </div>
        </div>
      )}

      {notice ? <p className="mt-1.5 text-xs font-semibold text-slate-700">{notice}</p> : null}
      {errorText ? <p className="mt-1.5 text-xs font-semibold text-red-700">{errorText}</p> : null}

      <ul className="mt-3 space-y-2">
        {visible.map((iso2) => (
          <li
            key={iso2}
            className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
              <CountryFlag iso2={iso2} />
              <span className="truncate">{worldCountryName(iso2)}</span>
              <span className="text-xs font-medium text-slate-400">({iso2})</span>
            </span>
            {readOnly ? null : (
              <button
                type="button"
                className="inline-flex min-h-10 shrink-0 items-center gap-1 text-xs font-semibold text-red-700"
                onClick={() => onRemove(iso2)}
              >
                <Trash2 className="h-3.5 w-3.5" /> {removeLabel}
              </button>
            )}
          </li>
        ))}
        {pendingAdds.map((iso2) => (
          <li
            key={`pending-${iso2}`}
            className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-dashed border-emerald-300 bg-emerald-50/70 px-3 py-2"
          >
            <span className="inline-flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-emerald-900">
              <CountryFlag iso2={iso2} />
              <span className="truncate">{worldCountryName(iso2)}</span>
              <span className="text-xs font-medium text-emerald-700/80">{copy.pendingSave}</span>
            </span>
            <button
              type="button"
              className="min-h-10 shrink-0 text-xs font-semibold text-red-700"
              onClick={() => onRemove(iso2)}
            >
              {cancelLabel}
            </button>
          </li>
        ))}
        {pendingRemoves.map((iso2) => (
          <li
            key={`remove-${iso2}`}
            className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-dashed border-red-200 bg-red-50/60 px-3 py-2 opacity-80"
          >
            <span className="inline-flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-red-900 line-through">
              <CountryFlag iso2={iso2} />
              <span className="truncate">{worldCountryName(iso2)}</span>
              <span className="text-xs font-medium no-underline">{copy.pendingRemove}</span>
            </span>
            <button
              type="button"
              className="min-h-10 shrink-0 text-xs font-semibold text-slate-700"
              onClick={() => onCancelRemove(iso2)}
            >
              {cancelLabel}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
