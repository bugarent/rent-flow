"use client";

import { useMemo, useState } from "react";
import { Info, Paperclip, X } from "lucide-react";
import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  CONTACT_REQUEST_TYPES,
  type ContactRequestSubtypeId,
  type ContactRequestTypeId,
} from "@/lib/catalog/contact-message";
import { usePreferences } from "@/components/providers/preferences-context";
import { getContactFormCopy } from "@/lib/i18n/contact-form-copy";

type AttachmentState = {
  name: string;
  type: string;
  base64: string;
} | null;

export function ContactMessageForm({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent?: () => void;
}) {
  const { dictionary, locale } = usePreferences();
  const t = getContactFormCopy(locale);
  const [email, setEmail] = useState("");
  const [requestType, setRequestType] = useState<ContactRequestTypeId | "">("");
  const [subtype, setSubtype] = useState<ContactRequestSubtypeId | "">("");
  const [bookingNumber, setBookingNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<AttachmentState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const subtypes = useMemo(() => {
    const def = CONTACT_REQUEST_TYPES.find((x) => x.id === requestType);
    return def?.subtypes ?? [];
  }, [requestType]);

  const onPickFile = async (file: File | null) => {
    setError("");
    if (!file) {
      setAttachment(null);
      return;
    }
    if (file.size > CONTACT_ATTACHMENT_MAX_BYTES) {
      setError(t.attachTooLarge);
      return;
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    setAttachment({
      name: file.name,
      type: file.type || "application/octet-stream",
      base64: btoa(binary),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!requestType || !subtype) {
      setError(t.selectOption);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          requestType,
          subtype,
          bookingNumber,
          subject,
          description,
          ...(attachment
            ? {
                attachmentName: attachment.name,
                attachmentType: attachment.type,
                attachmentBase64: attachment.base64,
              }
            : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || t.failed);
      setDone(true);
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20";
  const labelClass = "block text-sm font-semibold text-slate-700";

  return (
    <div className="flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_rgba(11,31,75,0.28)] ring-1 ring-slate-200">
      <div className="relative flex items-center justify-center bg-[#1d6fe8] px-10 py-3">
        <h2 className="text-base font-bold text-white sm:text-lg">{t.title}</h2>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
          onClick={onClose}
          aria-label={dictionary.common.closeMenu}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f4f7fb] p-4 sm:p-5">
        {done ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
            {t.sent}
            <div className="mt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white"
              >
                {dictionary.common.closeMenu}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <label className={labelClass}>
              {t.yourEmail} <span className="text-red-500">*</span>
              <input
                type="email"
                required
                className={fieldClass}
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className={labelClass}>
              {t.requestType} <span className="text-red-500">*</span>
              <select
                required
                className={fieldClass}
                value={requestType}
                disabled={busy}
                onChange={(e) => {
                  setRequestType(e.target.value as ContactRequestTypeId | "");
                  setSubtype("");
                }}
              >
                <option value="">{t.selectOption}</option>
                {CONTACT_REQUEST_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {t.types[type.id]}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              {t.subtype} <span className="text-red-500">*</span>
              <select
                required
                className={fieldClass}
                value={subtype}
                disabled={busy || !requestType}
                onChange={(e) => setSubtype(e.target.value as ContactRequestSubtypeId | "")}
              >
                <option value="">{t.selectOption}</option>
                {subtypes.map((id) => (
                  <option key={id} value={id}>
                    {t.subtypes[id]}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              <span className="inline-flex items-center gap-1">
                {t.bookingNumber} <span className="text-red-500">*</span>
                <span title={t.bookingNumberHint} className="text-slate-400">
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
              <input
                required
                className={fieldClass}
                value={bookingNumber}
                disabled={busy}
                onChange={(e) => setBookingNumber(e.target.value)}
              />
            </label>

            <label className={labelClass}>
              {t.subject} <span className="text-red-500">*</span>
              <input
                required
                className={fieldClass}
                value={subject}
                disabled={busy}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label className={labelClass}>
              {t.description} <span className="text-red-500">*</span>
              <textarea
                required
                rows={7}
                className={`${fieldClass} min-h-[140px] resize-y`}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1d6fe8] hover:underline">
                <Paperclip className="h-4 w-4" aria-hidden />
                {t.attach}
                <input
                  type="file"
                  className="hidden"
                  disabled={busy}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {attachment ? (
                <p className="mt-1 text-xs text-slate-500">
                  {attachment.name}{" "}
                  <button
                    type="button"
                    className="font-semibold text-red-600 hover:underline"
                    onClick={() => setAttachment(null)}
                  >
                    ×
                  </button>
                </p>
              ) : null}
            </div>

            {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[#e67e22] px-5 py-2 text-sm font-bold text-white hover:bg-[#d35400] disabled:bg-slate-400"
              >
                {busy ? t.sending : t.send}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
