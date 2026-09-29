"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Trash2, ShieldCheck } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import {
  ResponsiveDataList,
  MobileDataCard,
  MobileDataRow,
} from "@/components/ui/responsive-data-list";
import { cn } from "@/lib/utils";
import type { AdminCustomerRow } from "@/lib/admin/customer-row";

export type { AdminCustomerRow };

export function AdminCustomersTable({
  users,
  dbOffline,
  queryError,
}: {
  users: AdminCustomerRow[];
  dbOffline?: boolean;
  queryError?: string;
}) {
  const { dictionary } = useAdminLocale();
  const t = dictionary.customersTable;
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (user: AdminCustomerRow, action: "block" | "unblock" | "delete") => {
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    if (action === "delete") {
      if (!window.confirm(t.confirmDelete.replace("{name}", name))) return;
    }
    if (action === "block") {
      if (!window.confirm(t.confirmBlock.replace("{name}", name).replace("{email}", user.email).replace("{phone}", user.phone))) {
        return;
      }
    }
    setBusyId(user.id);
    setError(null);
    try {
      if (action === "delete") {
        const res = await fetch(`/api/admin/customers/${user.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : t.actionFailed);
          return;
        }
      } else {
        const res = await fetch(`/api/admin/customers/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : t.actionFailed);
          return;
        }
      }
      router.refresh();
    } catch {
      setError(t.actionFailed);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {(dbOffline || queryError) && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-semibold">
            {dbOffline ? t.dbOffline : t.loadFailed}
          </p>
          {queryError ? <p className="mt-1 leading-relaxed">{queryError}</p> : null}
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <ResponsiveDataList
        desktop={
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{t.colName}</th>
                  <th className="p-3">{t.colEmail}</th>
                  <th className="p-3">{t.colPhone}</th>
                  <th className="p-3">{t.colCountry}</th>
                  <th className="p-3">{t.colMessenger}</th>
                  <th className="p-3">{t.colStatus}</th>
                  <th className="p-3 text-right">{dictionary.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      {t.empty}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const busy = busyId === u.id;
                    const blocked = u.banned || u.status === "SUSPENDED";
                    return (
                      <tr key={u.id} className="border-t">
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {u.customerNumber ?? "—"}
                        </td>
                        <td className="p-3">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="p-3">{u.email}</td>
                        <td className="p-3 font-mono text-xs sm:text-sm">{u.phone}</td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800">{u.countryLabel}</span>
                          <span className="ml-1 text-xs text-slate-400">{u.countryOfResidence}</span>
                        </td>
                        <td className="p-3">{u.messengers.join(", ")}</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-bold",
                              blocked
                                ? "bg-rose-50 text-rose-700"
                                : u.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : u.status === "PENDING_OTP"
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {blocked ? t.statusBlocked : u.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {blocked ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void runAction(u, "unblock")}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {t.unblock}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void runAction(u, "block")}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                {t.block}
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(u, "delete")}
                              className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {dictionary.common.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        }
        mobile={
          users.length === 0 ? (
            <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
              {t.empty}
            </p>
          ) : (
            users.map((u) => {
              const busy = busyId === u.id;
              const blocked = u.banned || u.status === "SUSPENDED";
              return (
                <MobileDataCard key={u.id}>
                  <MobileDataRow label="#">{u.customerNumber ?? "—"}</MobileDataRow>
                  <MobileDataRow label={t.colName}>
                    {u.firstName} {u.lastName}
                  </MobileDataRow>
                  <MobileDataRow label={t.colEmail}>{u.email}</MobileDataRow>
                  <MobileDataRow label={t.colPhone}>
                    <span className="font-mono text-xs">{u.phone}</span>
                  </MobileDataRow>
                  <MobileDataRow label={t.colCountry}>
                    <span className="font-semibold text-slate-800">{u.countryLabel}</span>
                    <span className="ml-1 text-xs font-normal text-slate-400">
                      {u.countryOfResidence}
                    </span>
                  </MobileDataRow>
                  <MobileDataRow label={t.colMessenger}>
                    {u.messengers.join(", ") || "—"}
                  </MobileDataRow>
                  <MobileDataRow label={t.colStatus}>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold",
                        blocked
                          ? "bg-rose-50 text-rose-700"
                          : u.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : u.status === "PENDING_OTP"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {blocked ? t.statusBlocked : u.status}
                    </span>
                  </MobileDataRow>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    {blocked ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(u, "unblock")}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t.unblock}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(u, "block")}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        {t.block}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(u, "delete")}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {dictionary.common.delete}
                    </button>
                  </div>
                </MobileDataCard>
              );
            })
          )
        }
      />
    </div>
  );
}
