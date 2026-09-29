"use client";

import { useState } from "react";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { normalizeDeliveryPrice } from "@/lib/delivery/pricing";
import { formatAmountNumber } from "@/lib/utils";

export type PartnerDeliverySelection = {
  deliveryLocationId: string;
  enabled: boolean;
  priceEur: string;
  freeAfterDays?: string;
  travelTimeMinutes?: string;
};

export type DeliveryCapNotice = {
  label: string;
  requested: number;
  max: number;
  saved: number;
};

export function buildDeliverySelections(
  catalog: DeliveryLocationView[],
  existing?: Array<{
    deliveryLocationId: string;
    priceEur: number;
    freeAfterDays?: number | null;
    travelTimeMinutes?: number | null;
  }>,
): PartnerDeliverySelection[] {
  const byId = new Map((existing ?? []).map((e) => [e.deliveryLocationId, e]));
  return catalog.map((loc) => {
    const current = byId.get(loc.id);
    return {
      deliveryLocationId: loc.id,
      enabled: Boolean(current),
      priceEur: current ? String(current.priceEur) : "",
      freeAfterDays: current?.freeAfterDays != null ? String(current.freeAfterDays) : "0",
      travelTimeMinutes: current?.travelTimeMinutes != null ? String(current.travelTimeMinutes) : "0",
    };
  });
}

export function PartnerDeliveryFields({
  catalog,
  value,
  onChange,
  currencySymbol = "€",
  formatEurAmount,
  toEur,
  fromEur,
}: {
  catalog: DeliveryLocationView[];
  value: PartnerDeliverySelection[];
  onChange: (next: PartnerDeliverySelection[]) => void;
  currencySymbol?: string;
  /** Format an EUR admin/cap amount for display in partner currency. */
  formatEurAmount?: (amountEur: number) => string;
  /** Convert partner-entered amount → EUR before capping. */
  toEur?: (amount: string | number) => number;
  /** Convert capped EUR amount back to partner currency for the input. */
  fromEur?: (amountEur: number) => number;
}) {
  const [notice, setNotice] = useState<DeliveryCapNotice | null>(null);
  const labelAmount = (n: number) =>
    formatEurAmount ? formatEurAmount(n) : `${formatAmountNumber(n)}${currencySymbol}`;

  const update = (id: string, patch: Partial<PartnerDeliverySelection>) => {
    onChange(value.map((row) => (row.deliveryLocationId === id ? { ...row, ...patch } : row)));
  };

  const applyCap = (loc: DeliveryLocationView, rawPrice: string, enabled: boolean) => {
    if (!enabled) return;
    const requestedPartner = Number(rawPrice);
    if (!Number.isFinite(requestedPartner)) {
      update(loc.id, { priceEur: "0" });
      return;
    }
    const requestedEur = toEur ? toEur(requestedPartner) : requestedPartner;
    const { priceEur, capped } = normalizeDeliveryPrice(loc.maxDeliveryPriceEur, requestedEur);
    const displaySaved = fromEur ? fromEur(priceEur) : priceEur;
    if (capped) {
      update(loc.id, { priceEur: String(displaySaved) });
      setNotice({
        label: loc.label,
        requested: requestedEur,
        max: loc.maxDeliveryPriceEur,
        saved: priceEur,
      });
    } else if (String(displaySaved) !== rawPrice) {
      update(loc.id, { priceEur: String(displaySaved) });
    }
  };

  if (catalog.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-amber-800">
        No operating airports are linked to your partner profile yet. Ask admin to approve your
        countries/airports, then return here to enable Delivery.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        Airport association &amp; Delivery <span className="text-red-500">*</span>
      </p>
      <p className="text-xs text-slate-500">
        Your listing is limited to airports approved on your partner account. Check{" "}
        <strong>Delivery</strong> for each airport where you can deliver or drop off this vehicle
        (at least one required). Set your one-way fee ({currencySymbol}); amounts above the admin maximum are
        capped.
      </p>

      {notice ? (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Delivery price adjusted</h3>
            <p className="mt-3 text-sm text-slate-700">
              The maximum reasonable delivery price for <strong>{notice.label}</strong> is set by the admin at{" "}
              <strong>{labelAmount(notice.max)}</strong>. Your entered price of {labelAmount(notice.requested)} was
              automatically adjusted to <strong>{labelAmount(notice.saved)}</strong> and will be saved accordingly.
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-xl bg-sky-600 py-2.5 font-bold text-white"
              onClick={() => setNotice(null)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {catalog.map((loc) => {
          const row = value.find((v) => v.deliveryLocationId === loc.id);
          if (!row) return null;
          const maxPartner = fromEur ? fromEur(loc.maxDeliveryPriceEur) : loc.maxDeliveryPriceEur;
          return (
            <li key={loc.id} className="rounded-xl border bg-white px-4 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{loc.label}</p>
                  <p className="text-xs text-slate-500">
                    {loc.country} · Admin max {labelAmount(loc.maxDeliveryPriceEur)}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <span className={row.enabled ? "text-emerald-700" : "text-slate-500"}>Delivery</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={row.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      update(loc.id, {
                        enabled,
                        priceEur: enabled && !row.priceEur ? "0" : row.priceEur,
                      });
                    }}
                  />
                </label>
              </div>
              {row.enabled ? (
                <label className="block text-sm font-semibold">
                  Your delivery price {currencySymbol}
                  <input
                    type="number"
                    min={0}
                    max={maxPartner}
                    step="0.01"
                    className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                    value={row.priceEur}
                    onChange={(e) => update(loc.id, { priceEur: e.target.value })}
                    onBlur={(e) => applyCap(loc, e.target.value, row.enabled)}
                  />
                </label>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
