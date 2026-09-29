"use client";

import { CheckCircle2 } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";

export function BookingSuccessBanner({ bookingRef }: { bookingRef?: string | null }) {
  const { dictionary } = usePreferences();
  const t = dictionary.booking;

  return (
    <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-950 shadow-sm">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
        <div>
          <p className="text-lg font-extrabold">{t.successTitle}</p>
          <p className="mt-1 text-sm font-medium text-emerald-900/90">{t.successBody}</p>
          {bookingRef ? (
            <p className="mt-2 text-sm font-semibold">
              {t.successRef}: <span className="font-mono">{bookingRef}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
