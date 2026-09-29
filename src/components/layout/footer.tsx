"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE_NAME } from "@/lib/brand";
import { hasFooterContact, type FooterContactConfig } from "@/lib/catalog/footer-contact";
import { BecomePartnerCta } from "@/components/partner/become-partner-cta";
import { ContactCta } from "@/components/contact/contact-cta";
import { usePreferences } from "@/components/providers/preferences-context";

const COPYRIGHT_START_YEAR = 2026;

function copyrightYearLabel(now = new Date()): string {
  const currentYear = now.getFullYear();
  return currentYear > COPYRIGHT_START_YEAR
    ? `${COPYRIGHT_START_YEAR}-${currentYear}`
    : String(COPYRIGHT_START_YEAR);
}

function FooterPaymentIcons() {
  const chip =
    "inline-flex shrink-0 items-center justify-center rounded-[4px] bg-white px-1.5 py-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.12)]";
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Accepted payment methods"
    >
      <span className={chip} title="PayPal">
        <span className="text-[10px] font-extrabold leading-none tracking-tight">
          <span className="text-[#003087]">Pay</span>
          <span className="text-[#009CDE]">Pal</span>
        </span>
      </span>
      <span className={chip} title="Visa">
        <svg viewBox="0 0 40 14" className="h-[18px] w-[34px]" aria-hidden>
          <text
            x="20"
            y="11.5"
            textAnchor="middle"
            fontFamily="Arial Black, Arial, sans-serif"
            fontSize="12"
            fontWeight="900"
            fill="#1A1F71"
            letterSpacing="-0.6"
          >
            VISA
          </text>
        </svg>
      </span>
      <span className={chip} title="Mastercard">
        <svg viewBox="0 0 32 20" className="h-[18px] w-[28px]" aria-hidden>
          <circle cx="12" cy="10" r="7.5" fill="#EB001B" />
          <circle cx="20" cy="10" r="7.5" fill="#F79E1B" />
          <path d="M16 4.4a7.5 7.5 0 0 1 0 11.2 7.5 7.5 0 0 1 0-11.2Z" fill="#FF5F00" />
        </svg>
      </span>
    </div>
  );
}

function SocialIcon({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span aria-label={label} className="inline-flex h-4 w-4 items-center justify-center">
      {children}
    </span>
  );
}

function ContactItem({
  href,
  icon,
  children,
}: {
  href?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const className =
    "inline-flex min-h-11 items-center gap-2 py-2 text-sm font-medium text-white/95 transition hover:text-white";
  const content = (
    <>
      <span className="inline-flex shrink-0 text-[#4da3ff]">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }
  return <span className={className}>{content}</span>;
}

export function Footer({ contact }: { contact?: FooterContactConfig | null }) {
  const { dictionary } = usePreferences();
  const copyrightYear = copyrightYearLabel();
  const showContact = contact ? hasFooterContact(contact) : false;
  const phone = contact?.phone?.trim() || "";
  const email = contact?.email?.trim() || "";
  const address = contact?.address?.trim() || "";
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const mailHref = email ? `mailto:${email}` : undefined;

  const footerLinkClass =
    "inline-flex min-h-11 items-center py-2 hover:text-white";

  return (
    <>
      <footer className="mt-auto overflow-x-clip bg-[#071536] pb-24 text-white md:pb-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 md:grid-cols-3">
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/90">
              {dictionary.common.aboutUs}
            </h3>
            <ul className="space-y-0.5 text-sm text-white/70">
              <li>
                <Link href="/about" className={footerLinkClass}>
                  {dictionary.common.about}
                </Link>
              </li>
              <li>
                <BecomePartnerCta className={footerLinkClass} />
              </li>
              <li>
                <Link
                  href="/partnership"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={footerLinkClass}
                >
                  {dictionary.common.businessPartnership}
                </Link>
              </li>
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/90">
              {dictionary.common.contactHeading}
            </h3>
            <ul className="space-y-0.5 text-sm text-white/70">
              <li>
                <ContactCta
                  className={footerLinkClass}
                  email={email}
                  phone={phone}
                />
              </li>
              <li>
                <Link href="/help" className={footerLinkClass}>
                  {dictionary.helpCenter.faqLink}
                </Link>
              </li>
              <li>
                <Link href="/locations" className={footerLinkClass}>
                  {dictionary.nav.locations}
                </Link>
              </li>
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/90">
              {dictionary.common.terms}
            </h3>
            <ul className="space-y-0.5 text-sm text-white/70">
              <li>
                <Link href="/terms" className={footerLinkClass}>
                  {dictionary.common.terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={footerLinkClass}>
                  {dictionary.common.privacy}
                </Link>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-white/80">
              <SocialIcon label="Facebook">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                  <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z" />
                </svg>
              </SocialIcon>
              <span className="text-xs font-bold">X</span>
              <SocialIcon label="LinkedIn">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                  <path d="M6.5 9H3.7v11h2.8V9ZM5.1 3.3C4.1 3.3 3.3 4.1 3.3 5.1s.8 1.8 1.8 1.8 1.8-.8 1.8-1.8-.8-1.8-1.8-1.8ZM20.3 13.2c0-2.4-1.3-4.2-3.8-4.2-1.6 0-2.5.8-3 1.6V9H10.7c0 1.4 0 11 0 11h2.8v-6.1c0-.3 0-.7.1-1 .3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.6V20h2.8v-6.8Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="Instagram">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                  <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10A2.2 2.2 0 0 0 19.2 17V7A2.2 2.2 0 0 0 17 4.8ZM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Zm4.7-2.6a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9Z" />
                </svg>
              </SocialIcon>
              <SocialIcon label="YouTube">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                  <path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM9.8 15.5v-6.6l6 3.3-6 3.3Z" />
                </svg>
              </SocialIcon>
            </div>
          </div>
        </div>

        {showContact ? (
          <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-5 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-3">
              {phone ? (
                <ContactItem href={telHref} icon={<Phone className="h-4 w-4" aria-hidden />}>
                  {phone}
                </ContactItem>
              ) : null}
              {email ? (
                <ContactItem href={mailHref} icon={<Mail className="h-4 w-4" aria-hidden />}>
                  {email}
                </ContactItem>
              ) : null}
              {address ? (
                <ContactItem icon={<MapPin className="h-4 w-4" aria-hidden />}>{address}</ContactItem>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col flex-wrap items-center justify-center gap-x-4 gap-y-3 px-4 py-5 text-xs text-white/60 sm:flex-row">
            <p className="min-w-0 max-w-full text-center break-words">
              © {copyrightYear} {SITE_NAME}. {dictionary.common.allRights}
            </p>
            <FooterPaymentIcons />
          </div>
        </div>
      </footer>
    </>
  );
}
