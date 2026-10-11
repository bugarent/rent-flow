import { isListingInsuranceService } from "@/lib/extras/checkout-slot";
import { isMandatoryExtra } from "@/lib/extras/pricing";

type ChoiceService = Parameters<typeof isMandatoryExtra>[0] &
  Parameters<typeof isListingInsuranceService>[0];

/**
 * Admin-mandatory extras stay on. Listing insurance (TPL, basic, full, accident)
 * is the partner's choice after they open Additional services.
 */
export function partnerStatusLocked(service: ChoiceService): boolean {
  if (isListingInsuranceService(service)) return false;
  return isMandatoryExtra(service);
}
