"use client";

import { useMemo } from "react";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { isSyntheticDeliveryId } from "@/lib/delivery/pricing";
import { cn } from "@/lib/utils";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { CountryFlag } from "@/components/ui/country-flag";
import { worldCountryName } from "@/lib/catalog/world-countries";

export type PickupPlaceKind = "city" | "airport" | "office";

export type PickupPlaceRow = {
  id: string;
  cityKey: string;
  cityLabel: string;
  placeKind: PickupPlaceKind;
  placeLabel: string;
  /** Real DeliveryLocation id when airport/city; synthetic otherwise */
  deliveryLocationId: string;
  enabled: boolean;
  priceEur: string;
  freeAfterDays: string;
  travelHours: string;
  travelMinutes: string;
};

function cityNameFromLoc(loc: DeliveryLocationView): string {
  if (loc.cityName?.trim()) return loc.cityName.trim();
  const beforeParen = loc.label.split("(")[0]?.trim();
  if (beforeParen) return beforeParen;
  return loc.iata;
}

function cityKey(iso2: string, name: string) {
  return `${iso2.toUpperCase()}::${name.trim().toLowerCase()}`;
}

function emptyRow(
  partial: Omit<PickupPlaceRow, "enabled" | "priceEur" | "freeAfterDays" | "travelHours" | "travelMinutes"> &
    Partial<PickupPlaceRow>,
): PickupPlaceRow {
  return {
    enabled: true,
    priceEur: "0",
    freeAfterDays: "0",
    travelHours: "0",
    travelMinutes: "0",
    ...partial,
  };
}

/** Build per-car pickup rows from partner-activated location ids. */
export function buildPlaceRowsForLocations(
  catalog: DeliveryLocationView[],
  selectedIds: string[],
  previous: PickupPlaceRow[],
): PickupPlaceRow[] {
  const prevById = new Map(previous.map((p) => [p.deliveryLocationId || p.id, p]));
  const byId = new Map(catalog.map((l) => [l.id, l]));
  const rows: PickupPlaceRow[] = [];
  for (const id of selectedIds) {
    const loc = byId.get(id);
    if (!loc) continue;
    const city = cityNameFromLoc(loc);
    const prev = prevById.get(id);
    const kind: PickupPlaceKind = loc.kind === "city" ? "city" : "airport";
    rows.push(
      emptyRow({
        ...prev,
        id,
        cityKey: cityKey(loc.countryIso2 || "XX", city),
        cityLabel: city,
        placeKind: kind,
        placeLabel: loc.label,
        deliveryLocationId: loc.id,
        enabled: prev?.enabled ?? true,
        freeAfterDays: "0",
        travelHours: "0",
        travelMinutes: "0",
      }),
    );
  }
  return rows;
}

