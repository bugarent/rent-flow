"use client";

import { useState } from "react";
import Link from "next/link";
import { ADMIN_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PartnerIntegrationRecord } from "@/lib/integrations/types";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";
import {
  useIntegrationActions,
  type IntegrationBusy,
  type IntegrationNotice,
} from "@/components/admin/use-integration-actions";

type PartnerOption = { id: string; label: string };

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function NoticeText({ notice, className }: { notice?: IntegrationNotice; className?: string }) {
  if (!notice) return null;
  return (
    <p
      role="status"
      className={cn(
        "break-words text-xs font-semibold",
        notice.ok ? "text-emerald-700" : "text-red-700",
        className,
      )}
    >
      {notice.text}
    </p>
  );
}

function StatusBadge({ status }: { status: PartnerIntegrationRecord["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-bold",
        status === "LIVE"
          ? "bg-emerald-100 text-emerald-900"
          : status === "TESTING"
            ? "bg-amber-100 text-amber-900"
            : "bg-slate-100 text-slate-700",
      )}
    >
      {status}
    </span>
  );
}

function LastRun({ row }: { row: PartnerIntegrationRecord }) {
  return (
    <>
      <div>
        Test:{" "}
        {row.lastTestAt
          ? `${row.lastTestOk ? "OK" : "FAIL"} · ${new Date(row.lastTestAt).toLocaleString()}`
          : "—"}
      </div>
      <div>Sync: {row.lastSyncAt ? new Date(row.lastSyncAt).toLocaleString() : "—"}</div>
    </>
  );
}

function OverrideButton({
  row,
  busy,
  onToggle,
  className,
}: {
  row: PartnerIntegrationRecord;
  busy: IntegrationBusy;
  onToggle: () => void;
  className?: string;
}) {
  const loading = busy?.id === row.id && busy.action === "override";
  return (
    <button
      type="button"
      disabled={busy?.id === row.id}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-60",
        row.manualOverride
          ? "bg-orange-500 text-white"
          : "border border-slate-300 bg-white text-slate-700",
        className,
      )}
    >
      {loading ? <Spinner /> : null}
      {row.manualOverride ? "ON" : "Off"}
    </button>
  );
}

function RowActions({
  row,
  busy,
  onRun,
  onDelete,
  compact,
}: {
  row: PartnerIntegrationRecord;
  busy: IntegrationBusy;
  onRun: (action: "test" | "sync") => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const deleting = busy?.id === row.id && busy.action === "delete";
  const rowBusy = busy?.id === row.id;
  const btn = compact
    ? "inline-flex items-center justify-center gap-1.5 rounded border bg-white px-2 py-1 text-xs font-bold hover:bg-slate-50 disabled:opacity-60"
    : "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded border bg-white px-3 text-xs font-bold disabled:opacity-60";
  return (
    <>
      <button type="button" disabled={rowBusy} className={btn} onClick={() => onRun("test")}>
        {rowBusy && busy?.action === "test" ? <Spinner /> : null}
        {rowBusy && busy?.action === "test" ? "Testing…" : "Test"}
      </button>
      <button type="button" disabled={rowBusy} className={btn} onClick={() => onRun("sync")}>
        {rowBusy && busy?.action === "sync" ? <Spinner /> : null}
        {rowBusy && busy?.action === "sync" ? "Syncing…" : "Sync"}
      </button>
      <Link href={`${ADMIN_BASE}/integrations/${row.id}`} className={btn}>
        Details
      </Link>
      <button
        type="button"
        disabled={rowBusy}
        onClick={onDelete}
        className={cn(btn, "border-red-200 bg-red-50 text-red-700 hover:bg-red-100", !compact && "basis-full")}
      >
        {deleting ? <Spinner /> : null}
        {deleting ? "Deleting…" : "Delete"}
      </button>
    </>
  );
}

export function IntegrationsManager({
  initialIntegrations,
  partnerOptions,
}: {
  initialIntegrations: PartnerIntegrationRecord[];
  partnerOptions: PartnerOption[];
}) {
  const {
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
    remove,
  } = useIntegrationActions(initialIntegrations);
  const [partnerId, setPartnerId] = useState(partnerOptions[0]?.id || "local-partner");
  const [name, setName] = useState("Channel connection");
  const [webhookUrl, setWebhookUrl] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`${ADMIN_BASE}/integrations/sandbox`}
          className="inline-flex min-h-10 items-center rounded-lg bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600"
        >
          Open sandbox simulator
        </Link>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void refresh()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          {refreshing ? <Spinner /> : null}
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {notice ? (
        <p
          role="status"
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-semibold",
            notice.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800",
          )}
        >
          {notice.text}
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm"
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-base sm:text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold text-slate-600">Partner webhook base URL (optional)</span>
            <input
              type="url"
              inputMode="url"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-base sm:text-xs"
              placeholder="https://partner.example.com/api/rac"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={creating || !partnerId || !name.trim()}
          onClick={() => void create({ partnerId, name, webhookUrl })}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0b1f4b] px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          {creating ? <Spinner /> : null}
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
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="p-3 font-mono text-[11px]">{row.apiKeyPrefix}…</td>
                      <td className="p-3 text-xs text-slate-600">
                        <LastRun row={row} />
                      </td>
                      <td className="p-3">
                        <OverrideButton row={row} busy={busy} onToggle={() => void toggleOverride(row)} />
                      </td>
                      <td className="max-w-[16rem] p-3">
                        <div className="flex flex-wrap gap-1">
                          <RowActions
                            row={row}
                            busy={busy}
                            onRun={(a) => void run(row, a)}
                            onDelete={() => void remove(row)}
                            compact
                          />
                        </div>
                        <NoticeText notice={rowNotices[row.id]} className="mt-1.5" />
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
                  <StatusBadge status={row.status} />
                </MobileDataRow>
                <MobileDataRow label="Key">
                  <span className="font-mono text-[11px]">{row.apiKeyPrefix}…</span>
                </MobileDataRow>
                <MobileDataRow label="Last test / sync">
                  <div className="text-end text-xs text-slate-600">
                    <LastRun row={row} />
                  </div>
                </MobileDataRow>
                <MobileDataRow label="Override">
                  <OverrideButton
                    row={row}
                    busy={busy}
                    onToggle={() => void toggleOverride(row)}
                    className="min-h-11"
                  />
                </MobileDataRow>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <RowActions
                    row={row}
                    busy={busy}
                    onRun={(a) => void run(row, a)}
                    onDelete={() => void remove(row)}
                  />
                </div>
                <NoticeText notice={rowNotices[row.id]} className="mt-2" />
              </MobileDataCard>
            ))
          )
        }
      />
    </div>
  );
}
