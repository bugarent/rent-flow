"use client";

import { useMemo, useState } from "react";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import { getBusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";
import { businessToolLine } from "@/lib/i18n/business-tool-copy";
import {
  buildReferralAbsoluteUrl,
  buildReferralDeepUrl,
  buildReferralEmbedHtml,
  buildReferralEmbedScript,
  normalizeReferralCode,
} from "@/lib/business-partner/codes";
import { ReferralQrCard } from "@/components/business/referral-qr-card";
import { cn } from "@/lib/utils";

type MethodId = "link" | "deep" | "js" | "api";

function CopyBlock({
  label,
  value,
  copiedLabel,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-[#0b1f4b] hover:bg-slate-50"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              /* ignore */
            }
          }}
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}

export function BusinessPartnerIntegrationTools({
  code,
  referralUrl,
}: {
  code: string;
  referralUrl?: string;
}) {
  const { locale } = useBusinessPartnerPreferences();
  const t = useMemo(() => getBusinessPartnershipCopy(locale), [locale]);
  const [method, setMethod] = useState<MethodId>("link");
  const [airport, setAirport] = useState("TBS");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://rentairportcars.com";
  const normalized = normalizeReferralCode(code);
  const simpleUrl = referralUrl || buildReferralAbsoluteUrl(origin, normalized);
  const deepUrl = buildReferralDeepUrl(origin, normalized, { airportIata: airport });
  const embedHtml = buildReferralEmbedHtml(origin, normalized);
  const embedJs = `<script>\n${buildReferralEmbedScript(origin, normalized)}\n</script>`;
  const apiHint = [
    businessToolLine(locale, "codeComment", normalized),
    businessToolLine(locale, "appendHint", normalized),
    `GET ${origin}/api/cars`,
    `GET ${origin}/?bp=${normalized}`,
    businessToolLine(locale, "promoHint"),
  ].join("\n");

  const copyLabel = businessToolLine(locale, "copy");
  const copiedLabel = businessToolLine(locale, "copied");
  const toolsTitle = businessToolLine(locale, "toolsTitle");
  const toolsBody = businessToolLine(locale, "toolsBody");

  const active = t.integrations.find((i) => i.id === method) || t.integrations[0]!;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {businessToolLine(locale, "yourCode")}
            </p>
            <p className="mt-1 font-mono text-xl font-extrabold tracking-wide text-[#0b1f4b]">
              {normalized}
            </p>
            <a
              href={simpleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all text-xs font-semibold text-sky-700 hover:underline"
            >
              {simpleUrl}
            </a>
          </div>
          <ReferralQrCard
            code={normalized}
            referralUrl={simpleUrl}
            compact
            className="!mt-0 max-w-[160px] shrink-0 !p-2"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#0b1f4b]">{toolsTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{toolsBody}</p>
        <p className="mt-4 text-sm font-extrabold text-[#0b1f4b]">{t.integrationTitle}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {t.integrations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMethod(item.id as MethodId)}
              className={cn(
                "rounded-md px-3 py-2 text-xs font-bold sm:text-sm",
                method === item.id
                  ? "bg-[#1d6fe8] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300",
              )}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
          <h3 className="text-base font-extrabold text-[#0b1f4b]">{active.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{active.body}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {active.points.map((point) => (
              <li
                key={point}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
              >
                {point}
              </li>
            ))}
          </ul>

          {method === "link" ? (
            <CopyBlock
              label={businessToolLine(locale, "partnerLink")}
              value={simpleUrl}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          ) : null}

          {method === "deep" ? (
            <div className="mt-3 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {businessToolLine(locale, "airportIata")}
                <input
                  value={airport}
                  onChange={(e) => setAirport(e.target.value.toUpperCase().slice(0, 3))}
                  className="mt-1 w-28 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-sm font-bold text-[#0b1f4b]"
                  placeholder="TBS"
                />
              </label>
              <CopyBlock
                label={businessToolLine(locale, "deepLink")}
                value={deepUrl}
                copyLabel={copyLabel}
                copiedLabel={copiedLabel}
              />
            </div>
          ) : null}

          {method === "js" ? (
            <CopyBlock
              label={businessToolLine(locale, "htmlEmbed")}
              value={embedHtml + "\n\n" + embedJs}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          ) : null}

          {method === "api" ? (
            <CopyBlock
              label={businessToolLine(locale, "apiUsage")}
              value={apiHint}
              copyLabel={copyLabel}
              copiedLabel={copiedLabel}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
