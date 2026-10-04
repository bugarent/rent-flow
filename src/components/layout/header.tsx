"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CurrencySelect, LanguageSelect, headerChipClass } from "@/components/layout/header-selects";
import { getBusinessPartnershipCopy } from "@/lib/i18n/business-partnership-copy";
import { BUSINESS_PARTNER_LOGIN } from "@/lib/routes";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";

const ManageBookingModal = dynamic(
  () =>
    import("@/components/layout/manage-booking-modal").then((m) => m.ManageBookingModal),
  { ssr: false, loading: () => <RouteLoadingSpinner /> },
);

const navLinkClass = `${headerChipClass} whitespace-nowrap`;
const mobileChipClass = "max-sm:h-9 max-sm:min-h-9 max-sm:gap-1 max-sm:px-2.5 max-sm:text-xs";

const helpButtonClass = headerChipClass;

const loginButtonClass = `${headerChipClass} sm:px-6`;

function scrollToPageStart() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function Header({ overlay = false }: { overlay?: boolean }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { locale, setLocale, currency, setCurrency, dictionary } = usePreferences();
  const [open, setOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingMounted, setBookingMounted] = useState(false);
  const [lookupRef, setLookupRef] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const isPartnershipPage =
    pathname === "/partnership" ||
    pathname.startsWith("/partnership/") ||
    pathname === "/business-partnership" ||
    pathname.startsWith("/business-partnership/");
  const isBusinessPortalPage =
    pathname === "/business-portal" || pathname.startsWith("/business-portal/");
  /** Hide Help / My booking on partnership & partner cabinet (customer tools only). */
  const hideCustomerNav = isPartnershipPage || isBusinessPortalPage;
  const bpCopy = isPartnershipPage ? getBusinessPartnershipCopy(locale) : null;

  useEffect(() => {
    if (bookingOpen) setBookingMounted(true);
  }, [bookingOpen]);

  useEffect(() => {
    const booked = searchParams.get("booked");
    if (booked !== "1" && booked !== "true") return;
    const ref = (searchParams.get("ref") || "").trim();
    const email = (searchParams.get("email") || "").trim();
    setLookupRef(ref);
    setLookupEmail(email);
    setBookingMounted(true);
    setBookingOpen(true);
    router.replace(pathname || "/", { scroll: false });
  }, [searchParams, pathname, router]);

  const myBookingButton = (
    <button
      type="button"
      className={navLinkClass}
      onClick={() => {
        setOpen(false);
        setLookupRef("");
        setLookupEmail("");
        setBookingOpen(true);
      }}
    >
      {dictionary.nav.myBooking}
    </button>
  );

  const helpButton = (
    <Link href="/help" className={helpButtonClass} onClick={() => setOpen(false)}>
      {dictionary.nav.help}
    </Link>
  );

  const authButton = session?.user ? (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        void signOut({ callbackUrl: "/" });
      }}
      className={loginButtonClass}
    >
      {dictionary.nav.logout}
    </button>
  ) : null;

  return (
    <>
      <header
        className={
          overlay
            ? "fixed inset-x-0 top-0 z-[100] border-b border-transparent bg-transparent"
            : "sticky top-0 z-[100] border-b border-slate-200 bg-white"
        }
      >
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-2 px-3 py-2 sm:h-[76px] sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0 lg:h-[84px] lg:gap-5 lg:px-6">
          <Link
            href="/"
            className={`${headerChipClass} h-12 min-h-12 min-w-0 max-w-full flex-1 basis-full justify-start gap-2 px-2.5 sm:h-14 sm:min-h-14 sm:flex-none sm:basis-auto sm:gap-3.5 sm:px-6 lg:h-[60px] lg:min-h-[60px] lg:px-7`}
            onClick={(e) => {
              setOpen(false);
              // Always land on the public home page from any route (including `/` itself).
              e.preventDefault();
              scrollToPageStart();
              if (pathname === "/") {
                if (window.location.hash || window.location.search) {
                  router.replace("/");
                }
                scrollToPageStart();
                router.refresh();
                return;
              }
              router.push("/");
              requestAnimationFrame(scrollToPageStart);
            }}
            aria-label="Rentairportcars.com — home"
          >
            <BrandLogo size="xl" />
          </Link>

          <div className="flex h-9 w-full min-w-0 items-center justify-end gap-1.5 sm:ms-auto sm:h-11 sm:w-auto sm:gap-4 lg:gap-5">
            {!hideCustomerNav ? (
              <>
                <span className="hidden sm:inline-flex">{helpButton}</span>
                <nav className="hidden h-11 items-center lg:flex">{myBookingButton}</nav>
              </>
            ) : null}
            {!isPartnershipPage ? (
              <CurrencySelect currency={currency} onChange={setCurrency} buttonClassName={mobileChipClass} />
            ) : null}
            <LanguageSelect locale={locale} onChange={setLocale} buttonClassName={mobileChipClass} />
            {isPartnershipPage ? (
              <Link
                href={BUSINESS_PARTNER_LOGIN}
                className={loginButtonClass}
                onClick={() => setOpen(false)}
              >
                {bpCopy?.systemLogin ?? dictionary.nav.login}
              </Link>
            ) : null}
            {authButton}
            {!hideCustomerNav ? (
              <button
                type="button"
                className={`${headerChipClass} h-9 w-9 justify-center px-0 sm:h-11 sm:w-11 sm:px-0 lg:hidden`}
                aria-label={open ? dictionary.common.closeMenu : dictionary.common.openMenu}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            ) : null}
          </div>
        </div>

        {open && !hideCustomerNav ? (
          <nav
            className={
              overlay
                ? "flex flex-col gap-2 border-t border-white/25 bg-slate-950/55 px-4 py-3 backdrop-blur-sm lg:hidden"
                : "flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 lg:hidden"
            }
          >
            <span className="sm:hidden">{helpButton}</span>
            {myBookingButton}
          </nav>
        ) : null}
      </header>

      {bookingMounted ? (
        <ManageBookingModal
          open={bookingOpen}
          onClose={() => {
            setBookingOpen(false);
            setLookupRef("");
            setLookupEmail("");
          }}
          onNeedHelp={() => {
            setBookingOpen(false);
            router.push("/help");
          }}
          initialBookingNumber={lookupRef}
          initialEmail={lookupEmail}
        />
      ) : null}
    </>
  );
}
