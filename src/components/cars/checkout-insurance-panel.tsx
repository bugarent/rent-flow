"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  Check,
  CreditCard,
  HelpCircle,
  Info,
  Settings2,
  Shield,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import type { CheckoutCopy } from "@/lib/i18n/checkout-copy";
import { knownText } from "@/lib/i18n/known-record-text";
import { usePreferences } from "@/components/providers/preferences-context";
import { CARD_PICKUP_SURCHARGE_PERCENT } from "@/lib/cars/reserve-pricing";
import { extraPeriodCharge } from "@/lib/extras/pricing";
import { cn, roundMoney } from "@/lib/utils";
import type { ReservePaidExtra } from "@/components/cars/reserve-checkout-helpers";

export { CARD_PICKUP_SURCHARGE_PERCENT };
export type PickupPaymentMethod = "card" | "cash";

function resolveInsuranceDetail(
  pack: ReservePaidExtra,
  copy: CheckoutCopy,
): {
  title: string;
  body: string;
  includes: string[];
  warns: string[];
  recommend: string | null;
} {
  const slot = pack.checkoutSlot;
  if (slot === "tpl") {
    return {
      title: copy.tplTitle,
      body: copy.tplBody,
      includes: [copy.tplIncludesItem],
      warns: [copy.tplOnlyWarn],
      recommend: null,
    };
  }
  if (slot === "basic") {
    return {
      title: copy.basicCoverTitle,
      body: copy.basicCoverBody,
      includes: [...copy.basicCoverIncludes],
      warns: [copy.basicCoverWarn],
      recommend: null,
    };
  }
  if (slot === "full") {
    return {
      title: copy.fullProtectCardTitle,
      body: copy.fullProtectCardBody,
      includes: [...copy.fullCoverIncludes],
      warns: [copy.fullCoverWarn],
      recommend: null,
    };
  }
  if (slot === "driver") {
    return {
      title: copy.additionalDriverTitle,
      body: copy.additionalDriverBody || pack.description || "",
      includes: [],
      warns: [],
      recommend: null,
    };
  }
  return {
    title: pack.name,
    body: pack.description || "",
    includes: [],
    warns: [],
    recommend: null,
  };
}

export function CheckoutInsurancePanel({
  copy,
  formatPrice,
  packs,
  selectedIds,
  onTogglePack,
  freeLabel,
  perDayLabel,
  days,
}: {
  copy: CheckoutCopy;
  formatPrice: (n: number) => string;
  packs: ReservePaidExtra[];
  selectedIds: Set<string>;
  onTogglePack: (extraId: string, next: boolean) => void;
  freeLabel: string;
  perDayLabel: string;
  /** Rental day count — daily prices are multiplied by this in the total. */
  days: number;
}) {
  const { locale } = usePreferences();
  const [detailId, setDetailId] = useState<string | null>(null);
  const enabledCount = packs.filter((pack) => selectedIds.has(pack.id)).length;
  const dayCount = Math.max(1, days || 1);
  const detailPack = packs.find((pack) => pack.id === detailId) ?? null;
  const detail = detailPack ? resolveInsuranceDetail(detailPack, copy) : null;

  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm">
      <div className="bg-sky-400 px-4 py-2.5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" />
          <h2 className="text-sm font-extrabold sm:text-base">{copy.insuranceTitle}</h2>
          <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold">
            {copy.insuranceIncludedCount.replace("{n}", String(enabledCount))}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2.5">
        {packs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-500">
            {copy.noExtras}
          </p>
        ) : (
          packs.map((pack) => {
            const locked = Boolean(pack.locked);
            const selected = locked || selectedIds.has(pack.id);
            const uncapped = pack.priceEur * dayCount;
            const lineTotal =
              pack.free
                ? 0
                : roundMoney(extraPeriodCharge(pack.priceEur, dayCount, 1, pack.maxPeriodEur, pack.minPeriodEur));
            const free = Boolean(pack.free) || lineTotal <= 0;
            const capped = !free && lineTotal + 0.009 < uncapped;
            return (
              <InsuranceToggleRow
                key={pack.id}
                title={knownText(locale, pack.name)}
                selected={selected}
                locked={locked}
                onToggle={() => {
                  if (locked) return;
                  onTogglePack(pack.id, !selected);
                }}
                free={free}
                dailyPriceLabel={free ? freeLabel : `${formatPrice(pack.priceEur)}${perDayLabel}`}
                daysHint={free || capped ? null : `x ${dayCount}`}
                lineTotalLabel={free ? null : formatPrice(lineTotal)}
                copy={copy}
                onOpenDetails={() => setDetailId(pack.id)}
              />
            );
          })
        )}
      </div>

      {detail && detailPack ? (
        <InsuranceDetailModal
          title={knownText(locale, detail.title)}
          body={detail.body}
          includes={detail.includes}
          warns={detail.warns}
          recommend={detail.recommend}
          includesHeading={copy.includesHeading}
          pleaseNoteLabel={copy.pleaseNoteLabel}
          recommendedLabel={copy.recommendedLabel}
          closeLabel={copy.detailsClose}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </section>
  );
}

