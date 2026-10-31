"use client";

import { useState } from "react";
import type { FooterContactConfig } from "@/lib/catalog/footer-contact";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type Props = {
  initial: FooterContactConfig;
};

export function FooterContactManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const s = dictionary.sections;
  const c = dictionary.common;
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [inboxEmail, setInboxEmail] = useState(initial.inboxEmail || initial.email);
  const [address, setAddress] = useState(initial.address);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/footer-contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, inboxEmail, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      setPhone(String(data.phone || ""));
      setEmail(String(data.email || ""));
      setInboxEmail(String(data.inboxEmail || ""));
      setAddress(String(data.address || ""));
      setMessage(s.footerContactSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.footerContact}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.footerContactHelp}</p>
      </div>

      <label className="block text-[11px] font-semibold text-slate-700">
        {s.footerPhone}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          placeholder="+995 …"
          value={phone}
          disabled={busy}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <label className="block text-[11px] font-semibold text-slate-700">
        {s.footerEmail}
        <input
          type="email"
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          placeholder="info@…"
          value={email}
          disabled={busy}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block text-[11px] font-semibold text-slate-700">
        {s.footerInboxEmail}
        <input
          type="email"
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          placeholder="support@…"
          value={inboxEmail}
          disabled={busy}
          onChange={(e) => setInboxEmail(e.target.value)}
        />
        <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{s.footerInboxEmailHelp}</span>
      </label>

      <label className="block text-[11px] font-semibold text-slate-700">
        {s.footerAddress}
        <input
          className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
          placeholder={s.footerAddressPh}
          value={address}
          disabled={busy}
          onChange={(e) => setAddress(e.target.value)}
        />
      </label>

      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
      >
        {busy ? c.saving : c.save}
      </button>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
