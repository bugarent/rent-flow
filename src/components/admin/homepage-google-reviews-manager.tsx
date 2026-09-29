"use client";

import { useMemo, useState } from "react";
import {
  GOOGLE_REVIEW_RATING_OPTIONS,
  parseAllowedRatings,
  reviewMatchesAllowedRatings,
  type HomepageGoogleReviewsConfig,
} from "@/lib/catalog/homepage-google-reviews";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type Props = {
  initial: HomepageGoogleReviewsConfig;
};

function formatStars(value: number) {
  return `${value.toFixed(1)}★`;
}

export function HomepageGoogleReviewsManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const s = dictionary.sections;
  const c = dictionary.common;
  const [mapsUrl, setMapsUrl] = useState(initial.mapsUrl);
  const [config, setConfig] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState(initial.lastWarning || "");
  const [error, setError] = useState("");

  const allowed = parseAllowedRatings(config.allowedRatings);
  const visibleReviews = useMemo(
    () => config.reviews.filter((r) => reviewMatchesAllowedRatings(r.rating, allowed) && r.text.trim()),
    [config.reviews, allowed],
  );

  const applyConfig = (data: HomepageGoogleReviewsConfig) => {
    setConfig(data);
    setMapsUrl(data.mapsUrl || "");
    setWarning(data.lastWarning || "");
  };

  const saveEnabled = async (next: boolean) => {
    setBusy(true);
    setError("");
    setMessage("");
    const previous = config.enabled;
    setConfig((curr) => ({ ...curr, enabled: next }));
    try {
      const res = await fetch("/api/admin/homepage/google-reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      applyConfig(data);
      setMessage(data.enabled ? s.googleReviewsOn : s.googleReviewsOff);
    } catch (err) {
      setConfig((curr) => ({ ...curr, enabled: previous }));
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const saveRatings = async (next: number[]) => {
    if (!next.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    const previous = config.allowedRatings;
    setConfig((curr) => ({ ...curr, allowedRatings: next }));
    try {
      const res = await fetch("/api/admin/homepage/google-reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedRatings: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      applyConfig(data);
      setMessage(c.saved);
    } catch (err) {
      setConfig((curr) => ({ ...curr, allowedRatings: previous }));
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const toggleRating = (value: number) => {
    const on = allowed.some((n) => Math.abs(n - value) < 0.051);
    const next = on ? allowed.filter((n) => Math.abs(n - value) >= 0.051) : [...allowed, value];
    if (!next.length) return;
    void saveRatings(next);
  };

  const save = async (refresh: boolean) => {
    setBusy(true);
    setError("");
    setMessage("");
    setWarning("");
    if (refresh) {
      setConfig((curr) => ({
        ...curr,
        reviews: [],
        placeId: null,
        placeName: null,
        placeRating: null,
        lastWarning: null,
      }));
    }
    try {
      const res = await fetch("/api/admin/homepage/google-reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapsUrl, refresh }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      applyConfig(data);
      if (data.lastWarning) {
        setWarning(String(data.lastWarning));
      } else {
        const floor = Math.min(...parseAllowedRatings(data.allowedRatings));
        setMessage(
          refresh
            ? `${c.saved}. ${data.reviews?.length ?? 0} · ${floor.toFixed(1)}+`
            : c.saved,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.googleReviews}</h2>
        <p className="mt-0.5 line-clamp-3 text-xs text-slate-500">{s.googleReviewsHelp}</p>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="text-xs font-semibold text-slate-800">
          {config.enabled ? c.enabled : c.disabled}
        </span>
        <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={config.enabled}
            disabled={busy}
            onChange={(e) => void saveEnabled(e.target.checked)}
          />
          <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-[#22c55e] peer-disabled:opacity-50" />
          <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>

      <div>
        <p className="text-[11px] font-semibold text-slate-700">{s.googleReviewsRatings}</p>
        <p className="mt-0.5 text-[10px] text-slate-500">{s.googleReviewsRatingsHelp}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={s.googleReviewsRatings}>
          {GOOGLE_REVIEW_RATING_OPTIONS.map((value) => {
            const selected = allowed.some((n) => Math.abs(n - value) < 0.051);
            return (
              <button
                key={value}
                type="button"
                disabled={busy || (selected && allowed.length === 1)}
                aria-pressed={selected}
                onClick={() => toggleRating(value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                  selected
                    ? "border-sky-600 bg-sky-50 text-sky-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {formatStars(value)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block text-[11px] font-semibold text-slate-700">
        {s.mapsUrl}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          placeholder="https://maps.google.com/… or Place ID ChIJ…"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
          className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
        >
          {busy ? c.loading : s.saveRefreshReviews}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="rounded-lg border px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          {s.saveUrlOnly}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {warning ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{warning}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}

      <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
        <p>
          Place: <strong>{config.placeName || "—"}</strong>
        </p>
        <p className="mt-0.5">
          Place ID: <strong className="break-all">{config.placeId || "—"}</strong>
        </p>
        <p className="mt-0.5">
          {formatStars(Math.min(...allowed))}+ : <strong>{visibleReviews.length}</strong>
          {config.lastFetchedAt ? ` · ${new Date(config.lastFetchedAt).toLocaleString()}` : null}
        </p>
      </div>

      {visibleReviews.length > 0 ? (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto text-xs">
          {visibleReviews.map((r) => (
            <li key={r.id} className="rounded-lg border bg-white p-2">
              <p className="font-semibold text-[#0b1f4b]">
                {r.authorName} · {r.rating.toFixed(1)}★
              </p>
              <p className="mt-0.5 line-clamp-2 text-slate-600">{r.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-500">—</p>
      )}
    </div>
  );
}
