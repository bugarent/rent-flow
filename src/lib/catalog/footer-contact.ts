/** Logos shown in the footer as accepted payment methods (display only). */
export const FOOTER_PAYMENT_BADGES = [
  "visa",
  "mastercard",
  "maestro",
  "amex",
  "paypal",
  "applepay",
  "googlepay",
  "unionpay",
] as const;
export type FooterPaymentBadge = (typeof FOOTER_PAYMENT_BADGES)[number];

export const FOOTER_PAYMENT_BADGE_LABELS: Record<FooterPaymentBadge, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  maestro: "Maestro",
  amex: "American Express",
  paypal: "PayPal",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  unionpay: "UnionPay",
};

/** What the footer showed before badges became configurable. */
export const DEFAULT_FOOTER_PAYMENT_BADGES: FooterPaymentBadge[] = ["visa", "mastercard", "paypal"];

export const FOOTER_SOCIAL_NETWORKS = ["facebook", "instagram", "x", "linkedin", "youtube", "tiktok"] as const;
export type FooterSocialNetwork = (typeof FOOTER_SOCIAL_NETWORKS)[number];

export const FOOTER_SOCIAL_LABELS: Record<FooterSocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export type FooterSocialLinks = Partial<Record<FooterSocialNetwork, string>>;

export type FooterContactConfig = {
  phone: string;
  /** Public email shown in the footer bar. */
  email: string;
  /**
   * Inbox that receives “Send message” contact-form submissions.
   * Falls back to `email` when empty.
   */
  inboxEmail: string;
  address: string;
  paymentBadges: FooterPaymentBadge[];
  /** Only networks with a URL are shown. */
  socialLinks: FooterSocialLinks;
  updatedAt: string;
};

export function emptyFooterContact(): FooterContactConfig {
  return {
    phone: "",
    email: "",
    inboxEmail: "",
    address: "",
    paymentBadges: [...DEFAULT_FOOTER_PAYMENT_BADGES],
    socialLinks: {},
    updatedAt: new Date().toISOString(),
  };
}

export function hasFooterContact(config: FooterContactConfig): boolean {
  return Boolean(config.phone.trim() || config.email.trim() || config.address.trim());
}

/** Effective inbox for contact-form mail (inboxEmail → email → empty). */
export function resolveContactInboxEmail(config: FooterContactConfig): string {
  return config.inboxEmail.trim() || config.email.trim();
}

/** Known badge ids in canonical order; anything else is dropped. */
export function normalizePaymentBadges(value: unknown): FooterPaymentBadge[] {
  if (!Array.isArray(value)) return [...DEFAULT_FOOTER_PAYMENT_BADGES];
  const wanted = new Set(value.map((v) => String(v).trim().toLowerCase()));
  return FOOTER_PAYMENT_BADGES.filter((id) => wanted.has(id));
}

/** Absolute http(s) URLs only; `instagram.com/x` gets `https://`. */
export function normalizeSocialLinks(value: unknown): FooterSocialLinks {
  const out: FooterSocialLinks = {};
  if (!value || typeof value !== "object") return out;
  for (const network of FOOTER_SOCIAL_NETWORKS) {
    let url = String((value as Record<string, unknown>)[network] ?? "").trim().slice(0, 300);
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, "")}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") out[network] = parsed.toString();
    } catch {
      /* not a URL — skip */
    }
  }
  return out;
}
