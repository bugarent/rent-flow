"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { DeliveryLocationView } from "@/lib/delivery/pricing";
import { normalizeLocationCode } from "@/lib/catalog/search-places";

const DEFAULT_MAX_EUR = 10;
/** Upper bound on save round-trips per place while the admin keeps clicking it. */
const MAX_SYNC_PASSES = 6;

export type PlaceTarget = { code: string; countryIso2: string };

type Desired = { on: boolean; countryIso2: string };
type DesiredMap = Readonly<Record<string, Desired>>;

export function locationKey(codeOrRow: string | Pick<DeliveryLocationView, "iata" | "airportId">): string {
  const raw = typeof codeOrRow === "string" ? codeOrRow : codeOrRow.iata || codeOrRow.airportId || "";
  return raw ? normalizeLocationCode(raw) : "";
}

/** One row per place code; an active row wins over an inactive duplicate. */
function dedupeLocations(rows: readonly DeliveryLocationView[]): DeliveryLocationView[] {
  const byKey = new Map<string, DeliveryLocationView>();
  for (const row of rows) {
    const key = locationKey(row);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || (row.isActive && !prev.isActive)) byKey.set(key, row);
  }
  return [...byKey.values()];
}

function upsertLocation(rows: readonly DeliveryLocationView[], row: DeliveryLocationView): DeliveryLocationView[] {
  const key = locationKey(row);
  return [...rows.filter((r) => r.id !== row.id && locationKey(r) !== key), row];
}

function findRow(rows: readonly DeliveryLocationView[], key: string) {
  return rows.find((r) => locationKey(r) === key);
}

function omitKey(map: DesiredMap, key: string): DesiredMap {
  if (!(key in map)) return map;
  const next = { ...map };
  delete next[key];
  return next;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

async function patchActive(id: string, on: boolean): Promise<DeliveryLocationView> {
  const res = await fetch(`/api/admin/delivery/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive: on }),
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(String(data.error ?? "Update failed"));
  return data as unknown as DeliveryLocationView;
}

/** Persist one place and return the saved row, or null when there is nothing to turn off. */
async function saveLocation(
  key: string,
  on: boolean,
  row: DeliveryLocationView | undefined,
): Promise<DeliveryLocationView | null> {
  if (row) return patchActive(row.id, on);
  if (!on) return null;

  const res = await fetch("/api/admin/delivery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ airportId: key, maxDeliveryPriceEur: DEFAULT_MAX_EUR, isActive: true }),
  });
  const data = await readJson(res);
  if (res.ok) return data as unknown as DeliveryLocationView;
  if (res.status === 409) {
    const listRes = await fetch("/api/admin/delivery", { cache: "no-store" });
    const list = await readJson(listRes);
    const rows = Array.isArray(list.locations) ? (list.locations as DeliveryLocationView[]) : [];
    const existing = findRow(rows, key);
    if (existing) return patchActive(existing.id, true);
  }
  throw new Error(String(data.error ?? "Create failed"));
}

/**
 * Homepage search locations with optimistic, per-place serialized saves.
 * Rapid clicks only change the desired state; one worker per place converges
 * the server to the latest click, so responses can never overwrite newer input.
 */
export function useHomepageLocations(initialLocations: readonly DeliveryLocationView[]) {
  const [locations, setLocations] = useState<DeliveryLocationView[]>(() => dedupeLocations(initialLocations));
  const [desired, setDesired] = useState<DesiredMap>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Async workers read the latest values here; every write goes through the
  // same pure updater for the ref and for React's functional setState.
  const locationsRef = useRef(locations);
  const desiredRef = useRef(desired);
  const running = useRef(new Set<string>());

  const updateLocations = useCallback((update: (prev: DeliveryLocationView[]) => DeliveryLocationView[]) => {
    locationsRef.current = update(locationsRef.current);
    setLocations((prev) => update(prev));
  }, []);

  const updateDesired = useCallback((update: (prev: DesiredMap) => DesiredMap) => {
    desiredRef.current = update(desiredRef.current);
    setDesired((prev) => update(prev));
  }, []);

  const needsSync = useCallback((key: string) => {
    const want = desiredRef.current[key];
    if (!want) return false;
    return want.on !== Boolean(findRow(locationsRef.current, key)?.isActive);
  }, []);

  const sync = useCallback(
    async (key: string): Promise<void> => {
      let failed = false;
      // Re-enter when a click lands while this worker is releasing the place.
      do {
        if (running.current.has(key)) return;
        running.current.add(key);
        setPending((prev) => new Set(prev).add(key));
        try {
          for (let pass = 0; pass < MAX_SYNC_PASSES && needsSync(key); pass++) {
            const want = desiredRef.current[key];
            const saved = await saveLocation(key, want.on, findRow(locationsRef.current, key));
            if (!saved) break;
            updateLocations((prev) => upsertLocation(prev, saved));
          }
        } catch (err) {
          failed = true;
          setError(err instanceof Error ? err.message : "Save failed");
        } finally {
          const settled = desiredRef.current[key];
          if (settled && (failed || !needsSync(key))) {
            updateDesired((prev) => (prev[key] === settled ? omitKey(prev, key) : prev));
          }
          running.current.delete(key);
          setPending((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      } while (!failed && needsSync(key));
    },
    [needsSync, updateDesired, updateLocations],
  );

  const setPlace = useCallback(
    (target: PlaceTarget, on: boolean) => {
      const key = locationKey(target.code);
      if (!key) return;
      setError(null);
      updateDesired((prev) => ({ ...prev, [key]: { on, countryIso2: target.countryIso2.toUpperCase() } }));
      void sync(key);
    },
    [sync, updateDesired],
  );

  const setMany = useCallback(
    async (targets: readonly PlaceTarget[], on: boolean) => {
      const unique = new Map<string, Desired>();
      for (const t of targets) {
        const key = locationKey(t.code);
        if (key) unique.set(key, { on, countryIso2: t.countryIso2.toUpperCase() });
      }
      if (unique.size === 0) return;
      setError(null);
      setBulkBusy(true);
      updateDesired((prev) => ({ ...prev, ...Object.fromEntries(unique) }));
      try {
        for (const key of unique.keys()) await sync(key);
      } finally {
        setBulkBusy(false);
      }
    },
    [sync, updateDesired],
  );

  /** Server row per code with any not-yet-saved click applied on top. */
  const effective = useMemo(() => {
    const map = new Map<string, { countryIso2: string; isActive: boolean }>();
    for (const row of locations) {
      const key = locationKey(row);
      map.set(key, { countryIso2: row.countryIso2.toUpperCase(), isActive: row.isActive });
    }
    for (const [key, want] of Object.entries(desired)) {
      const prev = map.get(key);
      map.set(key, { countryIso2: prev?.countryIso2 || want.countryIso2, isActive: want.on });
    }
    return map;
  }, [locations, desired]);

  const activeCountByCountry = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { countryIso2, isActive } of effective.values()) {
      if (isActive && countryIso2) counts[countryIso2] = (counts[countryIso2] ?? 0) + 1;
    }
    return counts;
  }, [effective]);

  const isOn = useCallback((code: string) => Boolean(effective.get(locationKey(code))?.isActive), [effective]);
  const isPending = useCallback((code: string) => pending.has(locationKey(code)), [pending]);

  return { locations, activeCountByCountry, isOn, isPending, setPlace, setMany, bulkBusy, error };
}
