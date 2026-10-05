"use client";

import { useState } from "react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

export function BookingMailManager({
  initialFromEmail,
  initialSmtpHost,
  initialSmtpPort,
  initialSmtpUser,
  smtpPassSet,
}: {
  initialFromEmail: string;
  initialSmtpHost: string;
  initialSmtpPort: number;
  initialSmtpUser: string;
  smtpPassSet: boolean;
}) {
  const { dictionary } = useAdminLocale();
  const c = dictionary.common;
  const s = dictionary.sections;
  const [fromEmail, setFromEmail] = useState(initialFromEmail);
  const [smtpHost, setSmtpHost] = useState(initialSmtpHost);
  const [smtpPort, setSmtpPort] = useState(String(initialSmtpPort || 587));
  const [smtpUser, setSmtpUser] = useState(initialSmtpUser);
  const [smtpPass, setSmtpPass] = useState("");
  const [passSet, setPassSet] = useState(smtpPassSet);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/booking-mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromEmail: fromEmail.trim(),
          smtpHost: smtpHost.trim(),
          smtpPort: Number(smtpPort) || 587,
          smtpUser: smtpUser.trim(),
          smtpPass,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        fromEmail?: string;
        smtpHost?: string;
        smtpPort?: number;
        smtpUser?: string;
        smtpPassSet?: boolean;
      };
      if (!res.ok) throw new Error(data.error || c.failed);
      setFromEmail(data.fromEmail || fromEmail.trim());
      setSmtpHost(data.smtpHost || "");
      setSmtpPort(String(data.smtpPort || 587));
      setSmtpUser(data.smtpUser || "");
      setSmtpPass("");
      setPassSet(Boolean(data.smtpPassSet));
      setMessage(s.bookingMailSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.bookingMailTitle}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.bookingMailHelp}</p>
      </div>
      <label className="block text-xs font-semibold text-slate-600">
        {s.bookingMailLabel}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="mt-1 h-11 w-full rounded-lg border px-3 text-base font-normal text-slate-900"
          value={fromEmail}
          disabled={busy}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder={s.bookingMailPh}
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600">
        {s.bookingSmtpHost}
        <input
          type="text"
          autoComplete="off"
          className="mt-1 h-11 w-full rounded-lg border px-3 text-base font-normal text-slate-900"
          value={smtpHost}
          disabled={busy}
          onChange={(e) => setSmtpHost(e.target.value)}
          placeholder="smtp.gmail.com"
        />
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr]">
        <label className="block min-w-0 text-xs font-semibold text-slate-600">
          {s.bookingSmtpPort}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={65535}
            className="mt-1 h-11 w-full rounded-lg border px-3 text-base font-normal text-slate-900"
            value={smtpPort}
            disabled={busy}
            onChange={(e) => setSmtpPort(e.target.value)}
          />
        </label>
        <label className="block min-w-0 text-xs font-semibold text-slate-600">
          {s.bookingSmtpUser}
          <input
            type="text"
            autoComplete="username"
            className="mt-1 h-11 w-full rounded-lg border px-3 text-base font-normal text-slate-900"
            value={smtpUser}
            disabled={busy}
            onChange={(e) => setSmtpUser(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">
        {s.bookingSmtpPass}
        <input
          type="password"
          autoComplete="new-password"
          className="mt-1 h-11 w-full rounded-lg border px-3 text-base font-normal text-slate-900"
          value={smtpPass}
          disabled={busy}
          onChange={(e) => setSmtpPass(e.target.value)}
          placeholder={passSet ? s.bookingSmtpPassKeep : ""}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="min-h-11 rounded-lg bg-[#0b1f4b] px-4 text-sm font-bold text-white disabled:bg-slate-400"
      >
        {busy ? c.saving : c.save}
      </button>
      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
