"use client";

import { useMemo, useState } from "react";
import { PartnerEurMoneyInput } from "@/components/partner/partner-eur-money-input";
import type { DeliveryCopy } from "@/components/partner/delivery/delivery-copy";
import type { CrossBorderRoute } from "@/lib/delivery/cross-border-routes";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { formatPartnerAmount, partnerCurrencySymbol } from "@/lib/partners/pricing-currency";

export type RoutePlace = {
  id: string;
  countryIso2: string;
  country: string;
  label: string;
};

const selectClass =
  "w-full min-h-11 rounded-md border border-slate-200 bg-white px-2 text-base text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 lg:text-sm";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-bold disabled:opacity-50";

function newRouteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `cbr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function groupsOf(places: RoutePlace[]) {
  const map = new Map<string, { iso: string; name: string; places: RoutePlace[] }>();
  for (const place of places) {
    const iso = place.countryIso2 || "—";
    const group = map.get(iso) ?? { iso, name: place.country || iso, places: [] };
    group.places.push(place);
    map.set(iso, group);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function CrossBorderRoutesEditor({
  places,
  countryCount,
  routes,
  t,
  onSave,
}: {
  places: RoutePlace[];
  countryCount: number;
  routes: CrossBorderRoute[];
  t: DeliveryCopy;
  onSave: (routes: CrossBorderRoute[]) => Promise<boolean>;
}) {
  const { pricingCurrency, fromEur } = usePartnerMoney();
  const [pickupId, setPickupId] = useState("");
  const [returnId, setReturnId] = useState("");
  const [price, setPrice] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const pickupGroups = useMemo(() => groupsOf(places), [places]);
  const pickup = byId.get(pickupId);
  const returnPlaces = useMemo(
    () => (pickup ? places.filter((place) => place.countryIso2 && place.countryIso2 !== pickup.countryIso2) : []),
    [places, pickup],
  );
  const returnGroups = useMemo(() => groupsOf(returnPlaces), [returnPlaces]);

  const reset = () => {
    setEditingId(null);
    setPickupId("");
    setReturnId("");
    setPrice("0");
  };

  const money = (eur: number) =>
    `${partnerCurrencySymbol(pricingCurrency)}${formatPartnerAmount(fromEur(eur))}`;

  const placeName = (id: string) => {
    const place = byId.get(id);
    if (!place) return t.routeMissingPlace;
    return `${place.country} — ${place.label}`;
  };

  const persist = async (next: CrossBorderRoute[]) => {
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) reset();
  };

  const saveDraft = () => {
    if (!pickupId || !returnId || pickupId === returnId) return;
    const priceEur = Math.max(0, Number(price) || 0);
    const withoutSamePair = routes.filter(
      (route) =>
        route.id === editingId ||
        !(route.pickupLocationId === pickupId && route.returnLocationId === returnId),
    );
    const row: CrossBorderRoute = {
      id: editingId || newRouteId(),
      pickupLocationId: pickupId,
      returnLocationId: returnId,
      priceEur,
    };
    const next = editingId
      ? withoutSamePair.map((route) => (route.id === editingId ? row : route))
      : [...withoutSamePair, row];
    void persist(next);
  };

  const edit = (route: CrossBorderRoute) => {
    setEditingId(route.id);
    setPickupId(route.pickupLocationId);
    setReturnId(route.returnLocationId);
    setPrice(String(route.priceEur ?? 0));
  };

  const remove = (id: string) => {
    void persist(routes.filter((route) => route.id !== id));
  };

  if (countryCount < 2) {
    return (
      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t.routeNeedAnotherCountry}
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-slate-500">{t.routeOtherCountries}</p>
      <div className="grid grid-cols-1 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem_auto]">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold text-slate-600">{t.routePickup}</span>
          <select
            className={selectClass}
            value={pickupId}
            onChange={(e) => {
              const next = e.target.value;
              setPickupId(next);
              const chosen = byId.get(next);
              const current = byId.get(returnId);
              if (chosen && current && chosen.countryIso2 === current.countryIso2) setReturnId("");
            }}
          >
            <option value="">{t.routePickPlace}</option>
            {pickupGroups.map((group) => (
              <optgroup key={group.iso} label={group.name}>
                {group.places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold text-slate-600">{t.routeReturn}</span>
          <select
            className={selectClass}
            value={returnId}
            disabled={!pickupId || returnPlaces.length === 0}
            onChange={(e) => setReturnId(e.target.value)}
          >
            <option value="">{returnPlaces.length ? t.routePickPlace : t.routeEmptyReturn}</option>
            {returnGroups.map((group) => (
              <optgroup key={group.iso} label={group.name}>
                {group.places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold text-slate-600">{t.routePrice}</span>
          <div className="w-full [&>div]:w-full">
            <PartnerEurMoneyInput
              eurValue={price}
              onEurChange={setPrice}
              className="min-h-11 w-full rounded-md border border-slate-200 bg-white text-base lg:text-sm"
            />
          </div>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !pickupId || !returnId}
            onClick={saveDraft}
            className={`${buttonClass} bg-[#28a745] text-white hover:bg-[#23923d]`}
          >
            {t.save}
          </button>
          <button
            type="button"
            disabled={busy || !editingId}
            onClick={() => {
              const route = routes.find((item) => item.id === editingId);
              if (route) edit(route);
            }}
            className={`${buttonClass} border border-slate-300 bg-white text-slate-800`}
          >
            {t.routeEdit}
          </button>
          <button
            type="button"
            disabled={busy || !editingId}
            onClick={() => editingId && remove(editingId)}
            className={`${buttonClass} border border-red-200 bg-white text-red-700`}
          >
            {t.routeDelete}
          </button>
        </div>
      </div>

      {routes.length ? (
        <ul className="mt-4 space-y-2">
          {routes.map((route) => (
            <li
              key={route.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="min-w-0 text-sm text-slate-800">
                <span className="font-semibold">{placeName(route.pickupLocationId)}</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="font-semibold">{placeName(route.returnLocationId)}</span>
                <span className="mt-0.5 block font-extrabold text-[#0b1f4b] sm:mt-0 sm:ms-3 sm:inline">
                  {money(route.priceEur)}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => edit(route)}
                  className={`${buttonClass} border border-slate-300 bg-white text-slate-800`}
                >
                  {t.routeEdit}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(route.id)}
                  className={`${buttonClass} border border-red-200 bg-white text-red-700`}
                >
                  {t.routeDelete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
