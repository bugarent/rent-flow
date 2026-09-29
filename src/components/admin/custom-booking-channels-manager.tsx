"use client";

import { useEffect, useState } from "react";
import type {
  CustomBookingChannel,
  CustomBookingChannelKey,
  CustomBookingChannelsConfig,
} from "@/lib/catalog/custom-booking-channels";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

type Props = {
  initial: CustomBookingChannelsConfig;
};

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <span className="text-[11px] font-semibold text-slate-800">{label}</span>
      <span className="relative inline-flex h-6 w-10 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-[#22c55e] peer-disabled:opacity-50" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

const BORDERS: Record<CustomBookingChannelKey, string> = {
  online: "border-[#22c55e]/40",
  telegram: "border-[#229ED9]/40",
  whatsapp: "border-[#25D366]/40",
  viber: "border-[#7360F2]/40",
};

export function CustomBookingChannelsManager({ initial }: Props) {
  const { dictionary } = useAdminLocale();
  const c = dictionary.common;
  const s = dictionary.sections;
  const labels: Record<CustomBookingChannelKey, string> = {
    online: s.channelOnline,
    telegram: s.channelTelegram,
    whatsapp: s.channelWhatsapp,
    viber: s.channelViber,
  };
  const [config, setConfig] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  const persist = async (next: CustomBookingChannelsConfig) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/homepage/custom-booking-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          online: next.online,
          whatsapp: next.whatsapp,
          viber: next.viber,
          telegram: next.telegram,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      setConfig(data);
      setMessage(`${c.saved}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const patchChannel = (
    key: CustomBookingChannelKey,
    patch: Partial<CustomBookingChannel>,
  ): CustomBookingChannelsConfig => {
    const next: CustomBookingChannelsConfig = {
      ...config,
      [key]: { ...config[key], ...patch },
      updatedAt: config.updatedAt,
    };
    setConfig(next);
    return next;
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.bookingChannels}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.bookingChannelsHelp}</p>
      </div>

      <div className="space-y-2">
        <div className={`space-y-1.5 rounded-lg border p-2.5 ${BORDERS.online}`}>
          <Toggle
            label={`${labels.online} — ${config.online.enabled ? c.enabled : c.disabled}`}
            checked={config.online.enabled}
            disabled={busy}
            onChange={(enabled) => void persist(patchChannel("online", { enabled }))}
          />
          <p className="text-[11px] text-slate-500">{s.channelOnlineHelp}</p>
        </div>

        {(["telegram", "whatsapp", "viber"] as const).map((key) => (
          <div key={key} className={`space-y-1.5 rounded-lg border p-2.5 ${BORDERS[key]}`}>
            <Toggle
              label={`${labels[key]} — ${config[key].enabled ? c.enabled : c.disabled}`}
              checked={config[key].enabled}
              disabled={busy}
              onChange={(enabled) => void persist(patchChannel(key, { enabled }))}
            />
            <label className="block text-[11px] font-semibold text-slate-600">
              {key === "telegram" ? s.telegramContact : `${labels[key]} ${s.channelNumber}`}
              <input
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-normal text-slate-900"
                placeholder={key === "telegram" ? s.telegramPlaceholder : s.phonePlaceholder}
                value={config[key].contact}
                disabled={busy}
                onChange={(e) => setConfig(patchChannel(key, { contact: e.target.value }))}
                onBlur={(e) => void persist(patchChannel(key, { contact: e.target.value }))}
              />
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void persist(config)}
        className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
      >
        {busy ? c.saving : c.save}
      </button>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
