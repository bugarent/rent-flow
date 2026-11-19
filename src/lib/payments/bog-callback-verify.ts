import "server-only";

import { createVerify } from "node:crypto";
import { BOG_CALLBACK_PUBLIC_KEY } from "@/lib/payments/bog-config";

/**
 * Verify BOG Callback-Signature (SHA256withRSA) against the raw request body.
 * Returns true when the signature is valid.
 */
export function verifyBogCallbackSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
): boolean {
  const signature = String(signatureHeader || "").trim();
  if (!signature) return false;

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody);
    verifier.end();
    return verifier.verify(BOG_CALLBACK_PUBLIC_KEY, signature, "base64");
  } catch {
    return false;
  }
}
