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

/** Capitalize an all-lowercase place word. Leaves "Georgia" and scripts without case as they are. */
export function formatFooterAddress(address: string): string {
  return address.replace(/\p{L}+(?:['’\-]\p{L}+)*/gu, (word) => {
    if (word !== word.toLocaleLowerCase()) return word;
    return word.charAt(0).toLocaleUpperCase() + word.slice(1);
  });
}

export function hasFooterContact(config: FooterContactConfig): boolean {
  return Boolean(config.phone.trim() || config.email.trim() || config.address.trim());
}

/** Effective inbox for contact-form mail (inboxEmail → email → empty). */
export function resolveContactInboxEmail(config: FooterContactConfig): string {
  return config.inboxEmail.trim() || config.email.trim();
}
