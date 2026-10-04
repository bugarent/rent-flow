"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ADMIN_BASE } from "@/lib/routes";
import { requestJson } from "@/lib/http/request-json";
import { cn } from "@/lib/utils";
import {
  MobileDataCard,
  MobileDataRow,
  ResponsiveDataList,
} from "@/components/ui/responsive-data-list";
import type {
  IntegrationMappingRecord,
  IntegrationSyncLogRecord,
  PartnerIntegrationRecord,
} from "@/lib/integrations/types";

export function IntegrationDetailPanel({ integrationId }: { integrationId: string }) {
  const [integration, setIntegration] = useState<PartnerIntegrationRecord | null>(null);
  const [mappings, setMappings] = useState<IntegrationMappingRecord[]>([]);
  const [logs, setLogs] = useState<IntegrationSyncLogRecord[]>([]);
  const [tab, setTab] = useState<"credentials" | "mappings" | "logs">("credentials");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [message, setMessage] = useState("");
  const [apiKeyOnce, setApiKeyOnce] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapDraft, setMapDraft] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    const res = await requestJson<{
      integration: PartnerIntegrationRecord;
      mappings?: IntegrationMappingRecord[];
      logs?: IntegrationSyncLogRecord[];
    }>(`/api/admin/integrations/${encodeURIComponent(integrationId)}`);
    const data = res.data;
    if (!res.ok || !data?.integration) {
      setMessage(res.error || "Failed to load");
      setLoadFailed(true);
      return;
    }
    setIntegration(data.integration);
    setMappings(data.mappings || []);
    setLogs(data.logs || []);
    setWebhookUrl(data.integration.webhookUrl || "");
    setStatus(data.integration.status);
    setMapDraft(
      JSON.stringify(
        (data.mappings || []).map((m: IntegrationMappingRecord) => ({
          kind: m.kind,
          externalId: m.externalId,
          externalLabel: m.externalLabel,
          internalId: m.internalId,
          meta: m.meta,
        })),
        null,
        2,
      ),
    );
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integrationId]);

  const vehicles = useMemo(() => mappings.filter((m) => m.kind === "VEHICLE"), [mappings]);
  const locations = useMemo(() => mappings.filter((m) => m.kind === "LOCATION"), [mappings]);

  const save = async (extra?: Record<string, unknown>) => {
    setBusy(true);
    setMessage("");
    const res = await requestJson<{
      integration?: PartnerIntegrationRecord;
      apiKey?: string;
      message?: string;
    }>(`/api/admin/integrations/${encodeURIComponent(integrationId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookUrl: webhookUrl.trim() || null,
        status,
        ...extra,
      }),
    });
    if (res.ok && res.data) {
      if (res.data.apiKey) setApiKeyOnce(res.data.apiKey);
      if (res.data.integration) setIntegration(res.data.integration);
      setMessage(res.data.message || "Saved");
    } else {
      setMessage(res.error || "Save failed");
    }
    setBusy(false);
  };

  const saveMappings = async () => {
    setBusy(true);
    setMessage("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(mapDraft);
    } catch {
      setMessage("Mappings JSON is invalid");
      setBusy(false);
      return;
    }
    const res = await requestJson<{ mappings?: IntegrationMappingRecord[] }>(
      `/api/admin/integrations/${encodeURIComponent(integrationId)}/mappings`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: parsed }),
      },
    );
    if (res.ok) {
      setMappings(res.data?.mappings || []);
      setMessage("Mappings saved");
    } else {
      setMessage(res.error || "Mapping save failed");
    }
    setBusy(false);
  };

  if (!integration) {
    return (
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-10">
        <Link href={`${ADMIN_BASE}/integrations`} className="text-sm font-bold text-sky-800 underline">
          ← Integrations
        </Link>
        {loadFailed ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">{message || "Failed to load"}</p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                void load();
              }}
              className="mt-2 min-h-10 rounded-lg border border-red-300 bg-white px-4 text-sm font-bold"
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-10">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`${ADMIN_BASE}/integrations`} className="text-sm font-bold text-sky-800 underline">
          ← Integrations
        </Link>
        <h1 className="text-2xl font-extrabold text-[#0b1f4b]">{integration.name}</h1>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{integration.status}</span>
      </div>

      {message ? (
        <p className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">{message}</p>
      ) : null}
      {apiKeyOnce ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm">
          <p className="font-extrabold">New API key (copy once)</p>
          <code className="mt-1 block break-all font-mono text-xs">{apiKeyOnce}</code>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(["credentials", "mappings", "logs"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              tab === id ? "bg-[#0b1f4b] text-white" : "border bg-white text-slate-600",
            )}
          >
            {id === "credentials" ? "Credentials" : id === "mappings" ? "Mappings" : "Sync logs"}
          </button>
        ))}
      </div>

      {tab === "credentials" ? (
        <section className="rounded-xl border bg-white p-5 shadow-sm">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">API key prefix</dt>
              <dd className="font-mono font-bold">{integration.apiKeyPrefix}…</dd>
            </div>
            <div>
              <dt className="text-slate-500">Partner</dt>
              <dd className="font-semibold">{integration.partnerName || integration.partnerId}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sync mode</dt>
              <dd className="font-semibold">{integration.syncMode}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Manual override</dt>
              <dd className="font-semibold">{integration.manualOverride ? "ON" : "Off"}</dd>
            </div>
          </dl>
          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Webhook base URL</span>
            <input
              className="w-full rounded-md border px-3 py-2 font-mono text-xs"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Status</span>
            <select
              className="rounded-md border px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["DRAFT", "TESTING", "LIVE", "DISABLED"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void save()}
            >
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border px-4 py-2 text-sm font-bold"
              onClick={() => void save({ rotateKey: true })}
            >
              Rotate API key
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border px-4 py-2 text-sm font-bold"
              onClick={() => void save({ manualOverride: !integration.manualOverride })}
            >
              {integration.manualOverride ? "Disable override" : "Enable manual override"}
            </button>
          </div>
        </section>
      ) : null}

      {tab === "mappings" ? (
        <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-extrabold text-[#0b1f4b]">Vehicles ({vehicles.length})</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {vehicles.map((m) => (
                  <li key={m.id} className="rounded border px-2 py-1">
                    <span className="font-mono">{m.externalId}</span> → {m.internalId}
                    <span className="ms-2 text-slate-500">{m.externalLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-extrabold text-[#0b1f4b]">Locations ({locations.length})</h3>
              <ul className="mt-2 space-y-1 text-xs">
                {locations.length === 0 ? (
                  <li className="text-slate-500">Map airport IATA codes via JSON below (kind: LOCATION).</li>
                ) : (
                  locations.map((m) => (
                    <li key={m.id} className="rounded border px-2 py-1">
                      <span className="font-mono">{m.externalId}</span> → {m.internalId}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Mappings JSON</span>
            <textarea
              className="h-56 w-full rounded-md border px-3 py-2 font-mono text-xs"
              value={mapDraft}
              onChange={(e) => setMapDraft(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            onClick={() => void saveMappings()}
          >
            Save mappings
          </button>
        </section>
      ) : null}

      {tab === "logs" ? (
        <section className="rounded-xl border bg-white p-3 shadow-sm md:p-0">
          <ResponsiveDataList
            desktop={
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3">When</th>
                      <th className="p-3">Event</th>
                      <th className="p-3">Dir</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">ms</th>
                      <th className="p-3">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No sync logs yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={log.id}
                          className={cn("border-t align-top", log.status === "ERROR" && "bg-red-50")}
                        >
                          <td className="p-3 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="p-3 font-semibold">{log.event}</td>
                          <td className="p-3">{log.direction}</td>
                          <td className="p-3 font-bold">{log.status}</td>
                          <td className="p-3">{log.latencyMs}</td>
                          <td className="max-w-md p-3 text-xs">
                            <div>{log.requestSummary}</div>
                            <div className="text-slate-500">{log.responseSummary}</div>
                            {log.errorMessage ? (
                              <div className="font-semibold text-red-700">{log.errorMessage}</div>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            }
            mobile={
              logs.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                  No sync logs yet.
                </p>
              ) : (
                logs.map((log) => (
                  <MobileDataCard
                    key={log.id}
                    className={cn(log.status === "ERROR" && "border-red-200 bg-red-50")}
                  >
                    <MobileDataRow label="When">
                      <span className="text-xs font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </MobileDataRow>
                    <MobileDataRow label="Event">{log.event}</MobileDataRow>
                    <MobileDataRow label="Dir">{log.direction}</MobileDataRow>
                    <MobileDataRow label="Status">{log.status}</MobileDataRow>
                    <MobileDataRow label="ms">{log.latencyMs}</MobileDataRow>
                    <MobileDataRow label="Detail" className="!items-stretch">
                      <div className="space-y-1 text-start text-xs font-medium">
                        <div>{log.requestSummary}</div>
                        <div className="text-slate-500">{log.responseSummary}</div>
                        {log.errorMessage ? (
                          <div className="font-semibold text-red-700">{log.errorMessage}</div>
                        ) : null}
                      </div>
                    </MobileDataRow>
                  </MobileDataCard>
                ))
              )
            }
          />
        </section>
      ) : null}
    </div>
  );
}
