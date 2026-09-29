"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminPillTab = {
  href: string;
  label: string;
  active?: boolean;
  /** Unread / pending count — tab turns yellow and shows the number. */
  badge?: number;
};

export function AdminPillTabs({ tabs }: { tabs: AdminPillTab[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const badge = Math.max(0, Math.floor(Number(tab.badge) || 0));
        const hasUnread = badge > 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:py-2",
              hasUnread
                ? "admin-nav-unread-blink border border-amber-500 bg-amber-400 font-extrabold text-[#0b1f4b]"
                : tab.active
                  ? "bg-[#0b1f4b] text-white"
                  : "border bg-white text-slate-600 hover:bg-slate-50",
              hasUnread && tab.active && "ring-2 ring-[#0b1f4b]/30",
            )}
          >
            {tab.label}
            {hasUnread ? (
              <span className="rounded-full bg-[#0b1f4b] px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
