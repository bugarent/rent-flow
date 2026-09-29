/**
 * International payout validation for business partners (Europe / Asia bank + PayPal).
 */

export type BusinessPartnerPayoutMethod = "BANK" | "PAYPAL";

export type PayoutValidationResult = {
  ok: boolean;
  code?: "EMPTY" | "FORMAT" | "LENGTH" | "CHECKSUM";
  normalized?: string;
};

/** Strip spaces and punctuation; uppercase for IBAN / SWIFT. */
export function normalizeBankCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .replace(/[\s\-_.]/g, "");
}

/**
 * ISO 13616 IBAN: 2-letter country + 2 check digits + BBAN (15–34 chars total).
 * Validates structure and MOD-97 checksum.
 */
export function validateIban(raw: string): PayoutValidationResult {
  const normalized = normalizeBankCode(raw);
  if (!normalized) return { ok: false, code: "EMPTY" };
  if (normalized.length < 15 || normalized.length > 34) {
    return { ok: false, code: "LENGTH", normalized };
  }
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized)) {
    return { ok: false, code: "FORMAT", normalized };
  }

  // Move first 4 chars to end, convert letters A=10 … Z=35, MOD 97 === 1
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  let expanded = "";
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) expanded += String(code - 55);
    else expanded += ch;
  }

  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    const block = String(remainder) + expanded.slice(i, i + 7);
    remainder = Number(block) % 97;
  }
  if (remainder !== 1) return { ok: false, code: "CHECKSUM", normalized };
  return { ok: true, normalized };
}

/**
 * SWIFT / BIC: 8 or 11 characters — bank(4) + country(2) + location(2) + optional branch(3).
 */
export function validateSwiftBic(raw: string): PayoutValidationResult {
  const normalized = normalizeBankCode(raw);
  if (!normalized) return { ok: false, code: "EMPTY" };
  if (normalized.length !== 8 && normalized.length !== 11) {
    return { ok: false, code: "LENGTH", normalized };
  }
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) {
    return { ok: false, code: "FORMAT", normalized };
  }
  return { ok: true, normalized };
}

/** PayPal account: must be a valid email address (common PayPal login / payout ID). */
export function validatePaypalAccount(raw: string): PayoutValidationResult {
  const normalized = String(raw || "").trim().toLowerCase();
  if (!normalized) return { ok: false, code: "EMPTY" };
  if (normalized.length > 160) return { ok: false, code: "LENGTH", normalized };
  // Practical email shape used by PayPal payouts
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return { ok: false, code: "FORMAT", normalized };
  }
  return { ok: true, normalized };
}

export function normalizePayoutMethod(raw: unknown): BusinessPartnerPayoutMethod {
  return String(raw || "").toUpperCase() === "PAYPAL" ? "PAYPAL" : "BANK";
}

/**
 * Full payout preference check used by API + client before save.
 * BANK requires valid IBAN + SWIFT; PAYPAL requires valid email.
 */
export function validatePayoutPreferences(input: {
  payoutMethod?: unknown;
  payoutAccount?: string;
  payoutSwift?: string;
  paypalAccount?: string;
}): {
  ok: boolean;
  method: BusinessPartnerPayoutMethod;
  payoutAccount: string;
  payoutSwift: string;
  paypalAccount: string;
  errorCode?:
    | "INVALID_IBAN"
    | "INVALID_SWIFT"
    | "INVALID_PAYPAL"
    | "PAYOUT_REQUIRED";
} {
  const method = normalizePayoutMethod(input.payoutMethod);

  if (method === "PAYPAL") {
    const paypal = validatePaypalAccount(input.paypalAccount || "");
    if (!paypal.ok) {
      return {
        ok: false,
        method,
        payoutAccount: "",
        payoutSwift: "",
        paypalAccount: String(input.paypalAccount || "").trim(),
        errorCode: "INVALID_PAYPAL",
      };
    }
    return {
      ok: true,
      method,
      payoutAccount: "",
      payoutSwift: "",
      paypalAccount: paypal.normalized || "",
    };
  }

  const iban = validateIban(input.payoutAccount || "");
  const swift = validateSwiftBic(input.payoutSwift || "");
  if (!iban.ok) {
    return {
      ok: false,
      method,
      payoutAccount: String(input.payoutAccount || "").trim(),
      payoutSwift: String(input.payoutSwift || "").trim(),
      paypalAccount: "",
      errorCode: "INVALID_IBAN",
    };
  }
  if (!swift.ok) {
    return {
      ok: false,
      method,
      payoutAccount: iban.normalized || "",
      payoutSwift: String(input.payoutSwift || "").trim(),
      paypalAccount: "",
      errorCode: "INVALID_SWIFT",
    };
  }
  return {
    ok: true,
    method,
    payoutAccount: iban.normalized || "",
    payoutSwift: swift.normalized || "",
    paypalAccount: "",
  };
}
