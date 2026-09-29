"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminPillTabs, type AdminPillTab } from "@/components/admin/admin-pill-tabs";

type BadgeCounts = {
  bookings: number;
  refunds: number;
  chat: number;
};

/**
 * Bookings-section pill tabs with live yellow unread badges
 * (new bookings, pending refund invoices, custom-booking chat).
 */
export function AdminBookingsPillTabs({ tabs }: { tabs: AdminPillTab[] }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeCounts>({ bookings: 0, refunds: 0, chat: 0 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [bookingRes, chatRes, refundRes] = await Promise.all([
          fetch("/api/admin/bookings/unread", { cache: "no-store" }),
          fetch("/api/admin/custom-booking/unread", { cache: "no-store" }),
          fetch("/api/admin/bookings/refunds?status=PENDING", { cache: "no-store" }),
        ]);
        const bookingData = await bookingRes.json().catch(() => ({}));
        const chatData = await chatRes.json().catch(() => ({}));
        const refundData = await refundRes.json().catch(() => ({}));
        if (cancelled) return;
        const refunds = refundRes.ok
          ? Number(refundData.unreadTotal) ||
            (Array.isArray(refundData.refunds)
              ? refundData.refunds.filter(
                  (r: { unreadByAdmin?: boolean; status?: string }) =>
                    r.status === "PENDING" && r.unreadByAdmin !== false,
                ).length
              : 0)
          : 0;
        setBadges({
          bookings: bookingRes.ok ? Number(bookingData.unreadTotal) || 0 : 0,
          chat: chatRes.ok ? Number(chatData.unreadTotal) || 0 : 0,
          refunds,
        });
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  const withBadges = tabs.map((tab) => {
    const href = tab.href;
    let badge = tab.badge ?? 0;
    if (/[?&]tab=refunds(?:&|$)/.test(href) || href.endsWith("tab=refunds")) {
      badge = badges.refunds;
    } else if (/[?&]tab=chat(?:&|$)/.test(href) || href.endsWith("tab=chat")) {
      badge = badges.chat;
    } else if (
      href.includes("/bookings") &&
      !href.includes("tab=") &&
      !href.includes("tab%3D")
    ) {
      badge = badges.bookings;
    }
    return { ...tab, badge };
  });

  return <AdminPillTabs tabs={withBadges} />;
}
