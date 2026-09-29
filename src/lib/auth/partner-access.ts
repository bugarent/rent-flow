/** Partner statuses that may sign in and use the partner portal. */
export const PARTNER_PORTAL_ACCESS_STATUSES = new Set([
  "APPROVED",
  "PENDING_REMODERATION",
]);

export function partnerCanAccessPortal(status: string | null | undefined): boolean {
  return Boolean(status && PARTNER_PORTAL_ACCESS_STATUSES.has(status));
}
