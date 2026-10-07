"use client";

import { useCallback, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { ModerationDetailsModal } from "@/components/admin/business-partners/moderation-details-modal";
import type { BusinessPartner, BusinessPartnerAdmin } from "@/lib/catalog/business-partners";

type Row = BusinessPartnerAdmin & { referralUrl?: string };

export function BusinessPartnerModerationPanel({
  partners,
  onUpdated,
  hideTitle = false,
}: {
  partners: Row[];
  /** Kept for API compatibility; country is no longer picked during moderation. */
  enabledCountries?: string[];
  onUpdated: (partner: BusinessPartner) => void;
  hideTitle?: boolean;
}) {
  const L = useBpLabels();
  const pending = partners.filter((p) => p.status === "PENDING");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [detailsId, setDetailsId] = useState("");
  const detailsPartner = pending.find((p) => p.id === detailsId) ?? null;
  const closeDetails = useCallback(() => setDetailsId(""), []);

  const patch = async (id: string, status: "ACTIVE" | "REJECTED" | "DISABLED") => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/business-partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { partner?: BusinessPartner; error?: string };
      if (!res.ok || !data.partner) {
        setError(data.error || L.updateFailed);
        return;
      }
      if (detailsId === id) setDetailsId("");
      onUpdated(data.partner);
    } catch {
      setError(L.updateFailed);
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {hideTitle ? null : (
        <div className="mb-3">
          <h2 className="text-base font-extrabold text-[#0b1f4b]">{L.moderationTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{L.moderationBody}</p>
        </div>
      )}

      {error ? <p className="mb-2 text-sm font-semibold text-rose-600">{error}</p> : null}

      {pending.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          {L.moderationEmpty}
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => {
            const busy = busyId === p.id;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 sm:flex-row sm:items-end sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-bold text-slate-900">{p.fullName}</p>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      PENDING
                    </span>
                  </div>
                  <p className="break-words text-xs text-slate-600">
                    {p.email} · {p.phone}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-600">
                    {p.category}
                    {p.website ? ` · ${p.website}` : ""}
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold text-[#0b1f4b]">{p.referralCode}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailsId(p.id)}
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {L.details}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch(p.id, "ACTIVE")}
                    className="min-h-10 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {L.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch(p.id, "REJECTED")}
                    className="min-h-10 rounded-md bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {L.reject}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detailsPartner ? <ModerationDetailsModal partner={detailsPartner} onClose={closeDetails} /> : null}
    </section>
  );
}
