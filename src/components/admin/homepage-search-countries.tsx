"use client";

import { useMemo, useState } from "react";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import {
  locationCodesEqual,
  normalizeLocationCode,
  searchPlacesForCountry,
  type SearchPlace,
} from "@/lib/catalog/search-places";
import { WORLD_COUNTRIES, worldCountryName } from "@/lib/catalog/world-countries";
import { CountryFlag } from "@/components/ui/country-flag";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

const DEFAULT_MAX_EUR = 10;

export function HomepageSearchCountries({
  initialLocations,
  compact = false,
}: {
  initialLocations: DeliveryLocationView[];
  compact?: boolean;
}) {
  const { dictionary } = useAdminLocale();
  const s = dictionary.sections;
  const [locations, setLocations] = useState(initialLocations);
  const [query, setQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedIso2, setSelectedIso2] = useState(() => {
    const active = initialLocations.find((l) => l.isActive);
    return (active?.countryIso2 ?? "GE").toUpperCase();
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, DeliveryLocationView>();
    for (const loc of locations) {
      if (loc.iata) map.set(normalizeLocationCode(loc.iata), loc);
    }
    return map;
  }, [locations]);

  const activeCountByCountry = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const loc of locations) {
      if (!loc.isActive) continue;
      const iso = loc.countryIso2.toUpperCase();
      counts[iso] = (counts[iso] ?? 0) + 1;
    }
    return counts;
  }, [locations]);

  const enabledCountries = useMemo(
    () =>
      Object.entries(activeCountByCountry)
        .sort((a, b) => worldCountryName(a[0]).localeCompare(worldCountryName(b[0])))
        .map(([iso2, count]) => ({ iso2, count })),
    [activeCountByCountry],
  );

  const countries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = WORLD_COUNTRIES.filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.iso2.toLowerCase().includes(q);
    });
    return list.sort((a, b) => {
      const aOn = activeCountByCountry[a.iso2] ?? 0;
      const bOn = activeCountByCountry[b.iso2] ?? 0;
      if (Boolean(aOn) !== Boolean(bOn)) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [query, activeCountByCountry]);

  const countryPlaces = useMemo(() => searchPlacesForCountry(selectedIso2), [selectedIso2]);

  const filteredPlaces = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    if (!q) return countryPlaces;
    return countryPlaces.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.cityName.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        (p.iata && p.iata.toLowerCase().includes(q)),
    );
  }, [countryPlaces, placeQuery]);

  const airports = filteredPlaces.filter((p) => p.kind === "airport");
  const cities = filteredPlaces.filter((p) => p.kind === "city");

  const extraLocations = useMemo(
    () =>
      locations.filter((loc) => {
        if (loc.countryIso2.toUpperCase() !== selectedIso2) return false;
        return !countryPlaces.some((p) => locationCodesEqual(p.code, loc.iata));
      }),
    [locations, selectedIso2, countryPlaces],
  );

  async function refresh() {
    const res = await fetch("/api/admin/delivery", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.locations)) setLocations(data.locations);
  }

  async function setPlaceOnHomepage(code: string, on: boolean, current = locations) {
    const key = normalizeLocationCode(code);
    const existing = current.find((loc) => locationCodesEqual(loc.iata, key));
    if (existing) {
      const res = await fetch(`/api/admin/delivery/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: on }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      return;
    }
    if (!on) return;
    const res = await fetch("/api/admin/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        airportId: key,
        maxDeliveryPriceEur: DEFAULT_MAX_EUR,
        isActive: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return;
    if (res.status === 409) {
      const latestRes = await fetch("/api/admin/delivery", { cache: "no-store" });
      const latest = await latestRes.json().catch(() => ({}));
      const rows = Array.isArray(latest.locations) ? (latest.locations as DeliveryLocationView[]) : [];
      const found = rows.find((loc) => locationCodesEqual(loc.iata, key));
      if (!found) throw new Error(data.error ?? "This location is already configured");
      const patch = await fetch(`/api/admin/delivery/${found.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const patchData = await patch.json().catch(() => ({}));
      if (!patch.ok) throw new Error(patchData.error ?? "Update failed");
      return;
    }
    throw new Error(data.error ?? "Create failed");
  }

  async function togglePlace(code: string, on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setPlaceOnHomepage(code, on);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function enableAllInCountry() {
    setBusy(true);
    setError(null);
    try {
      let current = locations;
      for (const place of countryPlaces) {
        const loc = current.find((row) => locationCodesEqual(row.iata, place.code));
        if (loc?.isActive) continue;
        await setPlaceOnHomepage(place.code, true, current);
        const res = await fetch("/api/admin/delivery", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.locations)) current = data.locations;
      }
      setLocations(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disableCountry() {
    setBusy(true);
    setError(null);
    try {
      const active = locations.filter(
        (l) => l.isActive && l.countryIso2.toUpperCase() === selectedIso2,
      );
      for (const loc of active) {
        await setPlaceOnHomepage(loc.iata, false, locations);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function placeRow(place: SearchPlace) {
    const loc = byCode.get(place.code);
    const on = Boolean(loc?.isActive);
    return (
      <li key={place.code} className="border-b border-slate-100 py-3 last:border-0">
        <label className="flex min-w-0 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={on}
            disabled={busy}
            onChange={(e) => void togglePlace(place.code, e.target.checked)}
            className="h-4 w-4"
          />
          <span>
            <span className="font-bold">{place.cityName}</span>
            {place.kind === "airport" && place.iata ? (
              <span className="ml-2 font-mono text-xs text-slate-500">{place.iata}</span>
            ) : (
              <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                {s.city}
              </span>
            )}
            <span className="mt-0.5 block text-xs text-slate-500">{place.name}</span>
          </span>
        </label>
      </li>
    );
  }

  const panelClass = compact
    ? "rounded-lg border border-slate-200 bg-slate-50/50 p-2.5"
    : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
  const placesPanelClass = compact
    ? "rounded-lg border border-slate-200 bg-slate-50/50 p-2.5"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const listMaxH = compact ? "max-h-[18rem]" : "max-h-[32rem]";

  return (
    <div className={compact ? "grid gap-3 lg:grid-cols-[minmax(14rem,18rem)_1fr]" : "grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr]"}>
      <aside className={panelClass}>
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">{s.countries}</h2>
        <p className="mt-1 text-xs text-slate-500">{s.countriesHelp}</p>
        {enabledCountries.length > 0 ? (
          <p className="mt-3 text-xs font-semibold text-emerald-800">
            {s.onHomepage}: {enabledCountries.map((c) => `${worldCountryName(c.iso2)} (${c.count})`).join(", ")}
          </p>
        ) : (
          <p className="mt-3 text-xs font-semibold text-amber-800">
            {s.noCountryYet}
          </p>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.searchCountryPh}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <ul className={`mt-3 space-y-1 overflow-y-auto ${listMaxH}`}>
          {countries.map((country) => {
            const count = activeCountByCountry[country.iso2] ?? 0;
            const selected = selectedIso2 === country.iso2;
            return (
              <li key={country.iso2}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIso2(country.iso2);
                    setPlaceQuery("");
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${
                    selected ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                  }`}
                >
                  <CountryFlag iso2={country.iso2} className="h-4 w-6 rounded-sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{country.name}</span>
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        selected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={placesPanelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CountryFlag iso2={selectedIso2} className="h-7 w-10 rounded-md" />
            <div>
              <h2 className={compact ? "text-base font-extrabold" : "text-lg font-extrabold"}>
                {worldCountryName(selectedIso2)}
              </h2>
              <p className="text-xs text-slate-500">
                {s.placesHelp}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || countryPlaces.length === 0}
              onClick={() => void enableAllInCountry()}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {s.enableAll}
            </button>
            <button
              type="button"
              disabled={busy || !(activeCountByCountry[selectedIso2] > 0)}
              onClick={() => void disableCountry()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {s.hideCountry}
            </button>
          </div>
        </div>

        <input
          value={placeQuery}
          onChange={(e) => setPlaceQuery(e.target.value)}
          placeholder={s.filterPlacesPh}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        {countryPlaces.length === 0 && extraLocations.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">{s.noPlaces}</p>
        ) : (
          <div className={`mt-5 space-y-6 ${compact ? "max-h-[22rem] overflow-y-auto pr-1" : ""}`}>
            {airports.length > 0 ? (
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.airports}</h3>
                <ul className="mt-1 divide-y divide-slate-100">{airports.map(placeRow)}</ul>
              </div>
            ) : null}
            {cities.length > 0 ? (
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.cities}</h3>
                <ul className="mt-1 divide-y divide-slate-100">{cities.map(placeRow)}</ul>
              </div>
            ) : null}
            {extraLocations.length > 0 ? (
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.addedFromDelivery}</h3>
                <ul className="mt-1 divide-y divide-slate-100">
                  {extraLocations.map((loc) => {
                    const placeLike = {
                      code: normalizeLocationCode(loc.iata),
                      kind: loc.kind || "airport",
                      iata: loc.kind === "city" ? undefined : loc.iata,
                      cityName: loc.cityName || loc.label,
                      name: loc.label,
                      label: loc.label,
                      countryIso2: loc.countryIso2,
                    } as SearchPlace;
                    return placeRow(placeLike);
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
