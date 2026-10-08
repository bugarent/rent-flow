"use client";

import type { ExtraServicePricing } from "@/lib/extras/pricing";
import {
  clampPartnerDailyPrice,
  isMandatoryExtra,
  isMandatoryFreeExtra,
  isMandatoryPricedExtra,
} from "@/lib/extras/pricing";
import { findCarExtraOffer, type CarExtraOffer } from "@/lib/cars/car-details";
import { formatAmountNumber } from "@/lib/utils";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { localizedExtraCopy } from "@/lib/extras/localized-copy";

export type PartnerExtraSelection = {
  extraServiceId: string;
  enabled: boolean;
  forbidden?: boolean;
  priceEur: string;
};

export function buildExtraSelections(
  catalog: ExtraServicePricing[],
  existing?: Array<{ extraServiceId: string; priceEur: number; forbidden?: boolean }>,
): PartnerExtraSelection[] {
  const byId = new Map((existing ?? []).map((e) => [e.extraServiceId, e]));
  return catalog.map((service) => {
    const current = byId.get(service.id);
    if (isMandatoryFreeExtra(service)) {
      return {
        extraServiceId: service.id,
        enabled: true,
        forbidden: false,
        priceEur: "0",
      };
    }
    if (isMandatoryPricedExtra(service)) {
      return {
        extraServiceId: service.id,
        enabled: true,
        forbidden: false,
        priceEur: String(
          clampPartnerDailyPrice(service.minPriceEur, service.maxPriceEur, current?.priceEur ?? 0),
        ),
      };
    }
    if (current?.forbidden) {
      return {
        extraServiceId: service.id,
        enabled: true,
        forbidden: true,
        priceEur: "0",
      };
    }
    if (service.mode === "toggle") {
      return {
        extraServiceId: service.id,
        enabled: Boolean(current),
        forbidden: false,
        priceEur: "0",
      };
    }
    const price =
      current?.priceEur ??
      service.defaultPriceEur ??
      service.minPriceEur ??
      0;
    return {
      extraServiceId: service.id,
      enabled: true,
      forbidden: false,
      priceEur: String(price),
    };
  });
}

export type CarFormExtraPref = {
  service?: { id?: string; slug?: string };
  enabled?: boolean;
  forbidden?: boolean;
  priceEur?: number;
};

/** Cabinet rows matched by id or slug. An empty list is not a trusted "everything off". */
export function indexExtraPrefs(items: CarFormExtraPref[]) {
  const byId = new Map<string, CarFormExtraPref>();
  const bySlug = new Map<string, CarFormExtraPref>();
  for (const item of items) {
    const id = String(item.service?.id || "").trim();
    const slug = String(item.service?.slug || "").trim();
    if (id) byId.set(id, item);
    if (slug) bySlug.set(slug, item);
  }
  return {
    trusted: items.length > 0,
    forService(service: { id: string; slug?: string }) {
      return byId.get(service.id) || (service.slug ? bySlug.get(service.slug) : undefined);
    },
  };
}

export function catalogIdsForCarExtras(
  catalog: ExtraServicePricing[],
  rows: Array<{ extraServiceId?: string; extraService?: { id?: string; slug?: string } | null }>,
): Set<string> {
  const bySlug = new Map(catalog.filter((service) => service.slug).map((service) => [service.slug, service.id]));
  const ids = new Set<string>();
  for (const row of rows) {
    const id = String(row.extraServiceId || row.extraService?.id || "").trim();
    const slug = String(row.extraService?.slug || "").trim();
    if (id && catalog.some((service) => service.id === id)) ids.add(id);
    else if (slug && bySlug.has(slug)) ids.add(String(bySlug.get(slug)));
  }
  return ids;
}

export function catalogIdsForOffers(catalog: ExtraServicePricing[], offers: CarExtraOffer[]): Set<string> {
  const ids = new Set<string>();
  for (const service of catalog) {
    if (findCarExtraOffer(offers, service)) ids.add(service.id);
  }
  return ids;
}

/**
 * Services that stay on the car form.
 * A failed prefs response keeps the list already on screen instead of collapsing it.
 */
export function extrasVisibleOnCarForm(
  catalog: ExtraServicePricing[],
  opts: {
    prefs: CarFormExtraPref[];
    fallback?: ExtraServicePricing[];
    carExtraIds?: Set<string>;
    offerIds?: Set<string>;
  },
): ExtraServicePricing[] {
  const prefs = indexExtraPrefs(opts.prefs);
  const fallbackIds = new Set((opts.fallback || []).map((service) => service.id));
  const fallbackSlugs = new Set(
    (opts.fallback || []).map((service) => service.slug).filter(Boolean),
  );
  return catalog.filter((service) => {
    if (isMandatoryExtra(service)) return true;
    const pref = prefs.forService(service);
    // Cabinet choice wins: off stays off the car form even if this car used the service before.
    if (prefs.trusted && pref) return Boolean(pref.enabled || pref.forbidden);
    if (prefs.trusted) return false;
    if (opts.carExtraIds?.has(service.id)) return true;
    if (opts.offerIds?.has(service.id)) return true;
    return fallbackIds.has(service.id) || (service.slug ? fallbackSlugs.has(service.slug) : false);
  });
}

