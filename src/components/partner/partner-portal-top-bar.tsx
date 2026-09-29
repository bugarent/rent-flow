"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, Plus, UserRound } from "lucide-react";
import { PARTNER_BASE } from "@/lib/routes";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { usePartnerMoney } from "@/components/providers/partner-money-context";
import { PartnerLanguageSelect } from "@/components/partner/partner-language-select";
import { PartnerCurrencySelect } from "@/components/partner/partner-currency-select";
import { PortalSignOut } from "@/components/auth/portal-sign-out";
import { MobileNavDrawer } from "@/components/ui/mobile-nav-drawer";
import type { PartnerPricingCurrency } from "@/lib/partners/company-settings";
import { cn } from "@/lib/utils";

type Variant = "dark" | "light";

function isActivePath(pathname: string, href: string, mode: "exact" | "prefix" = "prefix") {
  if (mode === "exact") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Top strip: hamburger (mobile) / nav links (desktop) | currency, language, sign out
 */
export function PartnerPortalTopBar({
  variant = "dark",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const pathname = usePathname();
  const { dictionary } = usePartnerLocale();
  const { pricingCurrency, setPricingCurrency } = usePartnerMoney();
  const t = dictionary.calendar;
  const dark = variant === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const onCurrencyChange = useCallback(
    (next: PartnerPricingCurrency) => {
      setPricingCurrency(next);
    },
    [setPricingCurrency],
  );

  const linkClass = (active: boolean, opts?: { addCar?: boolean; stacked?: boolean }) =>
    cn(
      "inline-flex max-w-full items-center gap-1.5 rounded-lg font-semibold transition",
      opts?.stacked
        ? "min-h-11 w-full justify-start px-3 py-2.5 text-sm"
        : "shrink items-center gap-0.5 px-1.5 py-1 text-[11px] leading-tight whitespace-nowrap",
      opts?.addCar
        ? active
          ? dark
            ? "bg-emerald-400 font-bold text-[#0b1f4b] ring-2 ring-white/70"
            : "bg-[#218838] font-bold text-white ring-2 ring-[#0b1f4b]/25"
          : dark
            ? "bg-emerald-500 font-bold text-white hover:bg-emerald-600"
            : "bg-[#28a745] font-bold text-white hover:bg-[#218838]"
        : active
          ? dark
            ? "bg-white font-bold text-[#0b1f4b] shadow-sm"
            : "bg-[#0b1f4b] font-bold text-white"
          : dark
            ? "text-white/85 hover:bg-white/10 hover:text-white"
            : "opacity-80 hover:bg-black/5 hover:opacity-100",
    );

  const iconClass = "hidden h-3 w-3 shrink-0 xl:inline";

  const items = [
    {
      href: PARTNER_BASE,
      label: t.calendar,
      icon: CalendarDays,
      mode: "exact" as const,
    },
    {
      href: `${PARTNER_BASE}/cars/new`,
      label: t.addCar,
      icon: Plus,
      mode: "prefix" as const,
      addCar: true,
      hideLabelOnSmall: true,
    },
    {
      href: `${PARTNER_BASE}/personal-info`,
      label: t.personalInfo,
      icon: UserRound,
      mode: "prefix" as const,
    },
    {
      href: `${PARTNER_BASE}/bookings`,
      label: dictionary.nav.bookings,
      mode: "prefix" as const,
    },
    {
      href: `${PARTNER_BASE}/delivery`,
      label: t.delivery,
      mode: "prefix" as const,
    },
    {
      href: `${PARTNER_BASE}/discounts`,
      label: t.discounts,
      mode: "prefix" as const,
    },
    {
      href: `${PARTNER_BASE}/equipment-service`,
      label: t.equipmentService,
      mode: "prefix" as const,
      truncate: true,
    },
    {
      href: `${PARTNER_BASE}/integration`,
      label: t.integration,
      mode: "prefix" as const,
    },
  ];

  const activeLabel =
    items.find((item) => isActivePath(pathname, item.href, item.mode))?.label ?? "Partner";

  return (
    <div className={cn("flex w-full min-w-0 items-center gap-x-1", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg md:hidden",
          dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-[#0b1f4b]",
        )}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-white md:hidden">
        {activeLabel}
      </p>

      <nav
        className="hidden min-w-0 flex-1 flex-nowrap items-center gap-x-0.5 overflow-x-auto overscroll-x-contain md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t.other}
      >
        {items.map((item) => {
          const active = isActivePath(pathname, item.href, item.mode);
          const Icon = "icon" in item ? item.icon : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                linkClass(active, { addCar: item.addCar }),
                item.truncate ? "min-w-0 shrink" : "shrink-0",
              )}
            >
              {Icon ? (
                <Icon className={item.addCar ? "h-3 w-3 shrink-0" : iconClass} />
              ) : null}
              {item.hideLabelOnSmall ? (
                <span className="hidden lg:inline">{item.label}</span>
              ) : item.truncate ? (
                <span className="truncate">{item.label}</span>
              ) : (
                item.label
              )}
            </Link>
          );
        })}
      </nav>

      <div className="ms-auto flex shrink-0 items-center gap-1">
        <PartnerCurrencySelect
          compact
          symbolOnly
          variant={dark ? "dark" : "light"}
          value={pricingCurrency}
          onChange={onCurrencyChange}
          label={dictionary.common.currency}
        />
        <PartnerLanguageSelect compact flagOnly variant={dark ? "dark" : "light"} />
        <PortalSignOut
          portal="partner"
          label={dictionary.signOut}
          className={cn(
            "hidden shrink-0 whitespace-nowrap rounded px-1.5 py-1 text-[11px] font-semibold sm:inline-flex",
            dark
              ? "bg-white/10 text-red-100 hover:bg-white/15 hover:text-white"
              : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
          )}
        />
      </div>

      <MobileNavDrawer open={menuOpen} onClose={closeMenu} title="Partner" closeLabel="Close menu">
        <nav className="flex flex-col gap-1" aria-label={t.other}>
          {items.map((item) => {
            const active = isActivePath(pathname, item.href, item.mode);
            const Icon = "icon" in item ? item.icon : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
                className={linkClass(active, { addCar: item.addCar, stacked: true })}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                {item.label}
              </Link>
            );
          })}
          <div className="mt-3 border-t border-white/10 pt-3 sm:hidden">
            <PortalSignOut
              portal="partner"
              label={dictionary.signOut}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white/10 px-3 text-sm font-semibold text-red-100 hover:bg-white/15"
            />
          </div>
        </nav>
      </MobileNavDrawer>
    </div>
  );
}
