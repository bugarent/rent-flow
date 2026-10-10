"use client";

import { useEffect, useState } from "react";
import { ExternalLink, KeyRound } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { CopyButton } from "@/components/partner/integration/copy-button";
import { formatSyncTime, integrationCopy } from "@/components/partner/integration/integration-copy";

type Settings = {
  hasKey: boolean;
  keyPreview: string | null;
  keyCreatedAt: string | null;
  lastUsedAt: string | null;
  webhookUrl: string;
  webhookSecret: string;
};

type Payload = { settings: Settings; apiKey?: string; baseUrl: string; docsUrl: string };

const fieldLabel = "text-[11px] font-bold uppercase tracking-wide text-slate-500";
const codeBox =
  "min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-800";

export function ApiAccessCard() {
  const { locale } = usePartnerLocale();
  const t = integrationCopy(locale);
  const [data, setData] = useState<Payload | null>(null);
  const [freshKey, setFreshKey] = useState("");
  const [webhook, setWebhook] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"" | "generate" | "save" | "test">("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/partners/api-access", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        return (await res.json()) as Payload;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setWebhook(payload.settings.webhookUrl);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [t.loadError]);

  async function generate() {
    if (data?.settings.hasKey && !window.confirm(t.regenerateConfirm)) return;
    setBusy("generate");
    setNotice(null);
    try {
      const res = await fetch("/api/partners/api-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      if (!res.ok) throw new Error("generate");
      const payload = (await res.json()) as Payload;
      setData(payload);
      setFreshKey(payload.apiKey || "");
    } catch {
      setNotice({ tone: "error", text: t.loadError });
    } finally {
      setBusy("");
    }
  }

  async function saveWebhook() {
    setBusy("save");
    setNotice(null);
    try {
      const res = await fetch("/api/partners/api-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhook.trim() }),
      });
      if (!res.ok) throw new Error("invalid");
      const payload = (await res.json()) as Payload;
      setData((prev) => (prev ? { ...prev, settings: payload.settings } : payload));
      setWebhook(payload.settings.webhookUrl);
      setNotice({ tone: "ok", text: t.saved });
    } catch {
      setNotice({ tone: "error", text: t.webhookInvalid });
    } finally {
      setBusy("");
    }
  }

  async function testWebhook() {
    setBusy("test");
    setNotice(null);
    try {
      const res = await fetch("/api/partners/api-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_webhook" }),
      });
      const result = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: number; error?: string };
      if (res.ok && result.ok) {
        setNotice({ tone: "ok", text: `${t.testOk} (HTTP ${result.status})` });
      } else {
        const detail = result.status ? `HTTP ${result.status}` : result.error || "";
        setNotice({ tone: "error", text: detail ? `${t.testFail}: ${detail}` : t.testFail });
      }
    } catch {
      setNotice({ tone: "error", text: t.testFail });
    } finally {
      setBusy("");
    }
  }

  const settings = data?.settings;
  const webhookDirty = settings ? webhook.trim() !== settings.webhookUrl : false;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
          <KeyRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-[#0b1f4b]">{t.apiTitle}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{t.apiHint}</p>
        </div>
      </div>

      {loadError ? <p className="mt-4 text-sm text-red-600">{loadError}</p> : null}
      {!data && !loadError ? <p className="mt-4 text-sm text-slate-500">{t.loading}</p> : null}

      {data && settings ? (
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <p className={fieldLabel}>{t.apiKey}</p>
            {freshKey ? (
              <>
                <div className="flex items-stretch gap-2">
                  <code className={codeBox}>{freshKey}</code>
                  <CopyButton value={freshKey} copyLabel={t.copy} copiedLabel={t.copied} />
                </div>
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t.newKeyNotice}</p>
              </>
            ) : settings.hasKey ? (
              <code className={`${codeBox} block`}>{settings.keyPreview}</code>
            ) : (
              <p className="text-sm text-slate-500">{t.noKey}</p>
            )}
            {settings.hasKey ? (
              <p className="text-xs text-slate-500">
                {t.keyCreated}: {formatSyncTime(settings.keyCreatedAt, locale)} · {t.lastUsed}:{" "}
                {settings.lastUsedAt ? formatSyncTime(settings.lastUsedAt, locale) : t.never}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy !== ""}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#3d2a6d] px-4 py-2 text-sm font-bold text-white hover:bg-[#2f2056] disabled:opacity-60 sm:min-h-10 sm:w-auto"
            >
              {busy === "generate" ? t.saving : settings.hasKey ? t.regenerate : t.generate}
            </button>
          </div>

          <div className="space-y-2">
            <p className={fieldLabel}>{t.baseUrl}</p>
            <div className="flex items-stretch gap-2">
              <code className={codeBox}>{data.baseUrl}</code>
              <CopyButton value={data.baseUrl} copyLabel={t.copy} copiedLabel={t.copied} />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="partner-webhook-url" className={fieldLabel}>
              {t.webhookUrl}
            </label>
            <p className="text-xs leading-relaxed text-slate-500">{t.webhookHint}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="partner-webhook-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder={t.webhookPlaceholder}
                className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:h-10 sm:text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveWebhook()}
                  disabled={busy !== "" || !webhookDirty}
                  className="h-11 flex-1 rounded-md bg-[#1d6fe8] px-4 text-sm font-bold text-white hover:bg-[#165cc4] disabled:opacity-50 sm:h-10 sm:flex-none"
                >
                  {busy === "save" ? t.saving : t.save}
                </button>
                <button
                  type="button"
                  onClick={() => void testWebhook()}
                  disabled={busy !== "" || !settings.webhookUrl || webhookDirty}
                  className="h-11 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:h-10 sm:flex-none"
                >
                  {busy === "test" ? t.saving : t.test}
                </button>
              </div>
            </div>
            {settings.webhookUrl ? (
              <div className="space-y-1 pt-1">
                <p className={fieldLabel}>{t.webhookSecret}</p>
                <div className="flex items-stretch gap-2">
                  <code className={codeBox}>{settings.webhookSecret}</code>
                  <CopyButton value={settings.webhookSecret} copyLabel={t.copy} copiedLabel={t.copied} />
                </div>
              </div>
            ) : null}
          </div>

          {notice ? (
            <p
              role="status"
              className={
                notice.tone === "ok"
                  ? "rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                  : "rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
              }
            >
              {notice.text}
            </p>
          ) : null}

          <a
            href={data.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-[#1d6fe8] hover:underline"
          >
            {t.docs}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
      ) : null}
    </section>
  );
}
