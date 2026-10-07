"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import type { BusinessPartnerAdmin } from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

export function ModerationDetailsModal({
  partner,
  onClose,
}: {
  partner: BusinessPartnerAdmin;
  onClose: () => void;
}) {
  const L = useBpLabels();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const created = (() => {
    const d = new Date(partner.createdAt);
    if (Number.isNaN(d.getTime())) return partner.createdAt;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const isBank = partner.payoutMethod !== "PAYPAL";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={L.applicantDetails}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{L.applicantDetails}</p>
            <h3 className="break-words text-base font-extrabold text-[#0b1f4b]">{partner.fullName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={L.close}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <dl className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto px-4 py-3 sm:grid-cols-2">
          <Row label={L.name} value={partner.fullName} />
          <Row label={L.email} value={partner.email} />
          <Row label={L.phone} value={partner.phone} />
          <Row label={L.messengers} value={partner.messengers.join(", ")} />
          <Row label={L.category} value={partner.category} />
          <Row label={L.website} value={partner.website} />
          <Row label={L.personalId} value={partner.personalId} mono />
          <Row label={L.referralCode} value={partner.referralCode} mono />
          <Row
            label={L.payoutMethod}
            value={isBank ? L.bankTransfer : "PayPal"}
          />
          {isBank ? (
            <>
              <Row label={L.iban} value={partner.payoutAccount} mono />
              <Row label={L.swift} value={partner.payoutSwift} mono />
            </>
          ) : (
            <Row label="PayPal" value={partner.paypalAccount} />
          )}
          {partner.countryIso2 ? (
            <Row label={L.country} value={worldCountryName(partner.countryIso2)} />
          ) : null}
          <Row label={L.created} value={created} />
          {partner.notes ? (
            <div className="sm:col-span-2">
              <Row label={L.note} value={partner.notes} />
            </div>
          ) : null}
        </dl>

        <div className="border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            {L.close}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
