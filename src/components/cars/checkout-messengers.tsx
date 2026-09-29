"use client";

import { socialLabel } from "@/components/bookings/booking-info-modal/helpers";
import { MessengerLogo } from "@/components/partner/phone-messenger-icons";
import type { PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";

const ORDER: PartnerSocialPlatform[] = ["VIBER", "WHATSAPP", "TELEGRAM"];

const BRAND: Record<PartnerSocialPlatform, string> = {
  VIBER: "border-[#7360F2] bg-[#7360F2] text-white",
  WHATSAPP: "border-[#25D366] bg-[#25D366] text-white",
  TELEGRAM: "border-[#2AABEE] bg-[#2AABEE] text-white",
};

export function messengerRequiredMessage(locale: string) {
  if (locale === "ka") return "მონიშნეთ ერთი სოციალური ქსელი მაინც.";
  if (locale === "ru") return "Отметьте хотя бы одну соцсеть.";
  return "Select at least one messenger.";
}

export function messengerFieldLabel(locale: string) {
  if (locale === "ka") return "სოციალური ქსელი";
  if (locale === "ru") return "Соцсеть";
  return "Messenger";
}

export function CheckoutMessengers({
  locale,
  selected,
  invalid,
  onChange,
}: {
  locale: string;
  selected: PartnerSocialPlatform[];
  invalid?: boolean;
  onChange: (next: PartnerSocialPlatform[]) => void;
}) {
  const toggle = (value: PartnerSocialPlatform) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <fieldset
      className="block"
      data-invalid-field={invalid ? "true" : undefined}
    >
      <legend className={cn("text-sm font-semibold", invalid ? "text-red-600" : "text-slate-700")}>
        {messengerFieldLabel(locale)} *
      </legend>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
        {ORDER.map((platform) => {
          const checked = selected.includes(platform);
          return (
            <label
              key={platform}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold",
                invalid
                  ? "border-red-500 bg-red-50 text-red-700"
                  : cn(BRAND[platform], checked ? "ring-2 ring-slate-900 ring-offset-1" : "opacity-80"),
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(platform)}
                className={cn(
                  "h-4 w-4 shrink-0",
                  invalid ? "accent-red-600" : "accent-white",
                )}
                aria-invalid={invalid || undefined}
              />
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white",
                  invalid
                    ? platform === "VIBER"
                      ? "bg-[#7360F2]"
                      : platform === "WHATSAPP"
                        ? "bg-[#25D366]"
                        : "bg-[#2AABEE]"
                    : "bg-white/25",
                )}
              >
                <MessengerLogo platform={platform} />
              </span>
              {socialLabel(platform, locale)}
            </label>
          );
        })}
      </div>
      {invalid ? (
        <span className="mt-1 block text-xs font-semibold text-red-600">
          {messengerRequiredMessage(locale)}
        </span>
      ) : null}
    </fieldset>
  );
}