export function PartnerExtrasFields({
  catalog,
  value,
  onChange,
  currencySymbol = "€",
  formatEurAmount,
}: {
  catalog: ExtraServicePricing[];
  value: PartnerExtraSelection[];
  onChange: (next: PartnerExtraSelection[]) => void;
  currencySymbol?: string;
  /** Format an EUR catalog limit for display in partner currency. */
  formatEurAmount?: (amountEur: number) => string;
}) {
  const { locale } = usePartnerLocale();
  const text = (value: string) => knownText(locale, value);
  const labelAmount = (n: number) =>
    formatEurAmount ? formatEurAmount(n) : `${formatAmountNumber(n)}${currencySymbol}`;

  const update = (id: string, patch: Partial<PartnerExtraSelection>) => {
    const service = catalog.find((s) => s.id === id);
    // Mandatory free extras cannot be disabled or repriced
    if (service && isMandatoryFreeExtra(service)) {
      onChange(
        value.map((row) =>
          row.extraServiceId === id
            ? { ...row, enabled: true, forbidden: false, priceEur: "0" }
            : row,
        ),
      );
      return;
    }
    onChange(
      value.map((row) => {
        if (row.extraServiceId !== id) return row;
        const next = { ...row, ...patch };
        if (patch.forbidden === true) {
          next.forbidden = true;
          next.enabled = true;
          next.priceEur = "0";
        }
        if (patch.enabled === true) next.forbidden = false;
        return next;
      }),
    );
  };

  if (catalog.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
        No extra services are configured by admin yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Additional services (daily / 24h)</p>
      <p className="text-xs text-slate-500">
        Mandatory services stay locked on at {currencySymbol}0 and must remain active — customers see them as free.
        Ranged extras are capped to the admin maximum. Empty min/max extras can be toggled on or off.
      </p>
      <ul className="space-y-3">
        {catalog.map((service) => {
          const row = value.find((v) => v.extraServiceId === service.id);
          if (!row) return null;

          if (isMandatoryFreeExtra(service)) {
            return (
              <li key={service.id} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{localizedExtraCopy(locale, service.name, service.nameI18n)}</p>
                    {service.description ? (
                      <p className="text-xs text-slate-600">{localizedExtraCopy(locale, service.description, service.descriptionI18n)}</p>
                    ) : null}
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      Mandatory — must stay active. Locked at {currencySymbol}0/day; shown free to customers.
                    </p>
                  </div>
                  <label className="flex cursor-not-allowed items-center gap-2 text-sm font-semibold text-emerald-900 opacity-80">
                    <span>Active · Mandatory</span>
                    <input type="checkbox" className="h-5 w-5" checked disabled readOnly />
                  </label>
                </div>
                <p className="mt-2 text-sm font-bold text-emerald-900">{currencySymbol}0 / day</p>
              </li>
            );
          }

          if (service.mode === "toggle") {
            return (
              <li
                key={service.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{localizedExtraCopy(locale, service.name, service.nameI18n)}</p>
                  {service.description ? (
                    <p className="text-xs text-slate-500">{localizedExtraCopy(locale, service.description, service.descriptionI18n)}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">Toggle-only (no price limits)</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-slate-600">{row.enabled ? "On" : "Off"}</span>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={row.enabled}
                    onChange={(e) => update(service.id, { enabled: e.target.checked })}
                  />
                </label>
              </li>
            );
          }

          return (
            <li key={service.id} className="rounded-xl border bg-white px-4 py-3">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{localizedExtraCopy(locale, service.name, service.nameI18n)}</p>
                  {service.description ? (
                    <p className="text-xs text-slate-500">{localizedExtraCopy(locale, service.description, service.descriptionI18n)}</p>
                  ) : null}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Allowed {labelAmount(service.minPriceEur ?? 0)} – {labelAmount(service.maxPriceEur ?? 0)}/day
                </p>
              </div>
              <label className="block text-sm font-semibold">
                Your daily price {currencySymbol}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full rounded-lg border p-2.5 font-normal"
                  value={row.priceEur}
                  onChange={(e) => update(service.id, { priceEur: e.target.value })}
                  onBlur={() => {
                    const max = service.maxPriceEur ?? 0;
                    const min = service.minPriceEur ?? 0;
                    let n = Number(row.priceEur);
                    if (!Number.isFinite(n)) n = 0;
                    // Cap against EUR limits after converting partner input when formatEurAmount is used
                    // (limits stay EUR; partner types in working currency — parent converts on save).
                    // Soft clamp in partner units only when no FX helpers — keep simple numeric clamp in EUR space:
                    if (!formatEurAmount) {
                      if (n > max) n = max;
                      if (n < min) n = min;
                      update(service.id, { priceEur: String(n) });
                    }
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
