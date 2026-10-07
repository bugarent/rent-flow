"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PartnerPortalTopBar } from "@/components/partner/partner-portal-top-bar";
import { PartnerIdleLogout } from "@/components/partner/partner-idle-logout";
import { PartnerRemoderationBanner } from "@/components/partner/partner-remoderation-banner";
import { PARTNER_BASE, PARTNER_LOGIN, PARTNER_REGISTER, PARTNER_VERIFY } from "@/lib/routes";
import { HERO_BACKGROUND_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

function isAuthPath(pathname: string) {
  return pathname === PARTNER_LOGIN || pathname === PARTNER_REGISTER || pathname === PARTNER_VERIFY;
}

function isCalendarPath(pathname: string) {
  return pathname === PARTNER_BASE || pathname === `${PARTNER_BASE}/`;
}

function usesOwnPageBackground(pathname: string) {
  return (
    isCalendarPath(pathname) ||
    pathname === `${PARTNER_BASE}/personal-info` ||
    pathname.startsWith(`${PARTNER_BASE}/personal-info/`) ||
    pathname === `${PARTNER_BASE}/cars/new` ||
    pathname.startsWith(`${PARTNER_BASE}/cars/new/`) ||
    /^\/partner-portal\/cars\/[^/]+\/edit\/?$/.test(pathname)
  );
}

/**
 * Shared partner chrome: sticky top strip on every cabinet page.
 */
export function PartnerPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isAuthPath(pathname)) {
    return <>{children}</>;
  }

  const ownBg = usesOwnPageBackground(pathname);
  const calendar = isCalendarPath(pathname);

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col overflow-x-clip",
        calendar && "fixed inset-0 z-30 h-dvh max-h-dvh overflow-hidden",
      )}
    >
      <PartnerIdleLogout />
      {!ownBg ? (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${HERO_BACKGROUND_URL}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f4b]/78 via-[#1A3B5D]/72 to-[#e8eef5]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(24,120,196,0.28),_transparent_55%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#eef2f7] via-[#eef2f7]/95 to-transparent" />
        </div>
      ) : null}
      <header
        className={cn(
          "z-50 border-b border-slate-800 bg-[#0b1f4b] text-white shadow-sm",
          calendar ? "shrink-0" : "sticky top-0",
        )}
      >
        <div className="px-2 py-1.5 sm:px-3 sm:py-1">
          <PartnerPortalTopBar variant="dark" className="w-full" />
        </div>
      </header>
      <PartnerRemoderationBanner />
      <div className={cn("relative z-0 flex-1", calendar && "flex min-h-0 flex-col overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}
