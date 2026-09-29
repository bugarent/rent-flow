import { Users } from "lucide-react";
import type { ReactNode } from "react";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { cn } from "@/lib/utils";
import { SocialBadge } from "../social-badge";
import { ageInYears, formatBirthDate, normalizeSocial } from "../helpers";
import type { BookingInfoData, Copy } from "../types";

function FieldWindow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-300 bg-white px-2 py-1.5 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 text-xs font-semibold leading-snug text-slate-900">{children}</div>
    </div>
  );
}

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

export function GuestSection({
  t,
  locale,
  booking,
  guestName,
  canEditAll,
  hideAge,
  editingDates,
  driverFirst,
  driverLast,
  driverEmail,
  driverPhone,
  setDriverFirst,
  setDriverLast,
  setDriverEmail,
  setDriverPhone,
  calendarView = false,
  compact = false,
}: {
  t: Copy;
  locale: string;
  booking: BookingInfoData;
  guestName: string;
  canEditAll: boolean;
  hideAge?: boolean;
  editingDates: boolean;
  driverFirst: string;
  driverLast: string;
  driverEmail: string;
  driverPhone: string;
  setDriverFirst: (value: string) => void;
  setDriverLast: (value: string) => void;
  setDriverEmail: (value: string) => void;
  setDriverPhone: (value: string) => void;
  /** Compact split-field layout used only from partner calendar booking bars. */
  calendarView?: boolean;
  /** Customer booking-lookup dialog — shorter cards. */
  compact?: boolean;
}) {
  const firstName =
    (booking.guestFirstName || "").trim() ||
    guestName.trim().split(/\s+/)[0] ||
    "—";
  const lastName =
    (booking.guestLastName || "").trim() ||
    guestName.trim().split(/\s+/).slice(1).join(" ") ||
    "—";
  const messengers = normalizeSocial(
    booking.guestMessengers?.length
      ? booking.guestMessengers
      : booking.guestMessenger
        ? [booking.guestMessenger]
        : [],
  );

  if (!calendarView) {
    return (
      <section
        className={cn(
          "rounded-xl border border-slate-200 bg-white shadow-sm",
          compact ? "p-2" : "p-4",
        )}
      >
        <h3
          className={cn(
            "flex items-center font-extrabold text-[#0b1f4b]",
            compact ? "mb-1.5 gap-1.5 text-xs" : "mb-3 gap-2 text-sm",
          )}
        >
          <Users className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "text-[#1d6fe8]")} />
          {t.driver}
        </h3>
        {canEditAll && editingDates ? (
          <div className={cn("grid sm:grid-cols-2", compact ? "gap-1.5" : "gap-2")}>
            <input
              className={cn(
                "rounded-md border border-slate-200",
                compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-sm",
              )}
              value={driverFirst}
              onChange={(e) => setDriverFirst(e.target.value)}
              placeholder={t.name}
            />
            <input
              className={cn(
                "rounded-md border border-slate-200",
                compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-sm",
              )}
              value={driverLast}
              onChange={(e) => setDriverLast(e.target.value)}
              placeholder={t.lastName || t.name}
            />
            <input
              className={cn(
                "rounded-md border border-slate-200 sm:col-span-2",
                compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-sm",
              )}
              value={driverEmail}
              onChange={(e) => setDriverEmail(e.target.value)}
              placeholder={t.email}
            />
            <input
              className={cn(
                "rounded-md border border-slate-200 sm:col-span-2",
                compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-2 text-sm",
              )}
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder={t.phone}
            />
          </div>
        ) : compact ? (
          <div className="grid gap-1 sm:grid-cols-2">
            <FieldBox label={t.name} tone="sky">
              {firstName}
            </FieldBox>
            <FieldBox label={t.lastName || t.name} tone="sky">
              {lastName || "—"}
            </FieldBox>
            <FieldBox label={t.email} tone="violet">
              <span className="break-all">{booking.guestEmail || "—"}</span>
            </FieldBox>
            <FieldBox label={t.phone} tone="emerald">
              <div>
                <p>{booking.guestPhone || "—"}</p>
                {messengers.length ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {messengers.map((platform) => (
                      <SocialBadge
                        key={`driver-${platform}`}
                        platform={platform}
                        locale={locale}
                        compact
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </FieldBox>
            <FieldBox label={t.flight} tone="amber">
              {booking.flightNumber || "—"}
            </FieldBox>
            <FieldBox label={t.birthDate} tone="amber">
              {formatBirthDate(booking.dateOfBirth || "", locale) || "—"}
            </FieldBox>
            {hideAge ? null : (
              <FieldBox label={t.age} tone="slate">
                {ageInYears(booking.dateOfBirth || "", booking.pickupAt) ?? "—"}
              </FieldBox>
            )}
            <FieldBox label={t.residenceCountry} tone="slate">
              {booking.countryOfResidence
                ? worldCountryName(booking.countryOfResidence) || booking.countryOfResidence
                : "—"}
            </FieldBox>
          </div>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">{t.name}</dt>
              <dd className="font-semibold text-slate-900">{guestName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t.email}</dt>
              <dd className="break-all font-semibold text-slate-900">
                {booking.guestEmail || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t.phone}</dt>
              <dd className="font-semibold text-slate-900">{booking.guestPhone || "—"}</dd>
              {messengers.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {messengers.map((platform) => (
                    <SocialBadge
                      key={`driver-${platform}`}
                      platform={platform}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t.flight}</dt>
              <dd className="font-semibold text-slate-900">{booking.flightNumber || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">{t.birthDate}</dt>
              <dd className="font-semibold text-slate-900">
                {formatBirthDate(booking.dateOfBirth || "", locale) || "—"}
              </dd>
            </div>
            {hideAge ? null : (
              <div>
                <dt className="text-xs text-slate-500">{t.age}</dt>
                <dd className="font-semibold text-slate-900">
                  {ageInYears(booking.dateOfBirth || "", booking.pickupAt) ?? "—"}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-500">{t.residenceCountry}</dt>
              <dd className="font-semibold text-slate-900">
                {booking.countryOfResidence
                  ? worldCountryName(booking.countryOfResidence) || booking.countryOfResidence
                  : "—"}
              </dd>
            </div>
          </dl>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-lg border-2 border-slate-300 bg-slate-50/80 p-2 shadow-sm sm:p-2.5">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-[#0b1f4b]">
        <Users className="h-3.5 w-3.5 text-[#1d6fe8]" />
        {t.driver}
      </h3>
      {canEditAll && editingDates ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          <FieldWindow label={t.name}>
            <input
              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold"
              value={driverFirst}
              onChange={(e) => setDriverFirst(e.target.value)}
              placeholder={t.name}
            />
          </FieldWindow>
          <FieldWindow label={t.lastName}>
            <input
              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold"
              value={driverLast}
              onChange={(e) => setDriverLast(e.target.value)}
              placeholder={t.lastName}
            />
          </FieldWindow>
          <FieldWindow label={t.email}>
            <input
              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold"
              value={driverEmail}
              onChange={(e) => setDriverEmail(e.target.value)}
              placeholder={t.email}
            />
          </FieldWindow>
          <FieldWindow label={t.phone}>
            <input
              className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder={t.phone}
            />
          </FieldWindow>
        </div>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          <FieldWindow label={t.name}>{firstName}</FieldWindow>
          <FieldWindow label={t.lastName}>{lastName || "—"}</FieldWindow>
          <FieldWindow label={t.email}>
            <span className="break-all">{booking.guestEmail || "—"}</span>
          </FieldWindow>
          <FieldWindow label={t.phone}>
            <div>
              <p>{booking.guestPhone || "—"}</p>
              {messengers.length ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {messengers.map((platform) => (
                    <SocialBadge
                      key={`driver-${platform}`}
                      platform={platform}
                      locale={locale}
                      compact
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </FieldWindow>
          <FieldWindow label={t.flight}>{booking.flightNumber || "—"}</FieldWindow>
          <FieldWindow label={t.birthDate}>
            {formatBirthDate(booking.dateOfBirth || "", locale) || "—"}
          </FieldWindow>
          {hideAge ? null : (
            <FieldWindow label={t.age}>
              {ageInYears(booking.dateOfBirth || "", booking.pickupAt) ?? "—"}
            </FieldWindow>
          )}
          <FieldWindow label={t.residenceCountry}>
            {booking.countryOfResidence
              ? worldCountryName(booking.countryOfResidence) || booking.countryOfResidence
              : "—"}
          </FieldWindow>
        </div>
      )}
    </section>
  );
}
