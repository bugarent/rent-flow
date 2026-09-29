export const INSURANCE_CHECKOUT_SLOTS = ["tpl", "basic", "full", "driver"] as const;

/** Protection packs shown in the checkout insurance panel (excludes additional driver). */
export const PROTECTION_INSURANCE_SLOTS = ["tpl", "basic", "full"] as const;

export type InsuranceCheckoutSlot = (typeof INSURANCE_CHECKOUT_SLOTS)[number];
export type ProtectionInsuranceSlot = (typeof PROTECTION_INSURANCE_SLOTS)[number];
export type ExtraCheckoutSlot = "none" | InsuranceCheckoutSlot;

export const CHECKOUT_SLOT_ORDER: Record<InsuranceCheckoutSlot, number> = {
  tpl: 0,
  basic: 1,
  full: 2,
  driver: 3,
};

export function isInsuranceCheckoutSlot(value: unknown): value is InsuranceCheckoutSlot {
  return value === "tpl" || value === "basic" || value === "full" || value === "driver";
}

export function isProtectionInsuranceSlot(value: unknown): value is ProtectionInsuranceSlot {
  return value === "tpl" || value === "basic" || value === "full";
}

export function normalizeCheckoutSlot(value: unknown): ExtraCheckoutSlot {
  if (isInsuranceCheckoutSlot(value)) return value;
  return "none";
}

/** Infer slot from slug / TPL flag when admin has not set one yet. */
export function inferCheckoutSlot(input: {
  slug?: string;
  isTpl?: boolean;
  name?: string;
}): ExtraCheckoutSlot {
  if (input.isTpl) return "tpl";
  const hay = `${input.slug || ""} ${input.name || ""}`.toLowerCase();
  if (/^tpl$|third[-_\s]?party|მესამე მხარ|треть(я|ей) сторон/.test(hay)) return "tpl";
  if (/basic[-_\s]?cover|საბაზისო დაფარვ|базов(ое|ая) покрыт/.test(hay)) return "basic";
  if (/full[-_\s]?protect|სრული დაფარვ|полная защит|полная страхов/.test(hay)) return "full";
  if (
    /additional[-_\s]?driver|დამატებითი მძღოლ|доп(\.|олнительн).*вод|conducteur additionnel|zusatzfahrer|dodatkow(y|ego) kierowc/.test(
      hay,
    )
  ) {
    return "driver";
  }
  return "none";
}

export function resolveCheckoutSlot(input: {
  checkoutSlot?: unknown;
  slug?: string;
  isTpl?: boolean;
  name?: string;
}): ExtraCheckoutSlot {
  const explicit = normalizeCheckoutSlot(input.checkoutSlot);
  if (explicit !== "none") return explicit;
  return inferCheckoutSlot(input);
}

export function extractCheckoutSlotFromDescription(description: unknown): ExtraCheckoutSlot {
  if (description && typeof description === "object" && "checkoutSlot" in description) {
    return normalizeCheckoutSlot((description as { checkoutSlot?: unknown }).checkoutSlot);
  }
  return "none";
}

export function descriptionWithCheckoutSlot(
  description: string,
  checkoutSlot: ExtraCheckoutSlot,
): { en: string; checkoutSlot?: ExtraCheckoutSlot } {
  const en = description.trim();
  if (checkoutSlot === "none") return { en };
  return { en, checkoutSlot };
}

export function checkoutSlotLabel(slot: ExtraCheckoutSlot): string {
  switch (slot) {
    case "tpl":
      return "Insurance: TPL";
    case "basic":
      return "Insurance: Basic coverage";
    case "full":
      return "Insurance: Full coverage";
    case "driver":
      return "Insurance: Additional driver";
    default:
      return "Additional services list";
  }
}
