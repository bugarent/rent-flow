"use client";

import { cn } from "@/lib/utils";
import { partnerPhoneSlots, phonePickKey } from "@/lib/partners/partner-phones";

export function PartnerPhoneChecks({
  partnerId,
  phone,
  secondaryPhone,
  picked,
  onToggle,
  align = "start",
}: {
  partnerId: string;
  phone: string;
  secondaryPhone?: string | null;
  picked: Set<string>;
  onToggle: (key: string) => void;
  align?: "start" | "end";
}) {
  const entries = partnerPhoneSlots(phone, secondaryPhone);
  if (!entries.length) return <span className="text-slate-400">—</span>;
  return (
    <div className={cn("flex flex-col gap-0.5", align === "end" && "items-end")}>
      {entries.map((entry) => {
        const key = phonePickKey(partnerId, entry.slot);
        return (
          <label
            key={entry.slot}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2"
          >
            <input
              type="checkbox"
              checked={picked.has(key)}
              onChange={() => onToggle(key)}
              aria-label={entry.phone}
              className="h-4 w-4 shrink-0 accent-[#0b1f4b]"
            />
            <span className="font-mono text-xs text-slate-800">{entry.phone}</span>
          </label>
        );
      })}
    </div>
  );
}
