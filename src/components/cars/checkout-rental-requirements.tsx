"use client";

import { useState } from "react";
import { Award, ChevronDown, Info, User } from "lucide-react";
import type { CheckoutCopy } from "@/lib/i18n/checkout-copy";
import { cn } from "@/lib/utils";
import { RentalTermsList } from "@/components/cars/rental-terms-list";
import type { RentalTermsItem } from "@/components/cars/rental-terms-list";

export function CheckoutRentalRequirements({
  copy,
  minDriverAge,
  minLicenseYears,
  termsItems,
}: {
  copy: CheckoutCopy;
  minDriverAge: number;
  minLicenseYears: number;
  termsItems: RentalTermsItem[];
}) {
  const [open, setOpen] = useState(false);
  const age = Math.max(0, Math.floor(Number(minDriverAge) || 0));
  const experience = Math.max(0, Math.floor(Number(minLicenseYears) || 0));

  return (
    <section className="overflow-hidden rounded-lg border border-sky-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2 bg-sky-400 px-4 py-2.5 text-left text-white"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-4 w-4 shrink-0" aria-hidden />
        <h2 className="min-w-0 flex-1 text-sm font-extrabold sm:text-base">
          {copy.rentalRequirementsTitle}
        </h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
            <User className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{copy.rentalRequirementsMinAge}</p>
            <p className="mt-0.5 text-base font-extrabold text-[#0b1f4b] sm:text-lg">
              {copy.rentalRequirementsAgeValue.replace("{n}", String(age))}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700">
            <Award className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">{copy.rentalRequirementsMinExperience}</p>
            <p className="mt-0.5 text-base font-extrabold text-[#0b1f4b] sm:text-lg">
              {copy.rentalRequirementsExperienceValue.replace("{n}", String(experience))}
            </p>
          </div>
        </div>
      </div>

      {open && termsItems.length > 0 ? (
        <div className="border-t border-slate-200">
          <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-slate-400 sm:px-5">
            {copy.rentalTermsModalTitle}
          </p>
          <RentalTermsList
            items={termsItems.filter(
              (item) => item.id !== "driver-age" && item.id !== "license",
            )}
            disclaimer={copy.rentalTermsDisclaimer}
          />
        </div>
      ) : null}
    </section>
  );
}
