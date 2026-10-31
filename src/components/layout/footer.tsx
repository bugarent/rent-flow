"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE_NAME } from "@/lib/brand";
import {
  DEFAULT_FOOTER_PAYMENT_BADGES,
  type FooterContactConfig,
} from "@/lib/catalog/footer-contact";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BecomePartnerCta } from "@/components/partner/become-partner-cta";
import { ContactCta } from "@/components/contact/contact-cta";
import { FooterPaymentBadges } from "@/components/layout/footer-payment-badges";
import { FooterSocialLinks } from "@/components/layout/footer-social-links";
import { usePreferences } from "@/components/providers/preferences-context";

const COPYRIGHT_START_YEAR = 2026;

function copyrightYearLabel(now = new Date()): string {
  const currentYear = now.getFullYear();
  return currentYear > COPYRIGHT_START_YEAR
    ? `${COPYRIGHT_START_YEAR}-${currentYear}`
    : String(COPYRIGHT_START_YEAR);
}

const headingClass = "mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white";
const linkClass =
  "inline-flex min-h-10 items-center py-1 text-left text-sm text-white/80 transition hover:text-white focus-visible:text-white";

function ContactItem({ href, icon, children }: { href?: string; icon: ReactNode; children: ReactNode }) {
  const body = (
    <>
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#7cc0ff]">
        {icon}
      </span>
      <span className="min-w-0 break-words pt-1">{children}</span>
    </>
  );
  const className = "flex min-h-10 items-start gap-2.5 text-sm font-medium text-white/90";
  return (
    <li>
      {href ? (
        <a href={href} className={`${className} transition hover:text-white`}>
          {body}
        </a>
      ) : (
        <span className={className}>{body}</span>
      )}
    </li>
  );
}

function LinkGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="min-w-0">
      <h3 className={headingClass}>{title}</h3>
      <ul className="space-y-0.5">{children}</ul>
    </nav>
  );
}

export function Footer({ contact }: { contact?: FooterContactConfig | null }) {
  const { dictionary } = usePreferences();
  const copyrightYear = copyrightYearLabel();
  const phone = contact?.phone?.trim() || "";
  const email = contact?.email?.trim() || "";
  const address = contact?.address?.trim() || "";
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const mailHref = email ? `mailto:${email}` : undefined;
  const badges = contact?.paymentBadges ?? DEFAULT_FOOTER_PAYMENT_BADGES;
  const socialLinks = contact?.socialLinks ?? {};

  return (
    <footer className="mt-auto overflow-x-clip bg-[#071536] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 lg:pt-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-x-10">
          <div className="col-span-2 min-w-0 space-y-4 lg:col-span-1">
            <Link href="/" aria-label={SITE_NAME} className="inline-flex rounded-lg bg-white px-3 py-2 shadow-sm">
              <BrandLogo size="md" />
            </Link>
            {phone || email || address ? (
              <ul className="space-y-1.5">
                {phone ? (
                  <ContactItem href={telHref} icon={<Phone className="h-3.5 w-3.5" aria-hidden />}>
                    {phone}
                  </ContactItem>
                ) : null}
                {email ? (
                  <ContactItem href={mailHref} icon={<Mail className="h-3.5 w-3.5" aria-hidden />}>
                    {email}
                  </ContactItem>
                ) : null}
                {address ? (
                  <ContactItem icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}>{address}</ContactItem>
                ) : null}
              </ul>
            ) : null}
            <FooterSocialLinks links={socialLinks} />
          </div>

          <LinkGroup title={dictionary.common.aboutUs}>
            <li>
              <Link href="/about" className={linkClass}>
                {dictionary.common.about}
              </Link>
            </li>
            <li>
              <BecomePartnerCta className={linkClass} />
            </li>
            <li>
              <Link href="/partnership" target="_blank" rel="noopener noreferrer" className={linkClass}>
                {dictionary.common.businessPartnership}
              </Link>
            </li>
          </LinkGroup>

          <LinkGroup title={dictionary.common.contactHeading}>
            <li>
              <ContactCta className={linkClass} email={email} phone={phone} />
            </li>
            <li>
              <Link href="/help" className={linkClass}>
                {dictionary.helpCenter.faqLink}
              </Link>
            </li>
            <li>
              <Link href="/locations" className={linkClass}>
                {dictionary.nav.locations}
              </Link>
            </li>
          </LinkGroup>

          <LinkGroup title={dictionary.common.terms}>
            <li>
              <Link href="/terms" className={linkClass}>
                {dictionary.common.terms}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {dictionary.common.privacy}
              </Link>
            </li>
          </LinkGroup>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="min-w-0 max-w-full break-words text-center text-xs text-white/75 sm:text-left">
            © {copyrightYear} {SITE_NAME}. {dictionary.common.allRights}
          </p>
          <FooterPaymentBadges badges={badges} label="Accepted payment methods" />
        </div>
      </div>
    </footer>
  );
}
