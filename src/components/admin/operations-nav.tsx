"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { ADMIN_BASE } from "@/lib/routes";
import { PortalSignOut } from "@/components/auth/portal-sign-out";
import {
  AdminCurrencySelect,
  AdminLanguageSelect,
} from "@/components/admin/admin-language-select";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { MobileNavDrawer } from "@/components/ui/mobile-nav-drawer";
import { cn } from "@/lib/utils";
import { getAdminChatSoundId, playChatSound } from "@/lib/chat-notification-sound";

function isLinkActive(pathname: string, href: string, exact: boolean) {
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminOperationsNav() {
  const pathname = usePathname() || ADMIN_BASE;
  const { dictionary } = useAdminLocale();
  const t = dictionary.nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bookingUnread, setBookingUnread] = useState(0);
  const [refundUnread, setRefundUnread] = useState(0);
  const [moderationUnread, setModerationUnread] = useState(0);
  const [partnersUnread, setPartnersUnread] = useState(0);
  const [businessPartnerUnread, setBusinessPartnerUnread] = useState(0);
  const [badgesReady, setBadgesReady] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);
  const soundReadyRef = useRef(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setBadgesReady(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [chatRes, moderationRes, bookingRes, refundRes, bpRes] = await Promise.all([
          fetch("/api/admin/custom-booking/unread", { cache: "no-store" }),
          fetch("/api/admin/moderation/unread", { cache: "no-store" }),
          fetch("/api/admin/bookings/unread", { cache: "no-store" }),
          fetch("/api/admin/bookings/refunds?status=PENDING", { cache: "no-store" }),
          fetch("/api/admin/business-partners/unread", { cache: "no-store" }),
        ]);
        const chatData = await chatRes.json().catch(() => ({}));
        const moderationData = await moderationRes.json().catch(() => ({}));
        const bookingData = await bookingRes.json().catch(() => ({}));
        const refundData = await refundRes.json().catch(() => ({}));
        const bpData = await bpRes.json().catch(() => ({}));
        if (cancelled) return;
        const nextChat = chatRes.ok ? Number(chatData.unreadTotal) || 0 : 0;
        const nextModeration = moderationRes.ok ? Number(moderationData.unreadTotal) || 0 : 0;
        const nextPartners = moderationRes.ok ? Number(moderationData.partnersDirectory) || 0 : 0;
        const nextBookings = bookingRes.ok ? Number(bookingData.unreadTotal) || 0 : 0;
        const nextRefunds = refundRes.ok
          ? Number(refundData.unreadTotal) ||
            (Array.isArray(refundData.refunds)
              ? refundData.refunds.filter(
                  (r: { unreadByAdmin?: boolean }) => r.unreadByAdmin !== false,
                ).length
              : 0)
          : 0;
        const nextBp = bpRes.ok ? Number(bpData.unreadTotal) || 0 : 0;
        const prev = prevUnreadRef.current;
        const combined = nextChat + nextModeration + nextPartners + nextBookings + nextRefunds + nextBp;
        if (soundReadyRef.current && prev != null && combined > prev) {
          playChatSound(getAdminChatSoundId());
        }
        prevUnreadRef.current = combined;
        soundReadyRef.current = true;
        setUnread(nextChat);
        setBookingUnread(nextBookings);
        setRefundUnread(nextRefunds);
        setModerationUnread(nextModeration);
        setPartnersUnread(nextPartners);
        setBusinessPartnerUnread(nextBp);
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  const links = [
    { href: `${ADMIN_BASE}/help`, label: t.help, exact: false },
    { href: ADMIN_BASE, label: t.homepage, exact: true },
    { href: `${ADMIN_BASE}/cars`, label: t.cars, exact: false },
    {
      href: `${ADMIN_BASE}/bookings`,
      label: t.bookings,
      exact: false,
      badge: bookingUnread + unread + refundUnread,
    },
    { href: `${ADMIN_BASE}/moderation`, label: t.moderation, exact: false, badge: moderationUnread },
    { href: `${ADMIN_BASE}/partners`, label: t.partners, exact: false, badge: partnersUnread },
    {
      href: `${ADMIN_BASE}/business-partners`,
      label: t.businessPartners,
      exact: false,
      badge: businessPartnerUnread,
    },
    { href: `${ADMIN_BASE}/integrations`, label: t.integrations, exact: false },
    { href: `${ADMIN_BASE}/delivery`, label: t.delivery, exact: false },
    { href: `${ADMIN_BASE}/extras`, label: t.extras, exact: false },
    { href: `${ADMIN_BASE}/settings`, label: t.settings, exact: false },
  ] as const;

  const totalBadge =
    (badgesReady
      ? bookingUnread + unread + refundUnread + moderationUnread + partnersUnread + businessPartnerUnread
      : 0) || 0;

  const renderLink = (l: (typeof links)[number], opts?: { stacked?: boolean }) => {
    const active = isLinkActive(pathname, l.href, l.exact);
    const badge = badgesReady && "badge" in l ? l.badge : 0;
    const hasUnread = Boolean(badge);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        onClick={closeMenu}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md transition",
          opts?.stacked
            ? "min-h-11 w-full justify-between px-3 py-2.5 text-sm"
            : "px-2.5 py-1.5 text-sm",
          active
            ? "bg-white/15 font-bold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
            : "font-normal text-white/70 hover:bg-white/10 hover:text-white",
          hasUnread
            ? "admin-nav-unread-blink bg-amber-400 font-extrabold text-[#0b1f4b] hover:bg-amber-300 hover:text-[#0b1f4b]"
            : "",
        )}
      >
        <span>{l.label}</span>
        {badge ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
              hasUnread ? "bg-[#0b1f4b] text-amber-300" : "bg-amber-400 text-[#0b1f4b]",
            )}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0b1f4b] text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <button
          type="button"
          className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15 md:hidden"
          aria-label={dictionary.common.openMenu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
          {totalBadge > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-[#0b1f4b]">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          ) : null}
        </button>

        <nav
          className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 text-sm md:flex"
          aria-label={dictionary.navAria}
        >
          {links.map((l) => renderLink(l))}
        </nav>

        <p className="min-w-0 flex-1 truncate text-sm font-extrabold md:hidden">Admin</p>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <AdminCurrencySelect />
          <AdminLanguageSelect />
          <PortalSignOut
            portal="admin"
            label={dictionary.signOut}
            className="hidden text-xs text-white/60 hover:text-white sm:inline"
          />
        </div>
      </div>

      <MobileNavDrawer
        open={menuOpen}
        onClose={closeMenu}
        title={dictionary.brand}
        closeLabel={dictionary.common.closeMenu}
      >
        <nav className="flex flex-col gap-1" aria-label={dictionary.navAria}>
          {links.map((l) => renderLink(l, { stacked: true }))}
          <div className="mt-3 border-t border-white/10 pt-3 sm:hidden">
            <PortalSignOut
              portal="admin"
              label={dictionary.signOut}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white/10 px-3 text-sm font-semibold text-red-100 hover:bg-white/15"
            />
          </div>
        </nav>
      </MobileNavDrawer>
    </header>
  );
}
