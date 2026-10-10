"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { formatSyncTime, integrationCopy } from "@/components/partner/integration/integration-copy";

export type CarIcalFeedStatus = {
  importUrl: string;
  lastSyncAt: string | null;
  lastError: string | null;
  busyCount: number;
};

type FeedResponse = { feed?: CarIcalFeedStatus & { provider?: string }; error?: string };

export function CarIcalImport({
  carId,
  initial,
  showLabel = true,
}: {
  carId: string;
  /** Skip the initial fetch when the parent already loaded the feed. */
  initial?: CarIcalFeedStatus | null;
  showLabel?: boolean;
}) {
  const { locale } = usePartnerLocale();
  const t = integrationCopy(locale);
  const [status, setStatus] = useState<CarIcalFeedStatus | null>(initial ?? null);
  const [url, setUrl] = useState(initial?.importUrl ?? "");
  const [loading, setLoading] = useState(initial === undefined);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial !== undefined) return;
    let cancelled = false;
    fetch(`/api/partners/channel-feeds?carId=${encodeURIComponent(carId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        return (await res.json()) as { feeds?: Array<CarIcalFeedStatus & { provider: string }> };
      })
      .then((data) => {
        if (cancelled) return;
        const feed = data.feeds?.find((row) => row.provider === "ical") || null;
        setStatus(feed);
        setUrl(feed?.importUrl || "");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t.loadError);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [carId, initial, t.loadError]);

  async function save(importUrl: string) {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/partners/channel-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, provider: "ical", importUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as FeedResponse;
      if (!res.ok || !data.feed) throw new Error(data.error || t.loadError);
      setStatus(data.feed);
      setUrl(data.feed.importUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  const linked = Boolean(status?.importUrl);
  const syncedAt = formatSyncTime(status?.lastSyncAt ?? null, locale);

  return (
    <div className="space-y-2">
      {showLabel ? (
        <label htmlFor={`ical-${carId}`} className="block text-xs font-bold text-slate-800">
          {t.icalLabel}
        </label>
      ) : null}
      <p className="text-xs leading-relaxed text-slate-500">{t.icalFieldHint}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`ical-${carId}`}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.icalPlaceholder}
          className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:h-10 sm:text-sm"
        />
        <button
          type="button"
          disabled={loading || working || !url.trim()}
          onClick={() => void save(url.trim())}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1d6fe8] px-4 text-sm font-bold text-white hover:bg-[#165cc4] disabled:opacity-50 sm:h-10"
        >
          <RefreshCw className={working ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden />
          {working ? t.syncing : t.syncNow}
        </button>
      </div>

      {loading ? <p className="text-xs text-slate-500">{t.loading}</p> : null}

      {!loading && linked ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {status?.lastError ? (
            <span className="inline-flex min-w-0 items-start gap-1 break-words font-semibold text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {status.lastError}
            </span>
          ) : status?.lastSyncAt ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {t.synced}
            </span>
          ) : (
            <span className="font-semibold text-slate-500">{t.notSynced}</span>
          )}
          {syncedAt ? (
            <span className="text-slate-500">
              {t.lastSync}: {syncedAt}
            </span>
          ) : null}
          {status && !status.lastError && status.lastSyncAt ? (
            <span className="text-slate-500">
              {status.busyCount} {t.busyDays}
            </span>
          ) : null}
          <button
            type="button"
            disabled={working}
            onClick={() => void save("")}
            className="min-h-10 font-semibold text-slate-500 underline-offset-2 hover:text-red-600 hover:underline sm:min-h-0"
          >
            {t.remove}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}
