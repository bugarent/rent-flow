"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useBpLabels } from "@/components/admin/business-partners/labels";
import { HighlightMatch } from "@/components/admin/business-partners/highlight-match";
import { BusinessPartnerTransferModal } from "@/components/admin/business-partners/transfer-modal";
import type { BusinessPartnerRow } from "@/components/admin/business-partners/use-admin-data";
import type { BusinessPartnerSettings } from "@/lib/catalog/business-partners";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { uiLocaleTag } from "@/lib/i18n/ui-text";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";

function money(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(uiLocaleTag(locale), {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Compose mailto: partner receives the mail; admin notification address is CC when set. */
function partnerMailtoHref(
  partnerEmail: string,
  partnerName: string,
  notificationEmail: string,
): string {
  const to = partnerEmail.trim();
  if (!to) return "#";
  const params = new URLSearchParams();
  params.set("subject", `RentAirportCars · ${partnerName || "Business partner"}`);
  const notify = notificationEmail.trim();
  if (notify && notify.toLowerCase() !== to.toLowerCase()) {
    params.set("cc", notify);
  }
  const qs = params.toString();
  return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
}

type EarnSort = "desc" | "asc";
type ModalMode = "details";

function unpaid(p: { earnedUsd?: number; paidUsd?: number }) {
  return Math.max(0, (Number(p.earnedUsd) || 0) - (Number(p.paidUsd) || 0));
}

export function BusinessPartnersListPanel({
  partners,
  q,
  loading,
  onReload,
  onPartnerUpdated,
  settings,
  onSettingsUpdated,
}: {
  partners: BusinessPartnerRow[];
  q: string;
  loading: boolean;
  onReload: () => void;
  onPartnerUpdated?: (partner: BusinessPartnerRow) => void;
  settings: BusinessPartnerSettings;
  onSettingsUpdated?: (next: BusinessPartnerSettings) => void;
}) {
  const L = useBpLabels();
  const [modal, setModal] = useState<{ partner: BusinessPartnerRow; mode: ModalMode } | null>(
    null,
  );
  const [transferPartner, setTransferPartner] = useState<BusinessPartnerRow | null>(null);
  const [minEarnedText, setMinEarnedText] = useState("");
  const [earnSort, setEarnSort] = useState<EarnSort>("desc");
  const [mounted, setMounted] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(settings.notificationEmail || "");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyErr, setNotifyErr] = useState("");
  const [paypalEmail, setPaypalEmail] = useState(settings.adminPaypalEmail || "");
  const [paypalBusy, setPaypalBusy] = useState(false);
  const [paypalMsg, setPaypalMsg] = useState("");
  const [paypalErr, setPaypalErr] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotifyEmail(settings.notificationEmail || "");
  }, [settings.notificationEmail]);

  useEffect(() => {
    setPaypalEmail(settings.adminPaypalEmail || "");
  }, [settings.adminPaypalEmail]);

  useEffect(() => {
    setLoginPassword("");
    setPasswordMsg("");
    setPasswordErr("");
  }, [modal?.partner.id]);

  const savePartnerPassword = async () => {
    if (!modal) return;
    const password = loginPassword.trim();
    if (!password) {
      setPasswordErr(L.passwordRequired);
      return;
    }
    setPasswordBusy(true);
    setPasswordErr("");
    setPasswordMsg("");
    try {
      const res = await fetch(`/api/admin/business-partners/${modal.partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        ok?: boolean;
        partner?: BusinessPartnerRow;
      };
      if (!res.ok) {
        setPasswordErr(
          data.code === "WEAK_PASSWORD"
            ? L.passwordRules
            : data.error || L.saveFailed,
        );
        return;
      }
      if (data.partner) {
        const next = {
          ...modal.partner,
          ...data.partner,
          referralUrl: modal.partner.referralUrl,
        };
        setModal({ partner: next, mode: "details" });
        onPartnerUpdated?.(next);
      }
      setLoginPassword("");
      setPasswordMsg(L.passwordSaved);
    } catch {
      setPasswordErr(L.saveFailed);
    } finally {
      setPasswordBusy(false);
    }
  };

  const saveNotifyEmail = async () => {
    const value = notifyEmail.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setNotifyErr(L.badEmail);
      return;
    }
    setNotifyBusy(true);
    setNotifyErr("");
    setNotifyMsg("");
    try {
      const res = await fetch("/api/admin/business-partners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationEmail: value }),
      });
      const data = (await res.json()) as {
        settings?: BusinessPartnerSettings;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        setNotifyErr(data.error || L.saveFailed);
        return;
      }
      onSettingsUpdated?.(data.settings);
      setNotifyEmail(data.settings.notificationEmail || "");
      setNotifyMsg(L.saved);
    } catch {
      setNotifyErr(L.saveFailed);
    } finally {
      setNotifyBusy(false);
    }
  };

  const saveAdminPaypal = async () => {
    const value = paypalEmail.trim();
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setPaypalErr(L.badPaypal);
      return;
    }
    setPaypalBusy(true);
    setPaypalErr("");
    setPaypalMsg("");
    try {
      const res = await fetch("/api/admin/business-partners/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPaypalEmail: value }),
      });
      const data = (await res.json()) as {
        settings?: BusinessPartnerSettings;
        error?: string;
      };
      if (!res.ok || !data.settings) {
        setPaypalErr(data.error || L.saveFailed);
        return;
      }
      onSettingsUpdated?.(data.settings);
      setPaypalEmail(data.settings.adminPaypalEmail || "");
      setPaypalMsg(L.saved);
    } catch {
      setPaypalErr(L.saveFailed);
    } finally {
      setPaypalBusy(false);
    }
  };

  const minEarned = useMemo(() => {
    const cleaned = minEarnedText.trim().replace(",", ".");
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [minEarnedText]);

  const rows = useMemo(() => {
    const list = [...partners].filter((p) => {
      if (p.status !== "ACTIVE" && p.status !== "DISABLED") return false;
      if (minEarned > 0 && (Number(p.earnedUsd) || 0) <= minEarned) return false;
      return true;
    });
    list.sort((a, b) => {
      const ae = Number(a.earnedUsd) || 0;
      const be = Number(b.earnedUsd) || 0;
      if (ae !== be) return earnSort === "desc" ? be - ae : ae - be;
      return a.fullName.localeCompare(b.fullName);
    });
    return list;
  }, [partners, minEarned, earnSort]);

  const openTransfer = (p: BusinessPartnerRow) => {
    setTransferPartner(p);
  };

  const removePartner = async (p: BusinessPartnerRow) => {
    if (
      !window.confirm(
        `${L.confirmDelete}\n${p.fullName} (${p.email || p.referralCode})`,
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/business-partners/${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : L.deleteFailed);
      }
      if (modal?.partner.id === p.id) setModal(null);
      onReload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : L.deleteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  const modalNode =
    mounted && modal
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModal(null);
            }}
          >
            <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-[#0b1f4b]">{modal.partner.fullName}</p>
                  <p className="text-sm text-slate-600">{modal.partner.email}</p>
                </div>
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                  onClick={() => setModal(null)}
                >
                  {L.close}
                </button>
              </div>

              <dl className="space-y-3 text-sm">
                  <DetailRow label={L.name} value={modal.partner.fullName} />
                  <DetailRow label="Email" value={modal.partner.email} />
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#0b1f4b]">
                      {L.cabinetLogin}
                    </p>
                    <DetailRow label={L.login} value={modal.partner.email} />
                    <DetailRow
                      label={L.password}
                      value={modal.partner.passwordPlain?.trim() || "—"}
                      mono
                    />
                    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {L.newPassword}
                      </dt>
                      <dd className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="text"
                            autoComplete="off"
                            spellCheck={false}
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              setPasswordMsg("");
                              setPasswordErr("");
                            }}
                            placeholder={L.newPassword}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            disabled={passwordBusy || !loginPassword.trim()}
                            onClick={() => void savePartnerPassword()}
                            className="shrink-0 rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white hover:bg-[#1557c0] disabled:opacity-50"
                          >
                            {passwordBusy ? "…" : L.save}
                          </button>
                        </div>
                        {passwordMsg ? (
                          <p className="text-xs font-semibold text-emerald-600">{passwordMsg}</p>
                        ) : null}
                        {passwordErr ? (
                          <p className="text-xs font-semibold text-rose-600">{passwordErr}</p>
                        ) : null}
                      </dd>
                    </div>
                  </div>
                  <DetailRow label={L.phone} value={modal.partner.phone} />
                  <DetailRow
                    label={L.social}
                    value={
                      Array.isArray(modal.partner.messengers) && modal.partner.messengers.length
                        ? modal.partner.messengers.join(", ")
                        : "—"
                    }
                  />
                  <DetailRow label={L.category} value={modal.partner.category || "—"} />
                  <DetailRow
                    label={L.country}
                    value={
                      modal.partner.countryIso2
                        ? worldCountryName(modal.partner.countryIso2)
                        : "—"
                    }
                  />
                  <DetailRow label={L.referralCode} value={modal.partner.referralCode} mono />
                  <DetailRow label="PayPal" value={modal.partner.paypalAccount || "—"} />
                  <DetailRow label="IBAN" value={modal.partner.payoutAccount || "—"} mono />
                  <DetailRow label="SWIFT" value={modal.partner.payoutSwift || "—"} mono />
                  <DetailRow
                    label="Website"
                    value={modal.partner.website || "—"}
                    breakAll={Boolean(modal.partner.website)}
                  />
                  <DetailRow label={L.note} value={modal.partner.notes || "—"} />
                  <DetailRow label={L.status} value={modal.partner.status} />
                  <DetailRow
                    label={L.bookings}
                    value={String(Number(modal.partner.referralBookings) || 0)}
                  />
                  <DetailRow
                    label={L.earned}
                    value={money(Number(modal.partner.earnedUsd) || 0)}
                    accent
                  />
                  <DetailRow
                    label={L.paid}
                    value={money(Number(modal.partner.paidUsd) || 0)}
                  />
                  <DetailRow label={L.due} value={money(unpaid(modal.partner))} />
                  <DetailRow label={L.created} value={formatWhen(modal.partner.createdAt, L.locale)} />
                  <DetailRow label={L.updated} value={formatWhen(modal.partner.updatedAt, L.locale)} />
                  {modal.partner.referralUrl ? (
                    <DetailRow
                      label={L.referralLink}
                      value={modal.partner.referralUrl}
                      breakAll
                    />
                  ) : null}
                </dl>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-4">
      {deleteError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
          {deleteError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          <p className="pb-2 text-sm text-slate-600">
            {loading ? "Loading…" : `${rows.length} partner(s)`}
            {minEarned > 0 ? ` · ${L.earnedAbove} ${money(minEarned)}` : ""}
          </p>
          <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-xs font-semibold text-slate-600 sm:max-w-sm sm:min-w-[16rem]">
            {L.notifyEmail}
            <span className="flex gap-1.5">
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => {
                  setNotifyEmail(e.target.value);
                  setNotifyMsg("");
                  setNotifyErr("");
                }}
                placeholder="partners@example.com"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
              />
              <button
                type="button"
                disabled={notifyBusy}
                onClick={() => void saveNotifyEmail()}
                className="shrink-0 rounded-xl bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white hover:bg-[#1557c0] disabled:opacity-50"
              >
                {notifyBusy ? "…" : L.save}
              </button>
            </span>
            {notifyMsg ? (
              <span className="font-semibold text-emerald-600">{notifyMsg}</span>
            ) : null}
            {notifyErr ? <span className="font-semibold text-rose-600">{notifyErr}</span> : null}
          </label>
          <label className="flex min-w-0 w-full flex-1 flex-col gap-1 text-xs font-semibold text-slate-600 sm:max-w-sm sm:min-w-[16rem]">
            {L.adminPaypal}
            <span className="flex gap-1.5">
              <input
                type="email"
                name="admin_paypal"
                value={paypalEmail}
                onChange={(e) => {
                  setPaypalEmail(e.target.value);
                  setPaypalMsg("");
                  setPaypalErr("");
                }}
                placeholder="admin_account@gmail.com"
                required
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
              />
              <button
                type="button"
                disabled={paypalBusy}
                onClick={() => void saveAdminPaypal()}
                className="shrink-0 rounded-xl bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white hover:bg-[#1557c0] disabled:opacity-50"
              >
                {paypalBusy ? "…" : L.save}
              </button>
            </span>
            {paypalMsg ? (
              <span className="font-semibold text-emerald-600">{paypalMsg}</span>
            ) : null}
            {paypalErr ? <span className="font-semibold text-rose-600">{paypalErr}</span> : null}
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {L.minEarned}
            <input
              type="text"
              inputMode="decimal"
              value={minEarnedText}
              onChange={(e) => setMinEarnedText(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder={L.example100}
              className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            {L.sortPrice}
            <select
              value={earnSort}
              onChange={(e) => setEarnSort(e.target.value as EarnSort)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800"
            >
              <option value="desc">{L.highToLow}</option>
              <option value="asc">{L.lowToHigh}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={onReload}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            {L.refresh}
          </button>
        </div>
      </div>

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">{L.name}</th>
                  <th className="min-w-[10rem] px-2 py-2 font-semibold">Email</th>
                  <th className="w-28 px-2 py-2 font-semibold">{L.code}</th>
                  <th className="w-24 px-2 py-2 font-semibold">
                    <button
                      type="button"
                      onClick={() => setEarnSort((s) => (s === "desc" ? "asc" : "desc"))}
                      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-[#1d6fe8]"
                    >
                      {L.earned}
                      <span className="text-[10px] normal-case" aria-hidden>
                        {earnSort === "desc" ? "↓" : "↑"}
                      </span>
                    </button>
                  </th>
                  <th className="w-24 px-2 py-2 font-semibold">{L.status}</th>
                  <th className="w-64 px-2 py-2 font-semibold">{L.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="truncate px-2 py-2 font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => setModal({ partner: p, mode: "details" })}
                        className="max-w-full truncate text-left font-medium text-[#0b1f4b] hover:underline"
                        title={p.fullName}
                      >
                        <HighlightMatch text={p.fullName} query={q} />
                      </button>
                    </td>
                    <td className="truncate px-2 py-2">
                      {p.email ? (
                        <a
                          href={partnerMailtoHref(
                            p.email,
                            p.fullName,
                            settings.notificationEmail || notifyEmail,
                          )}
                          className="truncate text-sky-700 hover:underline"
                          title={
                            (settings.notificationEmail || notifyEmail).trim()
                              ? `${p.email} · CC: ${(settings.notificationEmail || notifyEmail).trim()}`
                              : p.email
                          }
                        >
                          <HighlightMatch text={p.email} query={q} />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="truncate px-2 py-2 font-mono font-bold text-[#0b1f4b]">
                      <HighlightMatch text={p.referralCode} query={q} />
                    </td>
                    <td className="px-2 py-2 font-semibold text-green-600">
                      {money(Number(p.earnedUsd) || 0)}
                    </td>
                    <td className="truncate px-2 py-2">
                      <HighlightMatch text={p.status} query={q} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <div className="inline-flex flex-nowrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ partner: p, mode: "details" })}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
                        >
                          {L.details}
                        </button>
                        <button
                          type="button"
                          disabled={unpaid(p) <= 0}
                          onClick={() => openTransfer(p)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {L.transfer}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === p.id}
                          onClick={() => void removePartner(p)}
                          className="rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          {deletingId === p.id ? "…" : L.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      {minEarned > 0
                        ? L.noneAbove
                        : "No approved business partners yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        }
        mobile={
          !loading && rows.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-3 py-8 text-center text-sm text-slate-500">
              {minEarned > 0
                ? L.noneAbove
                : "No approved business partners yet."}
            </p>
          ) : (
            rows.map((p) => (
              <MobileDataCard key={p.id}>
                <MobileDataRow label={L.name}>
                  <button
                    type="button"
                    onClick={() => setModal({ partner: p, mode: "details" })}
                    className="text-end font-medium text-[#0b1f4b] hover:underline"
                  >
                    <HighlightMatch text={p.fullName} query={q} />
                  </button>
                </MobileDataRow>
                <MobileDataRow label="Email">
                  {p.email ? (
                    <a
                      href={partnerMailtoHref(
                        p.email,
                        p.fullName,
                        settings.notificationEmail || notifyEmail,
                      )}
                      className="break-all text-sky-700 hover:underline"
                    >
                      <HighlightMatch text={p.email} query={q} />
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </MobileDataRow>
                <MobileDataRow label={L.code}>
                  <span className="font-mono font-bold text-[#0b1f4b]">
                    <HighlightMatch text={p.referralCode} query={q} />
                  </span>
                </MobileDataRow>
                <MobileDataRow label={L.earned}>
                  <span className="font-semibold text-green-600">
                    {money(Number(p.earnedUsd) || 0)}
                  </span>
                </MobileDataRow>
                <MobileDataRow label={L.status}>
                  <HighlightMatch text={p.status} query={q} />
                </MobileDataRow>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setModal({ partner: p, mode: "details" })}
                    className="min-h-11 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
                  >
                    {L.details}
                  </button>
                  <button
                    type="button"
                    disabled={unpaid(p) <= 0}
                    onClick={() => openTransfer(p)}
                    className="min-h-11 flex-1 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {L.transfer}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === p.id}
                    onClick={() => void removePartner(p)}
                    className="min-h-11 flex-1 rounded-md bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                  >
                    {deletingId === p.id ? "…" : L.delete}
                  </button>
                </div>
              </MobileDataCard>
            ))
          )
        }
      />

      {modalNode}
      {transferPartner ? (
        <BusinessPartnerTransferModal
          partner={transferPartner}
          onClose={() => setTransferPartner(null)}
          onPartnerUpdated={(next) => {
            onPartnerUpdated?.(next as BusinessPartnerRow);
            setTransferPartner((prev) => {
              if (!prev) return null;
              const { payoutMethod: _method, ...rest } = next;
              return { ...prev, ...rest };
            });
          }}
        />
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  breakAll,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  breakAll?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="grid gap-0.5 border-b border-slate-100 pb-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd
        className={[
          "font-medium text-slate-800",
          mono ? "font-mono font-bold text-[#0b1f4b]" : "",
          breakAll ? "break-all" : "",
          accent ? "font-semibold text-green-600" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
