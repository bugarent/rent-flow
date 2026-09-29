import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { SocialBadge } from "../social-badge";
import { languageLabel, normalizeSocial } from "../helpers";
import { cn } from "@/lib/utils";
import type { BookingInfoData, Copy } from "../types";

const fieldTone = {
  sky: "border-sky-200 bg-sky-50",
  emerald: "border-emerald-200 bg-emerald-50",
  amber: "border-amber-200 bg-amber-50",
  violet: "border-violet-200 bg-violet-50",
  slate: "border-slate-200 bg-slate-100",
} as const;

function FieldBox({
  label,
  children,
  className,
  tone = "sky",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  tone?: keyof typeof fieldTone;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-2 py-1 shadow-sm",
        fieldTone[tone],
        className,
      )}
    >
      <p className="text-[9px] font-bold uppercase leading-none tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-0.5 text-xs font-semibold leading-tight text-slate-900">
        {children}
      </div>
    </div>
  );
}

export function PartnerSection({
  t,
  locale,
  booking,
  calendarView = false,
  compact = false,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  calendarView?: boolean;
  /** Customer booking-lookup dialog — shorter cards. */
  compact?: boolean;
}) {
  const tight = calendarView || compact;

  return (
    <section
      className={cn(
        "rounded-xl bg-white shadow-sm",
        calendarView
          ? "border-2 border-slate-300 p-2.5"
          : compact
            ? "border border-slate-200 p-2"
            : "border border-slate-200 p-4",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center",
          calendarView ? "mb-2 gap-2" : compact ? "mb-1.5 gap-2" : "mb-3 gap-3",
        )}
      >
        {booking.partner?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={booking.partner.logoUrl}
            alt=""
            className={cn(
              "shrink-0 border border-slate-200 bg-white object-cover",
              tight ? "h-7 w-7 rounded-md" : "h-11 w-11 rounded-lg",
            )}
          />
        ) : (
          <span
            className={cn(
              "inline-flex shrink-0 items-center justify-center bg-[#eef5ff] text-[#1d6fe8]",
              tight ? "h-7 w-7 rounded-md" : "h-11 w-11 rounded-lg",
            )}
          >
            <Building2 className={tight ? "h-3.5 w-3.5" : "h-5 w-5"} />
          </span>
        )}
        <h3
          className={cn(
            "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-extrabold text-[#0b1f4b]",
            tight ? "text-xs" : "text-sm",
          )}
        >
          <span>{t.partner}</span>
          {booking.partner?.partnerCode ? (
            <span
              className={cn(
                "font-mono font-black tracking-wide text-[#1d6fe8]",
                calendarView ? "text-sm" : compact ? "text-sm" : "text-base",
              )}
            >
              {booking.partner.partnerCode}
            </span>
          ) : null}
        </h3>
      </div>

      {compact ? (
        <div className="grid gap-1 sm:grid-cols-2">
          <FieldBox label={t.company} tone="sky">
            {booking.partner?.companyName || "—"}
          </FieldBox>
          <FieldBox label={t.email} tone="violet">
            <span className="break-all">{booking.partner?.email || "—"}</span>
          </FieldBox>
          <FieldBox label={t.phone} tone="emerald">
            <div>
              <p>{booking.partner?.phone || "—"}</p>
              {normalizeSocial(booking.partner?.primaryMessengers || []).length ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {normalizeSocial(booking.partner?.primaryMessengers || []).map((platform) => (
                    <SocialBadge
                      key={`primary-${platform}`}
                      platform={platform}
                      locale={locale}
                      compact
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </FieldBox>
          <FieldBox label={t.secondaryPhone} tone="amber">
            <div>
              <p>{booking.partner?.secondaryPhone || "—"}</p>
              {normalizeSocial(booking.partner?.secondaryMessengers || []).length ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {normalizeSocial(booking.partner?.secondaryMessengers || []).map((platform) => (
                    <SocialBadge
                      key={`secondary-${platform}`}
                      platform={platform}
                      locale={locale}
                      compact
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </FieldBox>
          <FieldBox label={t.languages} tone="slate" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1">
              {(booking.partner?.clientLanguages || []).length ? (
                (booking.partner?.clientLanguages || []).map((code) => (
                  <span
                    key={code}
                    className="rounded-full bg-white px-1.5 py-0 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {languageLabel(code, locale)}
                  </span>
                ))
              ) : (
                "—"
              )}
            </div>
          </FieldBox>
        </div>
      ) : (
        <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between", tight ? "gap-2" : "gap-4")}>
          <dl
            className={cn(
              "grid min-w-0 flex-1 sm:grid-cols-2",
              tight ? "gap-1 text-xs" : "gap-2 text-sm",
            )}
          >
            <div>
              <dt className={cn(tight ? "text-[10px] leading-tight text-slate-500" : "text-xs text-slate-500")}>
                {t.company}
              </dt>
              <dd className={cn("font-semibold text-slate-900", tight && "leading-snug")}>
                {booking.partner?.companyName || "—"}
              </dd>
            </div>
            <div>
              <dt className={cn(tight ? "text-[10px] leading-tight text-slate-500" : "text-xs text-slate-500")}>
                {t.email}
              </dt>
              <dd className={cn("break-all font-semibold text-slate-900", tight && "leading-snug")}>
                {booking.partner?.email || "—"}
              </dd>
            </div>
            <div>
              <dt className={cn(tight ? "text-[10px] leading-tight text-slate-500" : "text-xs text-slate-500")}>
                {t.phone}
              </dt>
              <dd className={cn("font-semibold text-slate-900", tight && "leading-snug")}>
                {booking.partner?.phone || "—"}
              </dd>
              {normalizeSocial(booking.partner?.primaryMessengers || []).length ? (
                <div className={cn("flex flex-wrap items-center", tight ? "mt-1 gap-1" : "mt-1.5 gap-1.5")}>
                  {normalizeSocial(booking.partner?.primaryMessengers || []).map((platform) => (
                    <SocialBadge
                      key={`primary-${platform}`}
                      platform={platform}
                      locale={locale}
                      compact={tight}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <dt className={cn(tight ? "text-[10px] leading-tight text-slate-500" : "text-xs text-slate-500")}>
                {t.secondaryPhone}
              </dt>
              <dd className={cn("font-semibold text-slate-900", tight && "leading-snug")}>
                {booking.partner?.secondaryPhone || "—"}
              </dd>
              {normalizeSocial(booking.partner?.secondaryMessengers || []).length ? (
                <div className={cn("flex flex-wrap items-center", tight ? "mt-1 gap-1" : "mt-1.5 gap-1.5")}>
                  {normalizeSocial(booking.partner?.secondaryMessengers || []).map((platform) => (
                    <SocialBadge
                      key={`secondary-${platform}`}
                      platform={platform}
                      locale={locale}
                      compact={tight}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <dt className={cn(tight ? "text-[10px] leading-tight text-slate-500" : "text-xs text-slate-500")}>
                {t.languages}
              </dt>
              <dd className={cn("flex flex-wrap", tight ? "mt-0.5 gap-1" : "mt-1 gap-1.5")}>
                {(booking.partner?.clientLanguages || []).length ? (
                  (booking.partner?.clientLanguages || []).map((code) => (
                    <span
                      key={code}
                      className={cn(
                        "rounded-full bg-slate-100 font-semibold text-slate-700",
                        tight ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
                      )}
                    >
                      {languageLabel(code, locale)}
                    </span>
                  ))
                ) : (
                  <span className="font-semibold text-slate-900">—</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
