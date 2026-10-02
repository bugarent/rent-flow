"use client";

import { useRef, useState } from "react";
import type { LegalPagesConfig } from "@/lib/catalog/legal-pages";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { LegalPageEditor, type LegalPageDraft } from "@/components/admin/legal/legal-page-editor";
import { uploadAdminFile } from "@/components/admin/legal/upload-admin-file";
import { legalDocument } from "@/lib/i18n/legal-documents";

type Props = {
  initial: LegalPagesConfig;
};

export function LegalPagesManager({ initial }: Props) {
  const { dictionary, locale } = useAdminLocale();
  const s = dictionary.sections;
  const c = dictionary.common;
  const [termsFile, setTermsFile] = useState(initial.terms.fileUrl);
  const [privacyFile, setPrivacyFile] = useState(initial.privacy.fileUrl);
  const [termsSource, setTermsSource] = useState(initial.terms.body);
  const [privacySource, setPrivacySource] = useState(initial.privacy.body);
  const [termsEdits, setTermsEdits] = useState<Record<string, string>>({});
  const [privacyEdits, setPrivacyEdits] = useState<Record<string, string>>({});
  const terms: LegalPageDraft = {
    body: termsEdits[locale] ?? legalDocument("terms", locale, termsSource),
    fileUrl: termsFile,
  };
  const privacy: LegalPageDraft = {
    body: privacyEdits[locale] ?? legalDocument("privacy", locale, privacySource),
    fileUrl: privacyFile,
  };
  const [busy, setBusy] = useState(false);
  const [termsUploading, setTermsUploading] = useState(false);
  const [privacyUploading, setPrivacyUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const termsInputRef = useRef<HTMLInputElement>(null);
  const privacyInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    which: "terms" | "privacy",
  ): Promise<string | null> => {
    const setUploading = which === "terms" ? setTermsUploading : setPrivacyUploading;
    setUploading(true);
    setError("");
    try {
      return await uploadAdminFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
      return null;
    } finally {
      setUploading(false);
      const ref = which === "terms" ? termsInputRef : privacyInputRef;
      if (ref.current) ref.current.value = "";
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/legal-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terms: {
            body: locale === "ka" ? terms.body : (termsEdits.ka ?? termsSource),
            fileUrl: terms.fileUrl,
          },
          privacy: {
            body: locale === "ka" ? privacy.body : (privacyEdits.ka ?? privacySource),
            fileUrl: privacy.fileUrl,
          },
        }),
      });
      const data = (await res.json()) as LegalPagesConfig & { error?: string };
      if (!res.ok) throw new Error(data.error || c.failed);
      setTermsFile(data.terms.fileUrl);
      setPrivacyFile(data.privacy.fileUrl);
      setTermsSource(data.terms.body);
      setPrivacySource(data.privacy.body);
      setTermsEdits((prev) => {
        const next = { ...prev };
        delete next.ka;
        return next;
      });
      setPrivacyEdits((prev) => {
        const next = { ...prev };
        delete next.ka;
        return next;
      });
      setMessage(s.legalPagesSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{s.legalPages}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{s.legalPagesHelp}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LegalPageEditor
          title={s.legalTerms}
          help={s.legalTermsHelp}
          bodyLabel={s.legalBody}
          fileLabel={s.legalFile}
          uploadLabel={s.legalUpload}
          replaceLabel={s.legalReplace}
          removeLabel={s.legalRemoveFile}
          fileHint={s.legalFileHint}
          openFileLabel={s.legalOpenFile}
          draft={terms}
          busy={busy}
          uploading={termsUploading}
          onChange={(draft) => {
            setTermsFile(draft.fileUrl);
            setTermsEdits((prev) => ({ ...prev, [locale]: draft.body }));
          }}
          inputRef={termsInputRef}
          onUpload={async (file) => {
            const url = await uploadFile(file, "terms");
            if (url) setTermsFile(url);
          }}
          onRemoveFile={() => setTermsFile("")}
        />
        <LegalPageEditor
          title={s.legalPrivacy}
          help={s.legalPrivacyHelp}
          bodyLabel={s.legalBody}
          fileLabel={s.legalFile}
          uploadLabel={s.legalUpload}
          replaceLabel={s.legalReplace}
          removeLabel={s.legalRemoveFile}
          fileHint={s.legalFileHint}
          openFileLabel={s.legalOpenFile}
          draft={privacy}
          busy={busy}
          uploading={privacyUploading}
          onChange={(draft) => {
            setPrivacyFile(draft.fileUrl);
            setPrivacyEdits((prev) => ({ ...prev, [locale]: draft.body }));
          }}
          inputRef={privacyInputRef}
          onUpload={async (file) => {
            const url = await uploadFile(file, "privacy");
            if (url) setPrivacyFile(url);
          }}
          onRemoveFile={() => setPrivacyFile("")}
        />
      </div>

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
