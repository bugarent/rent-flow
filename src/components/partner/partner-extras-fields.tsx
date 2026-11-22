"use client";

import type { ExtraServicePricing } from "@/lib/extras/pricing";
import {
  clampPartnerDailyPrice,
  isMandatoryFreeExtra,
  isMandatoryPricedExtra,
} from "@/lib/extras/pricing";
import { findCarExtraOffer, type CarExtraOffer } from "@/lib/cars/car-details";
import { isCrossBorderExtra } from "@/lib/extras/cross-border";
import { isListingInsuranceService } from "@/lib/extras/checkout-slot";
import { partnerStatusLocked } from "@/lib/extras/partner-service-choice";
import {
  partnerExtraHiddenOnListing,
  partnerExtraOfferedOnListing,
  partnerExtraPrefAppliesToCar,
} from "@/lib/extras/partner-extra-pref";
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
    if (isMandatoryFreeExtra(service) && partnerStatusLocked(service)) {
      return {
        extraServiceId: service.id,
        enabled: true,
        forbidden: false,
        priceEur: "0",
      };
    }
    if (service.partnerCanToggleTpl) {
      return {
        extraServiceId: service.id,
        enabled: current ? !current.forbidden : true,
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
  /** On the partner's own service list (Equipment & services page). */
  added?: boolean;
  enabled?: boolean;
  forbidden?: boolean;
  priceEur?: number;
  /** Cars this cabinet row applies to; omitted = all. */
  carIds?: string[];
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

/** Default per-listing state for a new car, taken from the partner's cabinet choices. Prices stay in EUR. */
export function selectionsFromCabinet(
  catalog: ExtraServicePricing[],
  prefItems: CarFormExtraPref[],
): PartnerExtraSelection[] {
  const prefs = indexExtraPrefs(prefItems);
  const existingPrices = catalog.map((service) => {
    const pref = prefs.forService(service);
    const price = pref?.forbidden
      ? 0
      : pref?.priceEur != null
        ? Number(pref.priceEur)
        : Number(service.defaultPriceEur ?? service.minPriceEur ?? 0);
    return { extraServiceId: service.id, priceEur: price, forbidden: Boolean(pref?.forbidden) };
  });
  return buildExtraSelections(catalog, existingPrices).map((row) => {
    const service = catalog.find((item) => item.id === row.extraServiceId);
    const pref = service ? prefs.forService(service) : undefined;
    const mandatory = service ? partnerStatusLocked(service) : false;
    const insurance = service ? isListingInsuranceService(service) : false;
    let enabled = row.enabled;
    let forbidden = Boolean(row.forbidden);
    if (!mandatory && pref?.forbidden) {
      enabled = true;
      forbidden = true;
    } else if (!mandatory && pref && pref.enabled === false) {
      enabled = false;
      forbidden = false;
    } else if (!mandatory && !pref && insurance) {
      enabled = true;
      forbidden = false;
    }
    return {
      ...row,
      enabled,
      forbidden,
      priceEur: forbidden || !enabled ? "0" : row.priceEur,
    };
  });
}

export type ListingCabinetExtra = {
  extraServiceId: string;
  slug?: string;
  added?: boolean;
  enabled?: boolean;
  forbidden?: boolean;
  priceEur?: number;
  carIds?: string[];
};

/** Cabinet rows sent with the car. A missing list is not "everything off". */
export function readCabinetExtras(value: unknown): ListingCabinetExtra[] {
  if (!Array.isArray(value)) return [];
  const rows: ListingCabinetExtra[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const item = row as {
      extraServiceId?: unknown;
      slug?: unknown;
      added?: unknown;
      enabled?: unknown;
      forbidden?: unknown;
      priceEur?: unknown;
      carIds?: unknown;
    };
    const extraServiceId = String(item.extraServiceId || "").trim();
    if (!extraServiceId) continue;
    const price = Number(item.priceEur);
    const carIds = Array.isArray(item.carIds)
      ? item.carIds.map((id) => String(id || "").trim()).filter(Boolean)
      : undefined;
    rows.push({
      extraServiceId,
      slug: String(item.slug || "").trim(),
      ...(typeof item.added === "boolean" ? { added: item.added } : {}),
      enabled: item.enabled !== false,
      forbidden: Boolean(item.forbidden),
      ...(Number.isFinite(price) ? { priceEur: price } : {}),
      ...(carIds ? { carIds } : {}),
    });
  }
  return rows;
}

/** Same shape the car form already uses for `/api/partners/extras-prefs` items. */
export function cabinetRowsToPrefs(value: unknown): CarFormExtraPref[] {
  return readCabinetExtras(value).map((row) => ({
    service: { id: row.extraServiceId, slug: row.slug },
    ...(typeof row.added === "boolean" ? { added: row.added } : {}),
    enabled: row.enabled,
    forbidden: row.forbidden,
    ...(row.priceEur != null ? { priceEur: row.priceEur } : {}),
    ...(row.carIds ? { carIds: row.carIds } : {}),
  }));
}

/**
 * Cabinet off/forbid wins over a saved listing offer.
 * Per-car prices stay when the cabinet row is still on.
 */
export function applyListingCabinetExtras(
  rows: PartnerExtraSelection[],
  catalog: ExtraServicePricing[],
  cabinet: ListingCabinetExtra[],
): PartnerExtraSelection[] {
  if (!cabinet.length || !rows.length) return rows;
  const byId = new Map(cabinet.map((item) => [item.extraServiceId, item]));
  const bySlug = new Map(
    cabinet.flatMap((item) => (item.slug ? [[item.slug, item] as const] : [])),
  );
  return rows.map((row) => {
    const service = catalog.find((item) => item.id === row.extraServiceId);
    if (service && partnerStatusLocked(service)) return row;
    const match = byId.get(row.extraServiceId) || (service?.slug ? bySlug.get(service.slug) : undefined);
    if (!match) return row;
    if (match.forbidden) return { ...row, enabled: true, forbidden: true, priceEur: "0" };
    if (match.enabled === false) return { ...row, enabled: false, forbidden: false, priceEur: "0" };
    return row;
  });
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
 * Services on the car form (partner + admin review): cabinet On or Forbidden only.
 * Cabinet Off never appears on listings — same rule for existing and new partners.
 * Cross-border stays gated by its cabinet permission. If the cabinet list could not load, every service stays.
 */
export function extrasVisibleOnCarForm(
  catalog: ExtraServicePricing[],
  opts: {
    prefs: CarFormExtraPref[];
    fallback?: ExtraServicePricing[];
    carExtraIds?: Set<string>;
    offerIds?: Set<string>;
    /** When set, Off scoped to other cars is also hidden. */
    carId?: string | null;
    /** Empty cabinet that did load: mandatory services only, not the whole catalog. */
    whenUntrusted?: "all" | "mandatory";
  },
): ExtraServicePricing[] {
  const prefs = indexExtraPrefs(opts.prefs);
  const onCar = (service: ExtraServicePricing) =>
    Boolean(opts.carExtraIds?.has(service.id) || opts.offerIds?.has(service.id));
  return catalog.filter((service) => {
    const pref = prefs.forService(service);
    // Explicit cabinet Off/removed wins even if a stale catalog row still looks mandatory.
    if (
      pref &&
      partnerExtraHiddenOnListing(
        {
          added: pref.added,
          enabled: pref.enabled,
          forbidden: pref.forbidden,
          carIds: pref.carIds,
        },
        opts.carId,
      ) &&
      !partnerStatusLocked(service)
    ) {
      return false;
    }
    if (partnerStatusLocked(service)) return true;
    if (isCrossBorderExtra(service)) {
      if (pref) return Boolean(pref.enabled || pref.forbidden);
      return onCar(service);
    }
    if (!prefs.trusted) {
      if (opts.whenUntrusted === "mandatory") return partnerStatusLocked(service);
      return true;
    }
    if (pref) {
      return partnerExtraOfferedOnListing(
        {
          added: pref.added,
          enabled: pref.enabled,
          forbidden: pref.forbidden,
          carIds: pref.carIds,
        },
        opts.carId,
      );
    }
    return onCar(service);
  });
}

/**
 * One listing's extras, taken from the partner's cabinet.
 * Same On/Forbidden list and prices on partner phone, desktop and admin review.
 * Cabinet Off is omitted. A saved offer on the car does not add services or flip a switch.
 */
export function selectionsForCar(
  catalog: ExtraServicePricing[],
  prefItems: CarFormExtraPref[],
  carId: string,
  opts?: { whenUntrusted?: "all" | "mandatory" },
): { catalog: ExtraServicePricing[]; selections: PartnerExtraSelection[] } {
  const visible = extrasVisibleOnCarForm(catalog, {
    prefs: prefItems,
    carId,
    whenUntrusted: opts?.whenUntrusted,
  });
  const prefs = indexExtraPrefs(prefItems);
  const selections = selectionsFromCabinet(visible, prefItems).map((row) => {
    const service = visible.find((item) => item.id === row.extraServiceId);
    if (!service || partnerStatusLocked(service)) return row;
    const pref = prefs.forService(service);
    if (!pref) return { ...row, enabled: false, forbidden: false, priceEur: "0" };
    const applies = partnerExtraPrefAppliesToCar(
      { carIds: pref.carIds, enabled: pref.enabled, forbidden: pref.forbidden },
      carId,
    );
    if (!applies) return { ...row, enabled: false, forbidden: false, priceEur: "0" };
    if (pref.forbidden) return { ...row, enabled: true, forbidden: true, priceEur: "0" };
    if (pref.enabled === false) return { ...row, enabled: false, forbidden: false, priceEur: "0" };
    const price = Number(pref.priceEur);
    return {
      ...row,
      enabled: true,
      forbidden: false,
      priceEur: Number.isFinite(price) ? String(price) : row.priceEur,
    };
  });
  return { catalog: visible, selections };
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
    if (service && isMandatoryFreeExtra(service) && partnerStatusLocked(service)) {
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

          if (isMandatoryFreeExtra(service) && partnerStatusLocked(service)) {
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
