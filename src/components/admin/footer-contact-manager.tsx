"use client";

import { useState } from "react";
import {
  DEFAULT_FOOTER_PAYMENT_BADGES,
  FOOTER_PAYMENT_BADGES,
  FOOTER_PAYMENT_BADGE_LABELS,
  FOOTER_SOCIAL_LABELS,
  FOOTER_SOCIAL_NETWORKS,
  type FooterContactConfig,
  type FooterPaymentBadge,
  type FooterSocialLinks,
} from "@/lib/catalog/footer-contact";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";

type Props = {
  initial: FooterContactConfig;
};

export function FooterContactManager({ initial }: Props) {
  const { dictionary, locale } = useAdminLocale();
  const s = dictionary.sections;
  const c = dictionary.common;
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [inboxEmail, setInboxEmail] = useState(initial.inboxEmail || initial.email);
  const [address, setAddress] = useState(initial.address);
  const [badges, setBadges] = useState<FooterPaymentBadge[]>(
    initial.paymentBadges ?? DEFAULT_FOOTER_PAYMENT_BADGES,
  );
  const [social, setSocial] = useState<FooterSocialLinks>(initial.socialLinks ?? {});
  const toggleBadge = (id: FooterPaymentBadge) =>
    setBadges((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
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
        body: JSON.stringify({ phone, email, inboxEmail, address, paymentBadges: badges, socialLinks: social }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      setPhone(String(data.phone || ""));
      setEmail(String(data.email || ""));
      setInboxEmail(String(data.inboxEmail || ""));
      setAddress(String(data.address || ""));
      if (Array.isArray(data.paymentBadges)) setBadges(data.paymentBadges);
      if (data.socialLinks && typeof data.socialLinks === "object") setSocial(data.socialLinks);
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

      <fieldset className="space-y-1.5">
        <legend className="text-[11px] font-semibold text-slate-700">
          {uiText(locale, "Payment logos in the footer", "გადახდის ლოგოები ფუთერში", "Логотипы оплаты в футере")}
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {FOOTER_PAYMENT_BADGES.map((id) => {
            const on = badges.includes(id);
            return (
              <label
                key={id}
                className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold ${
                  on ? "border-[#0b1f4b] bg-[#0b1f4b] text-white" : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={busy}
                  onChange={() => toggleBadge(id)}
                />
                {FOOTER_PAYMENT_BADGE_LABELS[id]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-[11px] font-semibold text-slate-700">
          {uiText(
            locale,
            "Social links (empty = hidden)",
            "სოციალური ქსელების ბმულები (ცარიელი = არ ჩანს)",
            "Соцсети (пусто = скрыто)",
          )}
        </legend>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {FOOTER_SOCIAL_NETWORKS.map((network) => (
            <label key={network} className="block text-[11px] font-semibold text-slate-600">
              {FOOTER_SOCIAL_LABELS[network]}
              <input
                type="url"
                inputMode="url"
                className="mt-0.5 w-full rounded-lg border p-2 text-base font-normal sm:text-xs"
                placeholder="https://…"
                value={social[network] ?? ""}
                disabled={busy}
                onChange={(e) => setSocial((prev) => ({ ...prev, [network]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </fieldset>

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
