"use client";

import { useRef, useState } from "react";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { DEPOSIT_MAX_PERCENT, DEPOSIT_MIN_PERCENT } from "@/lib/brand";
import { DEFAULT_FX_RATES } from "@/lib/fx";
import { OperatingCountriesSettings } from "@/components/admin/operating-countries-settings";
import { ADMIN_BASE } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { clampSiteDiscountPercent } from "@/lib/pricing/booking-discount";

type GelFxDraft = {
  gelUsd: number;
  gelEur: number;
  gelGbp: number;
};

type FieldKey =
  | "depositPercent"
  | "siteDiscountPercent"
  | "telegramBotSiteName"
  | "gelUsd"
  | "gelEur"
  | "gelGbp"
  | "googleMapsUrl"
  | "eurUsdRate"
  | "eurGbpRate"
  | "eurGelRate";

function roundRate(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 10000) / 10000;
}

function eurRatesToGelDisplay(input: {
  eurUsdRate: number;
  eurGbpRate: number;
  eurGelRate: number;
}): GelFxDraft {
  const gelPerEur = input.eurGelRate > 0 ? input.eurGelRate : 1;
  return {
    gelUsd: roundRate(input.eurUsdRate / gelPerEur),
    gelEur: roundRate(1 / gelPerEur),
    gelGbp: roundRate(input.eurGbpRate / gelPerEur),
  };
}

function gelDisplayToEurRates(draft: GelFxDraft) {
  const eurPerGel = draft.gelEur > 0 ? draft.gelEur : 1;
  return {
    eurUsdRate: roundRate(draft.gelUsd / eurPerGel),
    eurGbpRate: roundRate(draft.gelGbp / eurPerGel),
    eurGelRate: roundRate(1 / eurPerGel),
  };
}

function inputClass(invalid: boolean) {
  return cn(
    "mt-1 w-full rounded-xl border p-3 font-normal outline-none",
    invalid
      ? "border-red-500 bg-red-50 ring-2 ring-red-200 focus:border-red-600 focus:ring-red-300"
      : "border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
  );
}

function clampDiscount(value: number, depositPercent: number) {
  return clampSiteDiscountPercent(Number.isFinite(value) ? value : 0, depositPercent);
}

