/**
 * Admin partner search: every typed word must appear in the row text.
 * Words with 3+ digits also match phone numbers written with spaces, dashes or +.
 */
export function matchesPartnerSearch(text: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = text.toLowerCase();
  const numbers = haystack.split(/\s+/).map((part) => part.replace(/\D/g, "")).filter(Boolean);
  const digitsOnly = haystack.replace(/[\s()+-]/g, "");
  return terms.every((term) => {
    if (haystack.includes(term)) return true;
    const digits = term.replace(/\D/g, "");
    return digits.length >= 3 && (numbers.some((n) => n.includes(digits)) || digitsOnly.includes(digits));
  });
}
