"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PartnerIntegrationRecord } from "@/lib/integrations/types";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

type PartnerOption = { id: string; label: string };

export function IntegrationsManager({
  initialIntegrations,
  partnerOptions,
}: {
  initialIntegrations: PartnerIntegrationRecord[];
  partnerOptions: PartnerOption[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialIntegrations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [apiKeyOnce, setApiKeyOnce] = useState("");
  const [partnerId, setPartnerId] = useState(partnerOptions[0]?.id || "local-partner");
  const [name, setName] = useState("Channel connection");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setRows(initialIntegrations);
  }, [initialIntegrations]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/integrations");
    const data = await res.json();
    if (res.ok) setRows(data.integrations || []);
    router.refresh();
  }, [router]);

  const create = async () => {
    setCreating(true);
    setMessage("");
    setApiKeyOnce("");
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          name,
          webhookUrl: webhookUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setApiKeyOnce(data.apiKey || "");
      setMessage(data.message || "Created");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const run = async (id: string, path: string, body?: unknown) => {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/integrations/${id}${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Request failed");
      setMessage(data.message || JSON.stringify(data.steps || data));
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusyId(null);
    }
  };

  const toggleOverride = async (row: PartnerIntegrationRecord) => {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/integrations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualOverride: !row.manualOverride }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`${ADMIN_BASE}/integrations/sandbox`}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
        >
          Open sandbox simulator
        </Link>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
          {message}
        </p>
      ) : null}
      {apiKeyOnce ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-extrabold">API key (copy now — shown once)</p>
          <code className="mt-2 block break-all rounded bg-white px-2 py-2 font-mono text-xs">{apiKeyOnce}</code>
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-extrabold text-[#0b1f4b]">Create connection</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Partner</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-slate-600">Partner webhook base URL (optional)</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder="https://partner.example.com/api/rac"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={creating || !partnerId || !name.trim()}
          onClick={() => void create()}
          className="mt-4 rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {creating ? "Creating…" : "Generate API key & connection"}
        </button>
      </section>

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Partner</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Key</th>
                  <th className="p-3">Last test / sync</th>
                  <th className="p-3">Override</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No integrations yet. Create one or run the sandbox.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t align-top">
                      <td className="p-3">
                        <Link
                          href={`${ADMIN_BASE}/integrations/${row.id}`}
                          className="font-bold text-sky-800 hover:underline"
                        >
                          {row.name}
                        </Link>
                        {row.isSandbox ? (
                          <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                            SANDBOX
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 text-xs">
                        <div className="font-semibold">{row.partnerName || row.partnerId}</div>
                        <div className="text-slate-500">{row.syncMode}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs font-bold",
                            row.status === "LIVE"
                              ? "bg-emerald-100 text-emerald-900"
                              : row.status === "TESTING"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">{row.apiKeyPrefix}…</td>
                      <td className="p-3 text-xs text-slate-600">
                        <div>
                          Test:{" "}
                          {row.lastTestAt
                            ? `${row.lastTestOk ? "OK" : "FAIL"} · ${new Date(row.lastTestAt).toLocaleString()}`
                            : "—"}
                        </div>
                        <div>Sync: {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : "—"}</div>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void toggleOverride(row)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-bold",
                            row.manualOverride
                              ? "bg-orange-500 text-white"
                              : "border border-slate-300 bg-white text-slate-700",
                          )}
                        >
                          {row.manualOverride ? "ON" : "Off"}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="rounded border px-2 py-1 text-xs font-bold"
                            onClick={() => void run(row.id, "/test")}
                          >
                            Test
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            className="rounded border px-2 py-1 text-xs font-bold"
                            onClick={() => void run(row.id, "/sync", { mode: "both" })}
                          >
                            Sync
                          </button>
                          <Link
                            href={`${ADMIN_BASE}/integrations/${row.id}`}
                            className="rounded border px-2 py-1 text-xs font-bold"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          rows.length === 0 ? (
            <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              No integrations yet. Create one or run the sandbox.
            </p>
          ) : (
            rows.map((row) => (
              <MobileDataCard key={row.id}>
                <MobileDataRow label="Name">
                  <div className="text-end">
                    <Link
                      href={`${ADMIN_BASE}/integrations/${row.id}`}
                      className="font-bold text-sky-800 hover:underline"
                    >
                      {row.name}
                    </Link>
                    {row.isSandbox ? (
                      <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                        SANDBOX
                      </span>
                    ) : null}
                  </div>
                </MobileDataRow>
                <MobileDataRow label="Partner">
                  <div className="text-end text-xs">
                    <div className="font-semibold">{row.partnerName || row.partnerId}</div>
                    <div className="font-medium text-slate-500">{row.syncMode}</div>
                  </div>
                </MobileDataRow>
                <MobileDataRow label="Status">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-bold",
                      row.status === "LIVE"
                        ? "bg-emerald-100 text-emerald-900"
                        : row.status === "TESTING"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {row.status}
                  </span>
                </MobileDataRow>
                <MobileDataRow label="Key">
                  <span className="font-mono text-[11px]">{row.apiKeyPrefix}…</span>
                </MobileDataRow>
                <MobileDataRow label="Last test / sync">
                  <div className="text-end text-xs text-slate-600">
                    <div>
                      Test:{" "}
                      {row.lastTestAt
                        ? `${row.lastTestOk ? "OK" : "FAIL"} · ${new Date(row.lastTestAt).toLocaleString()}`
                        : "—"}
                    </div>
                    <div>Sync: {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : "—"}</div>
                  </div>
                </MobileDataRow>
                <MobileDataRow label="Override">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void toggleOverride(row)}
                    className={cn(
                      "min-h-11 rounded-full px-3 text-xs font-bold",
                      row.manualOverride
                        ? "bg-orange-500 text-white"
                        : "border border-slate-300 bg-white text-slate-700",
                    )}
                  >
                    {row.manualOverride ? "ON" : "Off"}
                  </button>
                </MobileDataRow>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    className="min-h-11 flex-1 rounded border px-3 text-xs font-bold"
                    onClick={() => void run(row.id, "/test")}
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    className="min-h-11 flex-1 rounded border px-3 text-xs font-bold"
                    onClick={() => void run(row.id, "/sync", { mode: "both" })}
                  >
                    Sync
                  </button>
                  <Link
                    href={`${ADMIN_BASE}/integrations/${row.id}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded border px-3 text-xs font-bold"
                  >
                    Details
                  </Link>
                </div>
              </MobileDataCard>
            ))
          )
        }
      />
    </div>
  );
}
