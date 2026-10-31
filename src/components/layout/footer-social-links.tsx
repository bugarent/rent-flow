import type { ReactNode } from "react";
import {
  FOOTER_SOCIAL_LABELS,
  FOOTER_SOCIAL_NETWORKS,
  type FooterSocialLinks as SocialLinks,
  type FooterSocialNetwork,
} from "@/lib/catalog/footer-contact";

const ICONS: Record<FooterSocialNetwork, ReactNode> = {
  facebook: <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z" />,
  instagram: (
    <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm10 1.8H7A2.2 2.2 0 0 0 4.8 7v10A2.2 2.2 0 0 0 7 19.2h10A2.2 2.2 0 0 0 19.2 17V7A2.2 2.2 0 0 0 17 4.8ZM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2Zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8Zm4.7-2.6a.9.9 0 1 1-.9.9.9.9 0 0 1 .9-.9Z" />
  ),
  x: <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />,
  linkedin: (
    <path d="M6.5 9H3.7v11h2.8V9ZM5.1 3.3C4.1 3.3 3.3 4.1 3.3 5.1s.8 1.8 1.8 1.8 1.8-.8 1.8-1.8-.8-1.8-1.8-1.8ZM20.3 13.2c0-2.4-1.3-4.2-3.8-4.2-1.6 0-2.5.8-3 1.6V9H10.7c0 1.4 0 11 0 11h2.8v-6.1c0-.3 0-.7.1-1 .3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.6V20h2.8v-6.8Z" />
  ),
  youtube: (
    <path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM9.8 15.5v-6.6l6 3.3-6 3.3Z" />
  ),
  tiktok: (
    <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.6-.3-3.9-1v5.8c0 7.4-8 9.7-11.3 4.4-2.1-3.4-.8-9.4 6-9.6v3.3c-.5.1-1 .2-1.5.4-1.5.5-2.3 1.4-2.1 3 .5 3.1 6.1 4 5.7-2V3h3.2Z" />
  ),
};

/** Only networks with a URL saved in the admin footer settings are shown. */
export function FooterSocialLinks({ links }: { links: SocialLinks }) {
  const shown = FOOTER_SOCIAL_NETWORKS.filter((network) => links[network]);
  if (!shown.length) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {shown.map((network) => (
        <li key={network}>
          <a
            href={links[network]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={FOOTER_SOCIAL_LABELS[network]}
            title={FOOTER_SOCIAL_LABELS[network]}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
              {ICONS[network]}
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
