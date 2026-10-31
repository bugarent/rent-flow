import type { ReactNode } from "react";
import {
  FOOTER_PAYMENT_BADGE_LABELS,
  type FooterPaymentBadge,
} from "@/lib/catalog/footer-contact";

const wordmark = (text: ReactNode, viewBox = "0 0 48 16") => (
  <svg viewBox={viewBox} className="h-4 w-full" aria-hidden>
    {text}
  </svg>
);

const MARKS: Record<FooterPaymentBadge, ReactNode> = {
  visa: wordmark(
    <text x="24" y="13" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="-0.5">
      VISA
    </text>,
  ),
  mastercard: (
    <svg viewBox="0 0 32 20" className="h-5 w-8" aria-hidden>
      <circle cx="12" cy="10" r="7.5" fill="#EB001B" />
      <circle cx="20" cy="10" r="7.5" fill="#F79E1B" />
      <path d="M16 4.4a7.5 7.5 0 0 1 0 11.2 7.5 7.5 0 0 1 0-11.2Z" fill="#FF5F00" />
    </svg>
  ),
  maestro: (
    <svg viewBox="0 0 32 20" className="h-5 w-8" aria-hidden>
      <circle cx="12" cy="10" r="7.5" fill="#EB001B" />
      <circle cx="20" cy="10" r="7.5" fill="#00A2E5" />
      <path d="M16 4.4a7.5 7.5 0 0 1 0 11.2 7.5 7.5 0 0 1 0-11.2Z" fill="#7375CF" />
    </svg>
  ),
  amex: (
    <span className="flex h-full w-full items-center justify-center rounded-[3px] bg-[#2E77BC]">
      <svg viewBox="0 0 48 16" className="h-3.5 w-full" aria-hidden>
        <text x="24" y="12.5" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontSize="12" fontWeight="900" fill="#fff" letterSpacing="0.3">
          AMEX
        </text>
      </svg>
    </span>
  ),
  paypal: wordmark(
    <text x="24" y="12.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="800" fontStyle="italic">
      <tspan fill="#003087">Pay</tspan>
      <tspan fill="#0070BA">Pal</tspan>
    </text>,
  ),
  applepay: wordmark(
    <>
      <path
        d="M9.6 8.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-.9-.1-1.8.6-2.3.6-.5 0-1.2-.5-2-.5-1 0-2 .6-2.5 1.5-1.1 1.9-.3 4.7.8 6.2.5.7 1.1 1.6 1.9 1.5.8 0 1-.5 2-.5.9 0 1.2.5 2 .5s1.3-.8 1.8-1.5c.6-.8.8-1.6.8-1.7 0 0-1.6-.6-1.6-2.6ZM8.1 4c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8Z"
        fill="#000"
      />
      <text x="13.5" y="12.8" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="600" fill="#000">
        Pay
      </text>
    </>,
    "0 0 38 16",
  ),
  googlepay: wordmark(
    <text x="19" y="12.6" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="700">
      <tspan fill="#4285F4">G</tspan>
      <tspan fill="#5F6368"> Pay</tspan>
    </text>,
    "0 0 38 16",
  ),
  unionpay: (
    <svg viewBox="0 0 40 20" className="h-5 w-10" aria-hidden>
      <path d="M6 2h9l-4 16H2Z" fill="#E21836" />
      <path d="M15 2h9l-4 16h-9Z" fill="#00447C" />
      <path d="M24 2h12l-4 16H20Z" fill="#007B84" />
      <text x="20" y="13.2" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="6.4" fontWeight="800" fill="#fff">
        UnionPay
      </text>
    </svg>
  ),
};

/** Accepted payment logos chosen in the admin footer settings (visual only). */
export function FooterPaymentBadges({ badges, label }: { badges: FooterPaymentBadge[]; label: string }) {
  if (!badges.length) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end" aria-label={label}>
      {badges.map((id) => (
        <li
          key={id}
          title={FOOTER_PAYMENT_BADGE_LABELS[id]}
          className="flex h-7 w-12 items-center justify-center overflow-hidden rounded-md bg-white px-1 shadow-[0_1px_2px_rgba(2,6,23,0.25)] ring-1 ring-black/5"
        >
          {MARKS[id]}
          <span className="sr-only">{FOOTER_PAYMENT_BADGE_LABELS[id]}</span>
        </li>
      ))}
    </ul>
  );
}
