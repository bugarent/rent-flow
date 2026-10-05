"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { PartnerLocaleProvider } from "@/components/providers/partner-locale-context";
import {
  PartnerPersonalInfoForm,
  type AdminProfileReviewConfig,
} from "@/components/partner/partner-personal-info-form";
import {
  defaultCompanySettings,
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { isPartnerLocale, type PartnerLocale } from "@/lib/i18n/partner-config";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { adminBackLabel, uiText, type AdminBackTarget } from "@/lib/i18n/ui-text";
import { ADMIN_BASE } from "@/lib/routes";

type Props = {
  partnerId: string;
  backHref?: string;
  backTarget?: AdminBackTarget;
};

type DetailPayload = {
  companySettings?: PartnerCompanySettings | null;
  partnerCode?: string | null;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: string;
  pendingProfileChanges?: Array<{
    id: string;
    at: string;
    summary: string;
    changes: Array<{ field: string; from: string; to: string }>;
  }>;
  fxRates?: FxRates;
};

function flattenChanges(
  batches: DetailPayload["pendingProfileChanges"],
): AdminProfileReviewConfig["changedFields"] {
  const map = new Map<string, { field: string; from: string; to: string }>();
  for (const batch of batches || []) {
    for (const ch of batch.changes || []) {
      if (!ch.field) continue;
      map.set(ch.field, { field: ch.field, from: ch.from, to: ch.to });
    }
  }
  return [...map.values()];
}

export function AdminProfileRemoderationPanel({
  partnerId,
  backHref = `${ADMIN_BASE}/moderation?tab=profiles`,
  backTarget = "profiles",
}: Props) {
  const { locale: adminLocale } = useAdminLocale();
  const partnerLocale: PartnerLocale = isPartnerLocale(adminLocale) ? adminLocale : "en";
  const label = adminBackLabel(adminLocale, backTarget);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<PartnerCompanySettings | null>(null);
  const [partnerCode, setPartnerCode] = useState<string | null>(null);
  const [changedFields, setChangedFields] = useState<AdminProfileReviewConfig["changedFields"]>([]);
  const [fxRates, setFxRates] = useState<FxRates>(DEFAULT_FX_RATES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/partners/${encodeURIComponent(partnerId)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as DetailPayload & { error?: string };
        if (!res.ok) throw new Error(data.error || "Partner not found");
        if (cancelled) return;
        const parsed = data.companySettings
          ? parseCompanySettings(data.companySettings, {
              companyName: data.displayName || "",
              email: data.email || "",
              phone: data.phone || "",
            })
          : defaultCompanySettings({
              companyName: data.displayName || "",
              email: data.email || "",
              phone: data.phone || "",
            });
        setSettings(parsed);
        setPartnerCode(data.partnerCode || null);
        setChangedFields(flattenChanges(data.pendingProfileChanges));
        if (data.fxRates) setFxRates(data.fxRates);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load partner");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partnerId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 text-sm font-semibold text-slate-600">
        {uiText(adminLocale, "Loading…", "იტვირთება…", "Загрузка…")}
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm font-semibold text-red-700">{error || "Partner not found"}</p>
        <Link href={backHref} className="mt-4 inline-block text-sm font-bold text-sky-800 underline">
          {label}
        </Link>
      </div>
    );
  }

  return (
    <PartnerLocaleProvider initialLocale={partnerLocale} lockToInitial>
      <PartnerPersonalInfoForm
        initial={settings}
        partnerStatus="PENDING_REMODERATION"
        pendingRemoderation
        partnerCode={partnerCode}
        fxRates={fxRates}
        adminReview={{
          partnerId,
          backHref,
          backLabel: label,
          changedFields,
        }}
      />
    </PartnerLocaleProvider>
  );
}
