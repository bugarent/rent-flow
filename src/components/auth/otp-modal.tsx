"use client";

import { useRef } from "react";
import { OTP_LENGTH } from "@/lib/brand";
import { usePreferences } from "@/components/providers/preferences-context";

export function OtpModal({
  open,
  onClose,
  onVerify,
  loading,
  error,
  hint,
}: {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => void;
  loading: boolean;
  error?: string;
  hint?: string;
}) {
  const { dictionary } = usePreferences();
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  if (!open) return null;

  const collect = () => refs.current.map((el) => el?.value ?? "").join("");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <h2 className="text-xl font-bold">{dictionary.auth.otpTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">{dictionary.auth.otpHint}</p>
        {hint ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Dev code: <span className="font-mono font-bold">{hint}</span>
          </p>
        ) : null}
        <div className="mt-5 flex justify-center gap-2" dir="ltr">
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-10 rounded-xl border border-slate-300 text-center text-lg font-bold"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(-1);
                e.target.value = v;
                if (v && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !e.currentTarget.value && i > 0) {
                  refs.current[i - 1]?.focus();
                }
              }}
            />
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-3 font-semibold">
            {dictionary.home.close}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onVerify(collect())}
            className="flex-1 rounded-xl bg-sky-600 py-3 font-bold text-white disabled:bg-slate-400"
          >
            {dictionary.auth.verify}
          </button>
        </div>
      </div>
    </div>
  );
}
