"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { PARTNER_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = {
  /** Compact top-of-portal warning; full card for Basic information / personal info. */
  variant?: "banner" | "card";
  className?: string;
};

const DEFAULT_BOT_URL = "https://t.me/rentairportcarsbot";

export function PartnerTelegramVerifyBanner({ variant = "banner", className }: Props) {
  const { locale, dictionary } = usePartnerLocale();
  const t = dictionary.telegram;
  /** null = still loading (banner only); card always paints after first paint */
  const [verified, setVerified] = useState<boolean | null>(variant === "card" ? false : null);
  const [username, setUsername] = useState<string | null>(null);
  const [botUrl, setBotUrl] = useState(DEFAULT_BOT_URL);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/partners/telegram/dashboard", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Card still shows; partner can try activate (will fail with auth)
        setVerified(false);
        setLoadError("");
        return;
      }
      if (!res.ok) {
        setVerified(false);
        setLoadError(typeof data.error === "string" ? data.error : t.statusUnavailable);
        return;
      }
      setVerified(Boolean(data.verified));
      setUsername(typeof data.telegramUsername === "string" ? data.telegramUsername : null);
      if (typeof data.botUrl === "string" && data.botUrl) setBotUrl(data.botUrl);
      setLoadError("");
    } catch {
      setVerified(false);
      setLoadError(t.statusUnavailable);
    }
  }, [t.statusUnavailable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (verified !== false) return;
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [verified, refresh]);

  const onActivate = async () => {
    setBusy(true);
    setLoadError("");
    try {
      const res = await fetch("/api/partners/telegram/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : t.activateFailed);
        setVerified(false);
        return;
      }
      if (data.verified) {
        setVerified(true);
        return;
      }
      const url = typeof data.botUrl === "string" && data.botUrl ? data.botUrl : botUrl;
      if (url) {
        setBotUrl(url);
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setVerified(false);
    } catch {
      setLoadError(t.activateFailed);
      setVerified(false);
    } finally {
      setBusy(false);
    }
  };

  // Banner: hide while loading or when already verified
  if (variant === "banner") {
    if (verified === null || verified === true) return null;
    return (
      <div className={cn("border-b border-red-300 bg-red-50", className)}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-medium text-red-900">{t.unverifiedBanner}</p>
          <Link
            href={`${PARTNER_BASE}/personal-info#partner-telegram-verify`}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
          >
            {t.verifyButton}
          </Link>
        </div>
      </div>
    );
  }

  // Card: compact single-row control on personal info
  if (verified) {
    return (
      <div
        id="partner-telegram-verify"
        className={cn(
          "inline-flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5",
          className,
        )}
      >
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#229ED9]" aria-hidden />
        <span className="truncate text-xs font-semibold text-emerald-900">
          {t.verifiedShort}
          {username ? ` · @${username.replace(/^@/, "")}` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      id="partner-telegram-verify"
      className={cn(
        "flex w-full max-w-full flex-wrap items-center gap-2 rounded-md border-2 border-red-500 bg-red-50 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.25)]",
        className,
      )}
    >
      <MessageCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
      <span className="text-xs font-bold text-red-900">{t.cardTitle}</span>
      <span className="text-[11px] font-semibold text-red-800">{t.activateRequired}</span>
      {loadError ? <span className="text-[10px] font-medium text-red-700">({loadError})</span> : null}
      <button
        type="button"
        onClick={() => void onActivate()}
        disabled={busy}
        className="rounded bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {busy ? "…" : t.verifyButton}
      </button>
      <button
        type="button"
        onClick={() => void onActivate()}
        disabled={busy}
        className="text-[11px] font-semibold text-red-800 underline hover:text-red-950 disabled:opacity-60"
      >
        {t.openBot}
      </button>
    </div>
  );
}
