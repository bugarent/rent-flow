"use client";

import { useEffect, useState } from "react";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import {
  fetchPartnerChromeSettings,
  subscribePartnerChromeSettings,
} from "@/components/partner/partner-chrome-settings";
import { cn } from "@/lib/utils";

/** Yellow remodeation notice for partner cabinet chrome (keeps green accent strip above). */
export function PartnerRemoderationBanner({ className }: { className?: string }) {
  const { dictionary } = usePartnerLocale();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = (force = false) => {
      void fetchPartnerChromeSettings(force).then((data) => {
        if (!cancelled) setPending(data.pendingRemoderation);
      });
    };
    load();
    const unsubscribe = subscribePartnerChromeSettings((next) => {
      if (!cancelled) setPending(next.pendingRemoderation);
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") load(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!pending) return null;

  return (
    <div className={cn("border-b border-amber-400 bg-amber-300/95 text-amber-950", className)} role="status">
      <div className="h-1 w-full bg-[#28a745]" aria-hidden />
      <p className="px-3 py-2 text-center text-xs font-bold sm:text-sm">
        {dictionary.personalInfo.remodeation}
      </p>
    </div>
  );
}
