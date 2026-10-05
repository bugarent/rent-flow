"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, CircleHelp, Home, Search } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { requestOpenManageBooking } from "@/components/layout/open-manage-booking";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { dictionary } = usePreferences();
  const hideCustomerTools =
    pathname === "/partnership" ||
    pathname.startsWith("/partnership/") ||
    pathname === "/business-partnership" ||
    pathname.startsWith("/business-partnership/") ||
    pathname === "/business-portal" ||
    pathname.startsWith("/business-portal/");

  const items: Array<{
    key: string;
    label: string;
    icon: typeof Home;
    href?: string;
    active?: boolean;
    onClick?: () => void;
  }> = [
    { key: "home", href: "/", label: dictionary.nav.home, icon: Home, active: pathname === "/" },
    {
      key: "search",
      href: "/cars",
      label: dictionary.nav.search,
      icon: Search,
      active: pathname === "/cars",
    },
    hideCustomerTools
      ? {
          key: "bookings",
          href: "/account",
          label: dictionary.nav.bookings,
          icon: Car,
          active: pathname === "/account",
        }
      : {
          key: "bookings",
          label: dictionary.nav.bookings,
          icon: Car,
          onClick: () => requestOpenManageBooking(),
        },
  ];

  if (!hideCustomerTools) {
    items.push({
      key: "help",
      href: "/help",
      label: dictionary.nav.help,
      icon: CircleHelp,
      active: pathname === "/help" || pathname.startsWith("/help/"),
    });
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className={cn("grid", hideCustomerTools ? "grid-cols-3" : "grid-cols-4")}>
        {items.map((item) => {
          const Icon = item.icon;
          const className = cn(
            "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight sm:text-[11px]",
            item.active ? "text-sky-700" : "text-slate-600",
          );
          const label = <span className="line-clamp-2 max-w-full">{item.label}</span>;
          return (
            <li key={item.key} className="min-w-0">
              {item.href ? (
                <Link href={item.href} className={className}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              ) : (
                <button type="button" className={cn(className, "w-full")} onClick={item.onClick}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
