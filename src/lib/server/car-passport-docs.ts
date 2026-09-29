import {
  normalizeInsuranceExpiresAt,
  normalizeInsuranceUrl,
  writeCarInsuranceDoc,
} from "@/lib/server/car-insurance-store";

export async function persistCarInsuranceDocument(
  carId: string,
  rawUrl: unknown,
  rawExpiresAt?: unknown,
) {
  const patch: { insuranceUrl?: string | null; insuranceExpiresAt?: string | null } = {};
  if (rawUrl !== undefined) {
    patch.insuranceUrl = normalizeInsuranceUrl(rawUrl);
  }
  if (rawExpiresAt !== undefined) {
    patch.insuranceExpiresAt = normalizeInsuranceExpiresAt(rawExpiresAt);
  }
  if (Object.keys(patch).length === 0) return;
  await writeCarInsuranceDoc(carId, patch);
}
