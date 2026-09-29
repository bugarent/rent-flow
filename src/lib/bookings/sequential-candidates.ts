import { BOOKING_REF_START } from "@/lib/ids";

/** Candidate sequential numbers when the guest types a short code (e.g. 1004 → also try legacy padded forms). */
export function bookingSequentialCandidates(parsed: number): number[] {
  const out: number[] = [];
  const add = (n: number) => {
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  };
  add(parsed);
  // Legacy: RE-1004 entered for car booking RE-10004 (old refs started at 10000)
  if (parsed >= 1000 && parsed < 10000) {
    add(10000 + (parsed % 1000));
  }
  // Prefer current series floor when looking up tiny numbers
  if (parsed > 0 && parsed < BOOKING_REF_START) {
    add(BOOKING_REF_START + (parsed % BOOKING_REF_START));
  }
  return out;
}
