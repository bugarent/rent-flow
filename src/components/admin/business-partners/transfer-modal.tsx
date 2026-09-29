"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { cn } from "@/lib/utils";

export type TransferModalPartner = {
  id: string;
  fullName: string;
  email: string;
  payoutMethod?: "BANK" | "PAYPAL" | string;
  paypalAccount?: string;
  payoutAccount?: string;
  payoutSwift?: string;
  earnedUsd?: number;
  paidUsd?: number;
};

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function unpaid(p: TransferModalPartner) {
  return Math.max(0, (Number(p.earnedUsd) || 0) - (Number(p.paidUsd) || 0));
}

/** Official PayPal Send Money deep link with recipient email + amount. */
export function buildPaypalTransferUrl(recipientEmail: string, amountUsd: number, _note?: string) {
  const params = new URLSearchParams({
    recipient: recipientEmail.trim(),
    amount: Number.isFinite(amountUsd) ? amountUsd.toFixed(2) : String(amountUsd),
    currencyCode: "USD",
  });
  return `https://www.paypal.com/myaccount/transfer/send/details?${params.toString()}`;
}

export function BusinessPartnerTransferModal({
  partner,
  onClose,
  onPartnerUpdated,
}: {
  partner: TransferModalPartner;
  onClose: () => void;
  onPartnerUpdated?: (partner: TransferModalPartner) => void;
}) {
  const L = useBpLabels();
  const due = unpaid(partner);
  const [amountText, setAmountText] = useState(due > 0 ? String(due) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [mounted, setMounted] = useState(false);
  const [current, setCurrent] = useState(partner);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(partner);
    const nextDue = unpaid(partner);
    setAmountText(nextDue > 0 ? String(nextDue) : "");
    setError("");
    setOk("");
  }, [partner]);

  const paypalEmail = String(current.paypalAccount || "").trim();
  const isPaypal = normalizeMethod(current.payoutMethod) === "PAYPAL" || Boolean(paypalEmail);
  const amount = Number(String(amountText).replace(",", ".")) || 0;

  const openPayPalTransfer = () => {
    setError("");
    if (!paypalEmail) {
      setError(L.paypalMissing);
      return;
    }
    if (amount <= 0 || amount > unpaid(current) + 0.0001) {
      setError(`${L.amountRange} ${money(unpaid(current))}`);
      return;
    }
    const url = buildPaypalTransferUrl(paypalEmail, amount);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const confirmLedger = async () => {
    const balance = unpaid(current);
    if (amount <= 0 || amount > balance) {
      setError(`${L.amountRange} ${money(balance)}`);
      return;
    }
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await fetch(`/api/admin/business-partners/${current.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amount,
          note: isPaypal ? `PayPal → ${paypalEmail}` : "Bank transfer",
        }),
      });
      const data = (await res.json()) as {
        partner?: TransferModalPartner;
        error?: string;
      };
      if (!res.ok || !data.partner) {
        setError(data.error || L.transferFailed);
        return;
      }
      onPartnerUpdated?.(data.partner);
      setCurrent({ ...current, ...data.partner });
      setOk(`${L.transferredOk} ${money(amount)}`);
      setAmountText(String(unpaid(data.partner) || ""));
    } catch {
      setError(L.transferFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      id="transferModal"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transferModalTitle"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 id="transferModalTitle" className="text-lg font-extrabold text-[#0b1f4b]">
            {L.transferTitle}
          </h3>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm text-slate-700">
            {L.partner}:{" "}
            <span className="font-bold text-[#0b1f4b]">{current.fullName}</span>
          </p>

          {isPaypal || paypalEmail ? (
            <p className="text-sm text-slate-700">
              {L.partnerPaypal}{" "}
              <strong className="break-all text-[#0b1f4b]">
                {paypalEmail || "—"}
              </strong>
            </p>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p>
                IBAN:{" "}
                <span className="font-mono font-bold">
                  {current.payoutAccount || "—"}
                </span>
              </p>
              <p className="mt-1">
                SWIFT:{" "}
                <span className="font-mono font-bold">
                  {current.payoutSwift || "—"}
                </span>
              </p>
            </div>
          )}

          <p className="text-sm text-slate-600">
            {L.balanceDue}{" "}
            <span className="font-bold text-amber-700">{money(unpaid(current))}</span>
          </p>

          <label className="block text-sm font-semibold text-slate-700">
            {L.amountLabel}
            <input
              id="transferAmount"
              type="number"
              step="0.01"
              min="0"
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value);
                setError("");
                setOk("");
              }}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-800"
            />
          </label>

          {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
          {ok ? <p className="text-sm font-semibold text-emerald-600">{ok}</p> : null}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              disabled={!paypalEmail || unpaid(current) <= 0}
              onClick={openPayPalTransfer}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
                paypalEmail
                  ? "bg-[#0070ba] hover:bg-[#005ea6]"
                  : "cursor-not-allowed bg-slate-300",
              )}
            >
              {L.paypalSend}
            </button>
            <button
              type="button"
              disabled={busy || unpaid(current) <= 0}
              onClick={() => void confirmLedger()}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? L.working : L.confirmLedger}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {L.close}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function normalizeMethod(raw?: string) {
  return String(raw || "").toUpperCase() === "PAYPAL" ? "PAYPAL" : "BANK";
}
