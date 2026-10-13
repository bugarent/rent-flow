"use client";

import type { PartnerBroadcastResult } from "@/lib/partners/broadcast-types";
import type { AutoChannelRow } from "@/components/admin/partner-broadcast/partner-auto-channels";
import type { PartnerBroadcastCopy } from "@/components/admin/partner-broadcast/partner-broadcast-copy";

export function PartnerBroadcastResults({
  results,
  rows,
  copy,
}: {
  results: PartnerBroadcastResult[];
  rows: AutoChannelRow[];
  copy: PartnerBroadcastCopy;
}) {
  const summary = (["telegram", "email", "sms"] as const)
    .filter((key) => results.some((r) => r[key] !== undefined))
    .map((key) => ({
      key,
      label: rows.find((row) => row.key === key)?.label ?? key,
      sent: results.filter((r) => r[key] === true).length,
      total: results.filter((r) => r[key] !== undefined).length,
    }));
  const unreached = results.filter((r) => !r.telegram && !r.email && !r.sms).map((r) => r.name);

  return (
    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
      <p className="font-extrabold">{copy.doneTitle}</p>
      {summary.map((row) => (
        <p key={row.key}>
          {copy.sentOf
            .replace("{channel}", row.label)
            .replace("{sent}", String(row.sent))
            .replace("{total}", String(row.total))}
        </p>
      ))}
      {unreached.length ? (
        <p className="text-amber-900">
          <span className="font-bold">{copy.failedFor}</span> {unreached.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
