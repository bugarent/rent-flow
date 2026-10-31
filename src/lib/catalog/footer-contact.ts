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
  updatedAt: string;
};

export function emptyFooterContact(): FooterContactConfig {
  return {
    phone: "",
    email: "",
    inboxEmail: "",
    address: "",
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
