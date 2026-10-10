"use client";

import { useState } from "react";

export function CopyButton({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="min-h-10 shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50 sm:min-h-0 sm:px-2.5 sm:py-1.5"
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
  );
}
