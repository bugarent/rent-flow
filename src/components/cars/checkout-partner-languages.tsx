import { Languages } from "lucide-react";
import { LOCALE_LABELS, isLocale } from "@/lib/i18n/config";

export function CheckoutPartnerLanguages({ label, codes }: { label: string; codes?: string[] }) {
  const list = (codes || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="w-full rounded border border-sky-200 bg-sky-50 px-2.5 py-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold text-sky-900 sm:text-xs">
        <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      <ul className="mt-1 flex flex-wrap gap-1">
        {list.map((code) => (
          <li
            key={code}
            className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 ring-1 ring-sky-200"
          >
            {isLocale(code) ? LOCALE_LABELS[code] : code.toUpperCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