export function AdminSettingsForm(props: {
  depositPercent: number;
  siteDiscountPercent?: number;
  telegramBotSiteName: string;
  eurUsdRate: number;
  eurGbpRate: number;
  eurGelRate: number;
  eurRubRate?: number;
  googleMapsUrl: string;
  partnerOperatingCountryIso2s: string[];
  siteContractUrl?: string;
  adminTelegramChatId?: string;
  telegramBotUsername?: string;
  telegramBotTokenSet?: boolean;
  openaiApiKeySet?: boolean;
}) {
  const L = useBpLabels();
  const [form, setForm] = useState({
    depositPercent: props.depositPercent,
    siteDiscountPercent: clampDiscount(props.siteDiscountPercent ?? 0, props.depositPercent),
    telegramBotSiteName: props.telegramBotSiteName,
    googleMapsUrl: props.googleMapsUrl,
    partnerOperatingCountryIso2s: props.partnerOperatingCountryIso2s,
    siteContractUrl: props.siteContractUrl ?? "",
    adminTelegramChatId: props.adminTelegramChatId ?? "",
    telegramBotUsername: props.telegramBotUsername ?? "rentairportcarsbot",
    telegramBotToken: "",
    openaiApiKey: "",
  });
  const [tokenSet, setTokenSet] = useState(Boolean(props.telegramBotTokenSet));
  const [openaiKeySet, setOpenaiKeySet] = useState(Boolean(props.openaiApiKeySet));
  const [fx, setFx] = useState<GelFxDraft>(() => eurRatesToGelDisplay(props));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [contractUploading, setContractUploading] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const clearError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): Partial<Record<FieldKey, string>> => {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (
      !Number.isInteger(form.depositPercent) ||
      form.depositPercent < DEPOSIT_MIN_PERCENT ||
      form.depositPercent > DEPOSIT_MAX_PERCENT
    ) {
      errors.depositPercent = `Enter an integer from ${DEPOSIT_MIN_PERCENT} to ${DEPOSIT_MAX_PERCENT}`;
    }
    if (form.telegramBotSiteName.trim().length < 2) {
      errors.telegramBotSiteName = "Enter at least 2 characters";
    }
    if (!(fx.gelUsd > 0)) errors.gelUsd = "Enter a positive rate";
    if (!(fx.gelEur > 0)) errors.gelEur = "Enter a positive rate";
    if (!(fx.gelGbp > 0)) errors.gelGbp = "Enter a positive rate";
    const maps = form.googleMapsUrl.trim();
    if (maps && !/^https?:\/\/.+/i.test(maps)) {
      errors.googleMapsUrl = "Enter a valid http(s) URL or leave empty";
    }
    return errors;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const localErrors = validate();
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      setMessage("Fix the highlighted fields, then save again.");
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      const eurRates = gelDisplayToEurRates(fx);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          telegramBotSiteName: form.telegramBotSiteName.trim(),
          googleMapsUrl: form.googleMapsUrl.trim(),
          siteContractUrl: form.siteContractUrl.trim(),
          adminTelegramChatId: form.adminTelegramChatId.trim(),
          telegramBotUsername: form.telegramBotUsername.trim().replace(/^@/, ""),
          ...(form.telegramBotToken.trim()
            ? { telegramBotToken: form.telegramBotToken.trim() }
            : {}),
          ...(form.openaiApiKey.trim() ? { openaiApiKey: form.openaiApiKey.trim() } : {}),
          ...eurRates,
          eurRubRate: props.eurRubRate ?? DEFAULT_FX_RATES.eurRub,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        ok?: boolean;
        telegramBotTokenSet?: boolean;
        openaiApiKeySet?: boolean;
      };

      if (!res.ok) {
        const next: Partial<Record<FieldKey, string>> = {};
        const server = data.fieldErrors || {};
        // Map server EUR field errors back onto GEL inputs when present
        if (server.eurUsdRate) next.gelUsd = server.eurUsdRate;
        if (server.eurGbpRate) next.gelGbp = server.eurGbpRate;
        if (server.eurGelRate) next.gelEur = server.eurGelRate;
        if (server.depositPercent) next.depositPercent = server.depositPercent;
        if (server.siteDiscountPercent) next.siteDiscountPercent = server.siteDiscountPercent;
        if (server.telegramBotSiteName) next.telegramBotSiteName = server.telegramBotSiteName;
        if (server.googleMapsUrl) next.googleMapsUrl = server.googleMapsUrl;
        if (server.gelUsd) next.gelUsd = server.gelUsd;
        if (server.gelEur) next.gelEur = server.gelEur;
        if (server.gelGbp) next.gelGbp = server.gelGbp;
        setFieldErrors(next);
        setMessage(data.error || "Failed to save");
        return;
      }

      if (typeof data.telegramBotTokenSet === "boolean") setTokenSet(data.telegramBotTokenSet);
      if (typeof data.openaiApiKeySet === "boolean") setOpenaiKeySet(data.openaiApiKeySet);
      setForm((prev) => ({ ...prev, telegramBotToken: "", openaiApiKey: "" }));
      setMessage("Saved — rates apply immediately site-wide.");
    } catch {
      setMessage("Network error — could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6" noValidate>
      <label className="block text-sm font-semibold">
        Online deposit / commission percent ({DEPOSIT_MIN_PERCENT}–{DEPOSIT_MAX_PERCENT}) — use 0 for test bookings
        <input
          type="number"
          min={DEPOSIT_MIN_PERCENT}
          max={DEPOSIT_MAX_PERCENT}
          className={inputClass(Boolean(fieldErrors.depositPercent))}
          value={form.depositPercent}
          onChange={(e) => {
            clearError("depositPercent");
            const depositPercent = Number(e.target.value);
            setForm({
              ...form,
              depositPercent,
              siteDiscountPercent: clampDiscount(form.siteDiscountPercent, depositPercent),
            });
          }}
        />
        {fieldErrors.depositPercent ? (
          <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.depositPercent}</span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold">
        საიტის ფასდაკლება % (0–{Math.max(0, form.depositPercent || 0)})
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={Math.max(0, form.depositPercent || 0)}
          className={inputClass(Boolean(fieldErrors.siteDiscountPercent))}
          value={form.siteDiscountPercent}
          onChange={(e) => {
            clearError("siteDiscountPercent");
            setForm({
              ...form,
              siteDiscountPercent: clampDiscount(Number(e.target.value), form.depositPercent),
            });
          }}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          აკლდება საიტის საკომისიოს. მაგ.: საკომისიო 20%, ფასდაკლება 10% → 100€-იანი ჯავშანი
          მომხმარებელს დაუჯდება 90€, საიტს რჩება 10€, პარტნიორის წილი უცვლელია. 0 = გამორთულია.
        </span>
        {fieldErrors.siteDiscountPercent ? (
          <span className="mt-1 block text-xs font-normal text-red-600">
            {fieldErrors.siteDiscountPercent}
          </span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold">
        Telegram bot site name
        <input
          className={inputClass(Boolean(fieldErrors.telegramBotSiteName))}
          value={form.telegramBotSiteName}
          onChange={(e) => {
            clearError("telegramBotSiteName");
            setForm({ ...form, telegramBotSiteName: e.target.value });
          }}
        />
        {fieldErrors.telegramBotSiteName ? (
          <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.telegramBotSiteName}</span>
        ) : null}
      </label>
      <label className="block text-sm font-semibold">
        Telegram bot username (@rentairportcarsbot)
        <input
          className={inputClass(false)}
          value={form.telegramBotUsername}
          placeholder="rentairportcarsbot"
          onChange={(e) => setForm({ ...form, telegramBotUsername: e.target.value })}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Without @. Used for deep links and partner bind.
        </span>
      </label>
      <label className="block text-sm font-semibold">
        Telegram Bot Token
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass(false)}
          value={form.telegramBotToken}
          placeholder={tokenSet ? "•••• saved — enter new token to replace" : "123456:ABC…"}
          onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          From @BotFather for @{form.telegramBotUsername || "rentairportcarsbot"}. Leave blank to keep
          the current token / TELEGRAM_BOT_TOKEN env. Booking + live-chat alerts use this bot.
        </span>
      </label>
      <label className="block text-sm font-semibold">
        {L.adminChatId}
        <input
          className={inputClass(false)}
          value={form.adminTelegramChatId}
          placeholder={L.adminChatPlaceholder}
          onChange={(e) => setForm({ ...form, adminTelegramChatId: e.target.value })}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          {L.adminChatHelp}
        </span>
      </label>
      <label className="block text-sm font-semibold">
        OpenAI API Key (Live Chat)
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass(false)}
          value={form.openaiApiKey}
          placeholder={openaiKeySet ? "•••• saved — enter new key to replace" : "sk-…"}
          onChange={(e) => setForm({ ...form, openaiApiKey: e.target.value })}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Optional. Without a key the chat still answers from site knowledge (FAQ, fleet, airports).
          With a key, replies use OpenAI. Leave blank to keep the current key / OPENAI_API_KEY env.
        </span>
      </label>

      <div>
        <p className="mb-2 text-sm font-semibold">Currency exchange rates</p>
        <p className="mb-3 text-xs text-slate-500">
          Enter how many units of each currency equal <strong>1 lari (GEL)</strong>. After Save, rates apply
          immediately for partners, customers, and admin.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Lari (GEL) — base
            <input
              type="number"
              step="0.0001"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal text-slate-600"
              value={1}
              readOnly
              disabled
              aria-label="Lari base rate"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Always 1.00 — rates are relative to 1 lari</span>
          </label>
          <label className="block text-sm font-semibold">
            Dollar (USD) per 1 GEL
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              className={inputClass(Boolean(fieldErrors.gelUsd))}
              value={fx.gelUsd}
              onChange={(e) => {
                clearError("gelUsd");
                setFx({ ...fx, gelUsd: Number(e.target.value) });
              }}
            />
            {fieldErrors.gelUsd ? (
              <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.gelUsd}</span>
            ) : null}
          </label>
          <label className="block text-sm font-semibold">
            Euro (EUR) per 1 GEL
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              className={inputClass(Boolean(fieldErrors.gelEur))}
              value={fx.gelEur}
              onChange={(e) => {
                clearError("gelEur");
                setFx({ ...fx, gelEur: Number(e.target.value) });
              }}
            />
            {fieldErrors.gelEur ? (
              <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.gelEur}</span>
            ) : null}
          </label>
          <label className="block text-sm font-semibold">
            Pound sterling (GBP) per 1 GEL
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              className={inputClass(Boolean(fieldErrors.gelGbp))}
              value={fx.gelGbp}
              onChange={(e) => {
                clearError("gelGbp");
                setFx({ ...fx, gelGbp: Number(e.target.value) });
              }}
            />
            {fieldErrors.gelGbp ? (
              <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.gelGbp}</span>
            ) : null}
          </label>
        </div>
      </div>

      <label className="block text-sm font-semibold">
        Official Google Maps URL
        <input
          className={inputClass(Boolean(fieldErrors.googleMapsUrl))}
          value={form.googleMapsUrl}
          placeholder="https://…"
          onChange={(e) => {
            clearError("googleMapsUrl");
            setForm({ ...form, googleMapsUrl: e.target.value });
          }}
        />
        {fieldErrors.googleMapsUrl ? (
          <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.googleMapsUrl}</span>
        ) : null}
      </label>
      <OperatingCountriesSettings
        selected={form.partnerOperatingCountryIso2s}
        onChange={(partnerOperatingCountryIso2s) => setForm({ ...form, partnerOperatingCountryIso2s })}
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Site rental contract</p>
        <p className="mt-1 text-xs text-slate-500">
          Upload the prepared platform contract (PDF or image). Partners see it in Personal info and can
          enable it when they have not activated their own contract. Checkout agreement links open the
          active contract.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={contractInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setContractUploading(true);
              setMessage("");
              try {
                const fd = new FormData();
                fd.append("file", file);
                const up = await fetch("/api/admin/uploads", { method: "POST", body: fd });
                const upData = (await up.json().catch(() => ({}))) as { url?: string; error?: string };
                if (!up.ok || !upData.url) {
                  setMessage(upData.error || "Contract upload failed");
                  return;
                }
                setForm((prev) => ({ ...prev, siteContractUrl: upData.url! }));
                setMessage("Contract uploaded — press Save to store it.");
              } catch {
                setMessage("Contract upload failed");
              } finally {
                setContractUploading(false);
                if (contractInputRef.current) contractInputRef.current.value = "";
              }
            }}
          />
          <button
            type="button"
            disabled={contractUploading || saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            onClick={() => contractInputRef.current?.click()}
          >
            {contractUploading ? "Uploading…" : form.siteContractUrl ? "Replace contract" : "Upload contract"}
          </button>
          {form.siteContractUrl ? (
            <>
              <a
                href={form.siteContractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-sky-700 underline hover:text-sky-900"
              >
                {form.siteContractUrl.split("/").pop() || "Open contract"}
              </a>
              <button
                type="button"
                className="text-sm font-semibold text-red-600 hover:underline"
                onClick={() => setForm((prev) => ({ ...prev, siteContractUrl: "" }))}
              >
                Remove
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500">PDF, PNG or JPG — max 20 MB</span>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Extra services and their daily price limits are managed under{" "}
        <a className="font-semibold text-sky-700 hover:underline" href={`${ADMIN_BASE}/extras`}>
          Extra services
        </a>
        .
      </p>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white disabled:bg-slate-400"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {message ? (
        <p
          className={`text-sm font-semibold ${
            message.startsWith("Saved") ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
