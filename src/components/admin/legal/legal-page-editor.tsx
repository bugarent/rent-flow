"use client";

import type { RefObject } from "react";

export type LegalPageDraft = {
  body: string;
  fileUrl: string;
};

export function LegalPageEditor({
  title,
  help,
  bodyLabel,
  fileLabel,
  uploadLabel,
  replaceLabel,
  removeLabel,
  fileHint,
  openFileLabel,
  draft,
  busy,
  uploading,
  onChange,
  onUpload,
  onRemoveFile,
  inputRef,
}: {
  title: string;
  help: string;
  bodyLabel: string;
  fileLabel: string;
  uploadLabel: string;
  replaceLabel: string;
  removeLabel: string;
  fileHint: string;
  openFileLabel: string;
  draft: LegalPageDraft;
  busy: boolean;
  uploading: boolean;
  onChange: (next: LegalPageDraft) => void;
  onUpload: (file: File) => void;
  onRemoveFile: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div>
        <h3 className="text-sm font-extrabold text-[#0b1f4b]">{title}</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">{help}</p>
      </div>

      <label className="block text-[11px] font-semibold text-slate-700">
        {bodyLabel}
        <textarea
          className="mt-0.5 min-h-[120px] w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal leading-relaxed outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          value={draft.body}
          disabled={busy}
          onChange={(e) => onChange({ ...draft, body: e.target.value })}
        />
      </label>

      <div>
        <p className="text-[11px] font-semibold text-slate-700">{fileLabel}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
          <button
            type="button"
            disabled={busy || uploading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "…" : draft.fileUrl ? replaceLabel : uploadLabel}
          </button>
          {draft.fileUrl ? (
            <>
              <a
                href={draft.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-sky-700 underline hover:text-sky-900"
              >
                {openFileLabel}
              </a>
              <button
                type="button"
                disabled={busy}
                className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-60"
                onClick={onRemoveFile}
              >
                {removeLabel}
              </button>
            </>
          ) : (
            <span className="text-[11px] text-slate-500">{fileHint}</span>
          )}
        </div>
      </div>
    </div>
  );
}
