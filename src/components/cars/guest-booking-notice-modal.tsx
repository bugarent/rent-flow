"use client";

import { Mail, Hash, Bookmark } from "lucide-react";

export function GuestBookingNoticeModal({
  open,
  title,
  body,
  remember,
  continueLabel,
  emailLabel,
  bookingNumberLabel,
  email,
  bookingReference,
  onContinue,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  remember: string;
  continueLabel: string;
  emailLabel: string;
  bookingNumberLabel: string;
  email: string;
  bookingReference: string;
  onContinue: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const mail = email.trim() || "—";
  const ref = bookingReference.trim();
  if (!ref) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div aria-hidden className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <div
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
          <p className="flex items-center gap-2 text-base font-extrabold text-[#0b1f4b]">
            <Bookmark className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            {title}
          </p>
        </div>
        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-700">{body}</p>

          <div className="overflow-hidden rounded-2xl border-2 border-[#1d6fe8] bg-gradient-to-br from-[#eef5ff] via-white to-[#fff7e8] shadow-[0_0_0_4px_rgba(29,111,232,0.12)]">
            <div className="border-b border-[#1d6fe8]/20 px-4 py-3.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1d6fe8]">
                {emailLabel}
              </p>
              <p className="flex items-start gap-2 break-all text-base font-extrabold text-[#0b1f4b]">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fe8]" aria-hidden />
                <span>{mail}</span>
              </p>
            </div>
            <div className="px-4 py-3.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                {bookingNumberLabel}
              </p>
              <p className="flex items-center gap-2 font-mono text-2xl font-black tracking-wide text-[#0b1f4b]">
                <Hash className="h-6 w-6 shrink-0 text-amber-600" aria-hidden />
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-950 ring-1 ring-amber-300">
                  {ref}
                </span>
              </p>
            </div>
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-extrabold text-amber-950">
            {remember}
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-xl bg-[#1d6fe8] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#1a64d4]"
          >
            {continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
