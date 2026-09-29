"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, Home, Search, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePreferences } from "@/components/providers/preferences-context";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { dictionary } = usePreferences();
  const { data: session } = useSession();

  const items = [
    { href: "/", label: dictionary.nav.home, icon: Home },
    { href: "/cars", label: dictionary.nav.search, icon: Search },
    { href: "/account", label: dictionary.nav.bookings, icon: Car },
    {
      href: session?.user ? "/account" : "/",
      label: dictionary.nav.account,
      icon: UserRound,
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-4">
        {items.map((item, index) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={`${item.href}-${index}`}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium",
                  active ? "text-sky-600" : "text-slate-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
