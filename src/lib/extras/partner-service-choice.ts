import { isMandatoryExtra } from "@/lib/extras/pricing";

type ChoiceService = Parameters<typeof isMandatoryExtra>[0];

/**
 * Admin-mandatory extras (insurance included) stay on: the partner cannot turn them off
 * or forbid them, and listings always carry them as enabled.
 */
export function partnerStatusLocked(service: ChoiceService): boolean {
  return isMandatoryExtra(service);
}
