"use client";

import { useCallback, useState } from "react";
import type { PartnerIntegrationRecord } from "@/lib/integrations/types";
import { requestJson } from "@/lib/http/request-json";

export type IntegrationNotice = { ok: boolean; text: string };
export type IntegrationBusy = { id: string; action: "test" | "sync" | "override" } | null;

export function useIntegrationActions(initialIntegrations: PartnerIntegrationRecord[]) {
  const [rows, setRows] = useState(initialIntegrations);
  const [busy, setBusy] = useState<IntegrationBusy>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<IntegrationNotice | null>(null);
  const [rowNotices, setRowNotices] = useState<Record<string, IntegrationNotice>>({});
  const [apiKeyOnce, setApiKeyOnce] = useState("");

  const setRowNotice = (id: string, value: IntegrationNotice) =>
    setRowNotices((prev) => ({ ...prev, [id]: value }));

  const reloadRows = useCallback(async () => {
    const res = await requestJson<{ integrations?: PartnerIntegrationRecord[] }>(
      "/api/admin/integrations",
    );
    if (res.ok && Array.isArray(res.data?.integrations)) setRows(res.data.integrations);
    return res;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await reloadRows();
    setNotice(
      res.ok
        ? { ok: true, text: `List updated · ${new Date().toLocaleTimeString()}` }
        : { ok: false, text: res.error },
    );
    setRefreshing(false);
  }, [reloadRows]);

  const create = async (input: { partnerId: string; name: string; webhookUrl: string }) => {
    setCreating(true);
    setNotice(null);
    setApiKeyOnce("");
    const res = await requestJson<{
      integration?: PartnerIntegrationRecord;
      apiKey?: string;
      message?: string;
    }>("/api/admin/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: input.partnerId,
        name: input.name.trim(),
        webhookUrl: input.webhookUrl.trim() || null,
      }),
    });
    if (res.ok && res.data?.integration) {
      const created = res.data.integration;
      setRows((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      setApiKeyOnce(res.data.apiKey || "");
      setNotice({ ok: true, text: res.data.message || "Connection created" });
    } else {
      setNotice({ ok: false, text: res.error || "Create failed" });
    }
    setCreating(false);
  };

  const run = async (row: PartnerIntegrationRecord, action: "test" | "sync") => {
    if (!row.webhookUrl && !row.isSandbox) {
      setRowNotice(row.id, {
        ok: false,
        text: "Add the partner webhook URL in Details first.",
      });
      return;
    }
    setBusy({ id: row.id, action });
    const res = await requestJson<{ message?: string }>(
      `/api/admin/integrations/${encodeURIComponent(row.id)}/${action}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "sync" ? JSON.stringify({ mode: "both" }) : undefined,
        timeoutMs: 60_000,
      },
    );
    setRowNotice(row.id, {
      ok: res.ok,
      text: res.data?.message || res.error || (res.ok ? "Done" : "Request failed"),
    });
    await reloadRows();
    setBusy(null);
  };

  const toggleOverride = async (row: PartnerIntegrationRecord) => {
    setBusy({ id: row.id, action: "override" });
    const res = await requestJson<{ integration?: PartnerIntegrationRecord }>(
      `/api/admin/integrations/${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualOverride: !row.manualOverride }),
      },
    );
    const updated = res.data?.integration;
    if (res.ok && updated) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      setRowNotice(row.id, {
        ok: true,
        text: updated.manualOverride ? "Manual override ON — auto-sync paused" : "Manual override OFF",
      });
    } else {
      setRowNotice(row.id, { ok: false, text: res.error || "Update failed" });
    }
    setBusy(null);
  };

  return {
    rows,
    busy,
    refreshing,
    creating,
    notice,
    rowNotices,
    apiKeyOnce,
    refresh,
    create,
    run,
    toggleOverride,
  };
}
