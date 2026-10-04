"use client";

import { useState } from "react";
import Link from "next/link";
import { ADMIN_BASE } from "@/lib/routes";
import { requestJson } from "@/lib/http/request-json";

export function IntegrationSandboxPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    ok?: boolean;
    message?: string;
    steps?: string[];
    integrationId?: string;
    apiKey?: string;
    mockWebhookBase?: string;
    error?: string;
  } | null>(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    const res = await requestJson<NonNullable<typeof result>>("/api/admin/integrations/sandbox/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleCount: 3 }),
      timeoutMs: 90_000,
    });
    setResult(res.data ?? { error: res.error || "Sandbox failed" });
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Seeds an in-memory mock partner fleet, points a sandbox integration at{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">/api/integrations/sandbox/mock</code>, then runs
        Test Connection → pull fleet → pull availability → booking lock.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {busy ? "Running cycle…" : "Run full sandbox cycle"}
      </button>

      {result ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className={`font-extrabold ${result.ok ? "text-emerald-800" : "text-red-800"}`}>
            {result.ok ? "Cycle OK" : "Cycle finished with errors"}
          </p>
          {result.message ? <p className="mt-2 text-sm">{result.message}</p> : null}
          {result.error ? <p className="mt-2 text-sm text-red-700">{result.error}</p> : null}
          {result.steps?.length ? (
            <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : null}
          {result.mockWebhookBase ? (
            <p className="mt-3 font-mono text-xs text-slate-600">Mock base: {result.mockWebhookBase}</p>
          ) : null}
          {result.apiKey ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-bold">Sandbox API key (once)</p>
              <code className="mt-1 block break-all text-xs">{result.apiKey}</code>
            </div>
          ) : null}
          {result.integrationId ? (
            <Link
              href={`${ADMIN_BASE}/integrations/${result.integrationId}`}
              className="mt-4 inline-block text-sm font-bold text-sky-800 underline"
            >
              Open integration detail & sync logs →
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
