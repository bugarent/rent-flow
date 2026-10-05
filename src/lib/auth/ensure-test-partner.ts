import { TEST_PARTNER_EMAIL, TEST_PARTNER_PASSWORD } from "@/lib/auth/local-partner-store";

export { TEST_PARTNER_EMAIL, TEST_PARTNER_PASSWORD };

/**
 * Kept so older imports do not recreate an approved directory partner.
 * The admin partner list must show only real applications.
 */
export async function ensureTestPartner() {
  return;
}
