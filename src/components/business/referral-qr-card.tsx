"use client";

import { buildReferralAbsoluteUrl } from "@/lib/business-partner/codes";
import { cn } from "@/lib/utils";

export function ReferralQrCard({
  code,
  referralUrl,
  title,
  hint,
  className = "",
  compact = false,
}: {
  code: string;
  referralUrl?: string;
  title?: string;
  hint?: string;
  className?: string;
  /** Image only — hide code/url under the QR (when shown beside the label). */
  compact?: boolean;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://rentairportcars.com";
  const url = referralUrl || buildReferralAbsoluteUrl(origin, code);
  const size = compact ? 120 : 240;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(url)}`;

  return (
    <div
      className={`rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center ${className}`}
    >
      {title ? <p className="text-base font-extrabold text-[#0b1f4b]">{title}</p> : null}
      {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt={`QR code for ${code}`}
        width={size}
        height={size}
        className={cn(
          "mx-auto rounded-lg bg-white p-2 shadow-sm",
          compact ? "mt-0" : "mt-4",
        )}
      />
      {compact ? null : (
        <>
          <p className="mt-3 font-mono text-lg font-bold tracking-wide text-[#0b1f4b]">{code}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block break-all text-xs font-semibold text-sky-700 hover:underline"
          >
            {url}
          </a>
        </>
      )}
    </div>
  );
}
