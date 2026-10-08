import "server-only";

/**
 * Thin re-export barrel — implementation lives in `@/lib/server/extras/`.
 * Prefer importing from `@/lib/server/extras-store` for existing call sites.
 */
export type {
  StoredExtraService,
  ExtraCreateInput,
  ExtraUpdateInput,
  HydratedListingExtra,
} from "./extras";

export {
  syncExtrasFileToDb,
  listExtraServices,
  createExtraService,
  updateExtraService,
  deleteExtraService,
  reorderExtraServices,
  ensureExtrasExistInDb,
  extrasRowsForCarFk,
  ensureExtraCopyTranslations,
  hydrateListingExtras,
  applyPartnerExtraOfferModes,
  mergePartnerOfferedExtras,
  mergeFreeInsuranceExtras,
} from "./extras";