export function PickupPaymentSection({
  copy,
  pickupPaymentMethod,
  onPickupPaymentMethodChange,
  compact = false,
}: {
  copy: CheckoutCopy;
  pickupPaymentMethod: PickupPaymentMethod;
  onPickupPaymentMethodChange: (next: PickupPaymentMethod) => void;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={cn("flex items-center gap-2 bg-[#1d6fe8] text-white", compact ? "px-3 py-2" : "px-4 py-3")}>
        <Settings2 className={cn("shrink-0", compact ? "h-4 w-4" : "h-5 w-5")} />
        <h2 className={cn("font-extrabold", compact ? "text-xs" : "text-sm sm:text-base")}>
          {copy.pickupPaymentTitle}
        </h2>
      </div>
      <div className={cn("grid gap-2", compact ? "grid-cols-1 p-2.5" : "p-4 sm:grid-cols-2")}>
        <PaymentTile
          selected={pickupPaymentMethod === "card"}
          onSelect={() => onPickupPaymentMethodChange("card")}
          icon={<CreditCard className="h-4 w-4" />}
          iconClass="text-[#1d6fe8]"
          title={copy.cardPayPlus.replace("{percent}", String(CARD_PICKUP_SURCHARGE_PERCENT))}
          subtitle={copy.cardPayBrands}
          compact={compact}
        />
        <PaymentTile
          selected={pickupPaymentMethod === "cash"}
          onSelect={() => onPickupPaymentMethodChange("cash")}
          icon={<Banknote className="h-4 w-4" />}
          iconClass="text-emerald-600"
          title={copy.cashAtPickupPay}
          subtitle={copy.cashAtPickupHint}
          compact={compact}
        />
      </div>
      {!compact ? (
        <div className="px-4 pb-4">
          <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {copy.pickupPayRefundHint}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function PaymentTile({
  selected,
  onSelect,
  icon,
  iconClass,
  title,
  subtitle,
  compact = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start justify-between gap-2 rounded-xl border text-left transition",
        compact ? "px-2.5 py-2" : "gap-3 px-3 py-3",
        selected
          ? "border-[#1d6fe8] bg-[#eef5ff] ring-2 ring-[#1d6fe8]/25"
          : "border-sky-100 bg-[#f4f8ff] hover:border-sky-200",
      )}
    >
      <span className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm",
            compact ? "h-7 w-7" : "h-8 w-8",
            iconClass,
          )}
        >
          {icon}
        </span>
        <span>
          <span className={cn("block font-extrabold text-[#0b1f4b]", compact ? "text-xs" : "text-sm")}>
            {title}
          </span>
          <span className={cn("block font-medium text-slate-500", compact ? "text-[10px]" : "text-xs")}>
            {subtitle}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "mt-1 flex shrink-0 items-center justify-center rounded-full border-2",
          compact ? "h-4 w-4" : "h-5 w-5",
          selected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white",
        )}
      >
        {selected ? <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

function InsuranceDetailModal({
  title,
  body,
  includes,
  warns,
  recommend,
  includesHeading,
  pleaseNoteLabel,
  recommendedLabel,
  closeLabel,
  onClose,
}: {
  title: string;
  body: string;
  includes: string[];
  warns: string[];
  recommend: string | null;
  includesHeading: string;
  pleaseNoteLabel: string;
  recommendedLabel: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-[#06281f]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="insurance-detail-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[min(92dvh,680px)] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(6,40,31,0.28)] ring-1 ring-teal-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-[#0f766e] px-4 py-4 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="relative flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h3
              id="insurance-detail-title"
              className="min-w-0 flex-1 pt-1.5 text-base font-extrabold leading-snug sm:text-[17px]"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[min(64dvh,460px)] space-y-3.5 overflow-y-auto px-4 py-4">
          {body ? (
            <p className="text-[15px] leading-relaxed text-slate-700">{body}</p>
          ) : null}

          {includes.length > 0 ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3.5 py-3">
              <p className="text-xs font-extrabold uppercase tracking-wide text-teal-800">
                {includesHeading}
              </p>
              <ul className="mt-2.5 space-y-2">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-slate-800">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {recommend ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-sm leading-snug text-emerald-950">
              <div className="flex items-center gap-2 font-extrabold text-emerald-800">
                <Star className="h-4 w-4 shrink-0 fill-emerald-600 text-emerald-600" />
                {recommendedLabel}
              </div>
              <p className="mt-1.5 ps-6 font-medium">{recommend}</p>
            </div>
          ) : null}

          {warns.map((note) => (
            <div
              key={note}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-snug text-amber-950"
            >
              <div className="flex items-center gap-2 font-extrabold text-amber-900">
                <Info className="h-4 w-4 shrink-0 text-amber-600" />
                {pleaseNoteLabel}
              </div>
              <p className="mt-1.5 ps-6 font-medium">{note}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#0f766e] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#0d6a63]"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InsuranceToggleRow({
  title,
  selected,
  locked,
  onToggle,
  free,
  dailyPriceLabel,
  daysHint,
  lineTotalLabel,
  copy,
  onOpenDetails,
}: {
  title: string;
  selected: boolean;
  locked?: boolean;
  onToggle: () => void;
  free: boolean;
  dailyPriceLabel: string;
  daysHint: string | null;
  lineTotalLabel: string | null;
  copy: CheckoutCopy;
  onOpenDetails: () => void;
}) {
  const inactive = !selected && !locked;
  const onGreen =
    "border-emerald-200 bg-emerald-50/70 ring-1 ring-emerald-100";
  const offYellow =
    "border-amber-200 bg-amber-50/60 ring-1 ring-amber-100";
  return (
    <article
      className={cn(
        "rounded-lg border px-2.5 py-2 shadow-sm transition",
        locked || free || selected ? onGreen : offYellow,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex-nowrap sm:gap-3">
        <div className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-auto">
          <ShieldCheck
            className={cn(
              "h-4 w-4 shrink-0",
              locked || selected ? "text-[#0a7a52]" : inactive ? "text-amber-600" : "text-slate-400",
            )}
          />
          <h3
            className={cn(
              "min-w-0 flex-1 break-words text-sm font-extrabold leading-snug sm:flex-initial",
              locked || selected ? "text-[#0b1f4b]" : inactive ? "text-amber-950" : "text-[#0b1f4b]",
            )}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onOpenDetails}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-extrabold underline-offset-2 hover:underline sm:text-[15px]",
              inactive
                ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                : "bg-white text-[#0f766e] ring-1 ring-[#0f766e]/25 shadow-sm",
            )}
          >
            <HelpCircle className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} />
            {copy.detailsLink}
          </button>
        </div>

        <div className="ms-auto flex min-w-0 shrink-0 flex-nowrap items-center gap-x-1.5 whitespace-nowrap text-end sm:ms-0 sm:gap-x-2">
          {free ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-sm font-extrabold sm:text-base",
                locked || selected ? "text-[#0a7a52]" : "text-amber-800",
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> {dailyPriceLabel}
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "text-[15px] font-extrabold leading-none sm:text-base",
                  selected ? "text-[#0a7a52]" : "text-amber-800",
                )}
              >
                <span
                  className={cn(
                    "me-1 text-xs font-semibold sm:text-[13px]",
                    inactive ? "text-amber-700/85" : "text-slate-500",
                  )}
                >
                  {copy.price}
                </span>
                {dailyPriceLabel}
              </span>
              {daysHint ? (
                <span
                  className={cn(
                    "text-sm font-bold leading-none sm:text-[15px]",
                    inactive ? "text-amber-800/90" : "text-slate-600",
                  )}
                >
                  {daysHint}
                </span>
              ) : null}
              {lineTotalLabel ? (
                <span
                  className={cn(
                    "text-[15px] font-extrabold leading-none sm:text-base",
                    selected ? "text-[#06281f]" : "text-amber-950",
                  )}
                >
                  {lineTotalLabel}
                </span>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={selected}
          aria-label={title}
          aria-disabled={locked}
          disabled={locked}
          onClick={onToggle}
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition",
            selected ? "bg-[#00865a]" : inactive ? "bg-amber-400" : "bg-slate-300",
            locked && "cursor-not-allowed opacity-90",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
              selected ? "start-4" : "start-0.5",
            )}
          />
        </button>
      </div>
    </article>
  );
}
