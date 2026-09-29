"use client";

import { useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import type { BusinessPartner, BusinessPartnerAdmin } from "@/lib/catalog/business-partners";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";

type Row = BusinessPartnerAdmin & { referralUrl?: string };

export function BusinessPartnerModerationPanel({
  partners,
  enabledCountries,
  onUpdated,
  hideTitle = false,
}: {
  partners: Row[];
  enabledCountries: string[];
  onUpdated: (partner: BusinessPartner) => void;
  hideTitle?: boolean;
}) {
  const L = useBpLabels();
  const pending = partners.filter((p) => p.status === "PENDING");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [countryById, setCountryById] = useState<Record<string, string>>({});

  const countryOptions =
    enabledCountries.length > 0
      ? WORLD_COUNTRIES.filter((c) => enabledCountries.includes(c.iso2))
      : WORLD_COUNTRIES;

  const patch = async (id: string, status: "ACTIVE" | "REJECTED" | "DISABLED") => {
    setBusyId(id);
    setError("");
    try {
      const countryIso2 = countryById[id] || "";
      const res = await fetch(`/api/admin/business-partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(countryIso2 ? { countryIso2 } : {}),
        }),
      });
      const data = (await res.json()) as { partner?: BusinessPartner; error?: string };
      if (!res.ok || !data.partner) {
        setError(data.error || L.updateFailed);
        return;
      }
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
                className="rounded-lg border border-amber-200 bg-amber-50/60 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{p.fullName}</p>
                    <p className="text-xs text-slate-600">
                      {p.email} · {p.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {p.category}
                      {p.website ? ` · ${p.website}` : ""}
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold text-[#0b1f4b]">
                      {p.referralCode}
                    </p>
                    {p.notes ? (
                      <p className="mt-1 text-xs text-slate-500">{L.note}: {p.notes}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                    PENDING
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
                    {L.country}
                    <select
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800"
                      value={countryById[p.id] || p.countryIso2 || ""}
                      onChange={(e) =>
                        setCountryById((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      disabled={busy}
                    >
                      <option value="">—</option>
                      {countryOptions.map((c) => (
                        <option key={c.iso2} value={c.iso2}>
                          {c.name} ({c.iso2})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch(p.id, "ACTIVE")}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {L.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patch(p.id, "REJECTED")}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {L.reject}
                  </button>
                </div>
                {(countryById[p.id] || p.countryIso2) && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {worldCountryName(countryById[p.id] || p.countryIso2)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
