"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { ADMIN_BASE } from "@/lib/routes";
import type { ModerationProfileView } from "@/components/admin/moderation-hub";

type Props = {
  profiles: ModerationProfileView[];
  profilesError: string;
  profilesDbOffline: boolean;
  labels: {
    profilesTitle: string;
    profilesBody: string;
    openPartner: string;
    rejectProfile: string;
    noProfiles: string;
    dbOfflineHint: string;
  };
};

export function ModerationProfilesPanel({
  profiles: profilesProp,
  profilesError,
  profilesDbOffline,
  labels,
}: Props) {
  const L = useBpLabels();
  const [profiles, setProfiles] = useState(profilesProp);
  const [rejectTarget, setRejectTarget] = useState<ModerationProfileView | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setProfiles(profilesProp);
  }, [profilesProp]);

  const submitReject = async () => {
    if (!rejectTarget) return;
    const note = rejectNote.trim();
    if (!note) {
      setError(L.rejectNeedNote);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/partners/${encodeURIComponent(rejectTarget.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", note, rejectionNote: note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Reject failed");
      setProfiles((prev) => prev.filter((p) => p.id !== rejectTarget.id));
      setRejectTarget(null);
      setRejectNote("");
      setMessage(String(data.message || L.rejectSent));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section role="tabpanel" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-extrabold text-[#0b1f4b]">{labels.profilesTitle}</h2>
      <p className="mt-1 text-sm text-slate-500">{labels.profilesBody}</p>

      {(profilesDbOffline || profilesError) && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {profilesDbOffline ? "Database offline — connection refused" : "Could not load profiles"}
          </p>
          <p className="mt-1 leading-relaxed">{profilesError}</p>
        </div>
      )}

      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          {message}
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        {profiles.map((p) => (
          <article key={p.id} className="rounded-xl border border-orange-200 bg-orange-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-orange-800">{p.status}</p>
                <h3 className="text-lg font-extrabold text-[#0b1f4b]">
                  {p.companyName}
                  {p.partnerCode ? (
                    <Link
                      href={`${ADMIN_BASE}/moderation/partners/${encodeURIComponent(p.id)}?returnTab=profiles`}
                      className="ms-2 font-mono text-sm font-bold text-emerald-800 hover:underline"
                    >
                      {p.partnerCode}
                    </Link>
                  ) : null}
                </h3>
                <p className="text-sm text-slate-600">
                  {p.email} · {p.phone}
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-950">{p.summary}</p>
                {p.changedAt ? (
                  <p className="text-xs text-orange-800/80">{new Date(p.changedAt).toLocaleString()}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`${ADMIN_BASE}/moderation/partners/${encodeURIComponent(p.id)}?returnTab=profiles`}
                  className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-sm font-bold text-white hover:bg-[#14365a]"
                >
                  {labels.openPartner}
                </Link>
                <button
                  type="button"
                  className="rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 hover:bg-red-100"
                  onClick={() => {
                    setRejectTarget(p);
                    setRejectNote("");
                    setError("");
                  }}
                >
                  {labels.rejectProfile}
                </button>
              </div>
            </div>
            {p.changes.length ? (
              <ul className="mt-3 space-y-1 rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-800">
                {p.changes.slice(0, 12).map((c, i) => (
                  <li key={`${p.id}-${i}`}>
                    <span className="font-semibold text-red-700">{c.field}:</span>{" "}
                    <span className="text-slate-500">{c.from}</span> →{" "}
                    <span className="font-semibold text-red-800">{c.to}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
        {profiles.length === 0 ? (
          <p className="text-slate-500">
            {profilesDbOffline ? labels.dbOfflineHint : labels.noProfiles}
          </p>
        ) : null}
      </div>

      {rejectTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-reject-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 id="profile-reject-title" className="text-lg font-extrabold text-[#0b1f4b]">
              {L.rejectTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {L.rejectBody} (
              {rejectTarget.companyName}
              {rejectTarget.partnerCode ? ` · ${rejectTarget.partnerCode}` : ""}).
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={L.rejectPlaceholder}
              autoFocus
            />
            {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !rejectNote.trim()}
                onClick={() => void submitReject()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {L.sendReject}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote("");
                  setError("");
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
              >
                {L.cancel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
