/**
 * Stamp every partner's cabinet extras (price / off / forbid) onto their car listings.
 * Usage: npx tsx --env-file=.env scripts/resync-listing-extras.ts
 */
import { resyncAllPartnerListingExtras } from "../src/lib/server/resync-partner-listing-extras";

async function main() {
  const result = await resyncAllPartnerListingExtras();
  console.log("[resync-listing-extras]", result);
}

main().catch((error) => {
  console.error("[resync-listing-extras] failed", error);
  process.exit(1);
});