/** @deprecated kept for edit flows that still pass city keys */
export function buildCityOptions(catalog: DeliveryLocationView[]) {
  const map = new Map<string, { key: string; label: string; countryIso2: string; airports: DeliveryLocationView[] }>();
  for (const loc of catalog) {
    const name = cityNameFromLoc(loc);
    const key = cityKey(loc.countryIso2 || "XX", name);
    const existing = map.get(key);
    if (existing) existing.airports.push(loc);
    else map.set(key, { key, label: name, countryIso2: (loc.countryIso2 || "XX").toUpperCase(), airports: [loc] });
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function buildPlaceRowsForCities(
  cities: ReturnType<typeof buildCityOptions>,
  selectedKeys: string[],
  previous: PickupPlaceRow[],
): PickupPlaceRow[] {
  const ids = cities
    .filter((c) => selectedKeys.includes(c.key))
    .flatMap((c) => c.airports.map((a) => a.id));
  const catalog = cities.flatMap((c) => c.airports);
  return buildPlaceRowsForLocations(catalog, ids, previous);
}

export function PartnerPickupDropoffSection({
  catalog,
  catalogReady = true,
  selectedLocationIds,
  onSelectedLocationIdsChange,
  places,
  onPlacesChange,
  invalid = false,
}: {
  catalog: DeliveryLocationView[];
  /** False while partner locations are still loading — keep the picker visible, never the old empty box. */
  catalogReady?: boolean;
  selectedLocationIds?: string[];
  onSelectedLocationIdsChange?: (ids: string[]) => void;
  places: PickupPlaceRow[];
  onPlacesChange: (rows: PickupPlaceRow[]) => void;
  currencySymbol?: string;
  invalid?: boolean;
}) {
  const { dictionary } = usePartnerLocale();
  const pickup = dictionary.createCar.pickup;

  const locationIds = selectedLocationIds || [];
  const selectedSet = useMemo(() => new Set(locationIds), [locationIds]);

  const setLocationIds = (ids: string[]) => {
    onSelectedLocationIdsChange?.(ids);
    onPlacesChange(buildPlaceRowsForLocations(catalog, ids, places));
  };

  const toggleLocation = (id: string) => {
    if (!id) return;
    if (selectedSet.has(id)) {
      setLocationIds(locationIds.filter((x) => x !== id));
    } else {
      setLocationIds([...locationIds, id]);
    }
  };

  const sortedCatalog = useMemo(
    () =>
      [...catalog].sort((a, b) => {
        const ca = (worldCountryName(a.countryIso2) || a.countryIso2 || "").localeCompare(
          worldCountryName(b.countryIso2) || b.countryIso2 || "",
        );
        if (ca !== 0) return ca;
        return a.label.localeCompare(b.label);
      }),
    [catalog],
  );

  return (
    <div className="space-y-1.5">
      <p
        className={cn(
          "text-[11px] font-semibold",
          invalid ? "text-red-700" : "text-[#3a4553]",
        )}
      >
        {pickup.addLocation} <span className="text-[#e11d48]">*</span>
      </p>

      {catalogReady && !catalog.length ? (
        <p
          className={cn(
            "rounded-lg border border-dashed p-4 text-sm",
            invalid
              ? "border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200"
              : "border-amber-300 bg-amber-50 text-amber-900",
          )}
        >
          {pickup.emptyPickup}
        </p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3",
            invalid && "rounded-md ring-1 ring-red-300",
          )}
        >
          {sortedCatalog.map((loc) => {
            const checked = selectedSet.has(loc.id);
            return (
              <label
                key={loc.id}
                className={cn(
                  "relative flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition",
                  checked
                    ? "border-2 border-[#1f8f3a] bg-emerald-100 shadow-[0_0_0_1px_rgba(40,167,69,0.35)] ring-2 ring-emerald-400/50"
                    : "border border-[#c5ced8] bg-white hover:border-[#28a745]/50 hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLocation(loc.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-[#28a745]"
                />
                {loc.countryIso2 ? (
                  <CountryFlag iso2={loc.countryIso2} className="h-3.5 w-5 shrink-0" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate font-semibold",
                      checked ? "text-emerald-950" : "text-slate-900",
                    )}
                  >
                    {loc.label}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-[10px]",
                      checked ? "text-emerald-800/80" : "text-slate-500",
                    )}
                  >
                    {worldCountryName(loc.countryIso2) || loc.countryIso2}
                    {loc.iata ? ` · ${loc.iata}` : ""}
                  </span>
                </span>
                {checked ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#28a745] text-[9px] font-bold text-white shadow">
                    ✓
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function pickupPlacesToDeliveryPayload(places: PickupPlaceRow[]) {
  return places
    .filter((p) => p.enabled && !isSyntheticDeliveryId(p.deliveryLocationId))
    .map((p) => ({
      deliveryLocationId: p.deliveryLocationId,
      enabled: true,
      priceEur: 0,
      freeAfterDays: 0,
      travelTimeMinutes: 0,
      placeKind: p.placeKind,
      cityKey: p.cityKey,
      cityLabel: p.cityLabel,
      placeLabel: p.placeLabel,
    }));
}
