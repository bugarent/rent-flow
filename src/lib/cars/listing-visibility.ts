/**
 * Single source of truth for "is this listing shown to customers".
 *
 * A listing approved by the admin stays public while a later partner edit awaits
 * re-moderation (customers keep seeing the last approved version). New listings,
 * rejected listings and expired-insurance re-moderation stay hidden.
 */

export const PARTNER_EDIT_REMODERATION_REASON = "Partner edited listing — awaiting re-moderation";
export const REJECTED_EDIT_REMODERATION_REASON = "Partner edited rejected listing — awaiting re-moderation";

export type ListingVisibilityInput = {
  status: string;
  hiddenReason?: string | null;
};

export function isPubliclyVisibleListing(car: ListingVisibilityInput): boolean {
  if (car.status === "APPROVED") return true;
  return (
    car.status === "PENDING_REMODERATION" &&
    String(car.hiddenReason || "").trim() === PARTNER_EDIT_REMODERATION_REASON
  );
}

/** Prisma `where` fragment matching {@link isPubliclyVisibleListing}. */
export const publicListingStatusWhere = {
  OR: [
    { status: "APPROVED" as const },
    { status: "PENDING_REMODERATION" as const, hiddenReason: PARTNER_EDIT_REMODERATION_REASON },
  ],
};

/**
 * Partner account states that take every listing off the site. Any other state
 * (pending profile review, invited, needs correction…) keeps admin-approved
 * listings public — approving the listing is the admin's explicit decision.
 */
export const PARTNER_BLOCKING_STATUSES = ["REJECTED", "SUSPENDED"] as const;

export function partnerAllowsPublicListings(status?: string | null): boolean {
  return !(PARTNER_BLOCKING_STATUSES as readonly string[]).includes(String(status || ""));
}

/** Prisma `where` fragment for the car's `partner` relation. */
export const publicPartnerWhere = {
  status: { notIn: [...PARTNER_BLOCKING_STATUSES] },
};

export type SearchBlocker = "status" | "partner" | "noDelivery" | "insurance";

/** Why a listing cannot appear in customer search (empty = it can). */
export function listingSearchBlockers(input: {
  status: string;
  hiddenReason?: string | null;
  partnerStatus?: string | null;
  activeAirports: string[];
  insuranceExpired: boolean;
}): SearchBlocker[] {
  const blockers: SearchBlocker[] = [];
  if (!isPubliclyVisibleListing(input)) blockers.push("status");
  if (!partnerAllowsPublicListings(input.partnerStatus)) blockers.push("partner");
  if (!input.activeAirports.length) blockers.push("noDelivery");
  if (input.insuranceExpired) blockers.push("insurance");
  return blockers;
}

/**
 * hiddenReason after a partner saves a listing. Keeps an earlier reason
 * (rejection note, expired insurance) so those listings never become public by editing.
 */
export function hiddenReasonAfterPartnerEdit(input: {
  prevStatus: string;
  prevReason?: string | null;
  nextStatus: string;
}): string | null {
  const prevReason = String(input.prevReason || "").trim() || null;
  if (input.nextStatus === "APPROVED") return null;
  if (input.prevStatus === "REJECTED") return prevReason || REJECTED_EDIT_REMODERATION_REASON;
  if (input.prevStatus === "PENDING_REMODERATION" && prevReason) return prevReason;
  if (input.nextStatus === "PENDING_REMODERATION") return PARTNER_EDIT_REMODERATION_REASON;
  return prevReason;
}
