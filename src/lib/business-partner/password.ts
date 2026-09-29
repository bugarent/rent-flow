/** Min 6 chars (more allowed); only Latin letters + digits; ≥1 letter and ≥1 digit. */
export function isValidBusinessPartnerPassword(password: string): boolean {
  const value = String(password || "");
  if (value.length < 6 || value.length > 128) return false;
  if (!/^[A-Za-z0-9]+$/.test(value)) return false;
  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

export const BUSINESS_PARTNER_PASSWORD_HINT =
  "Only Latin letters and digits; at least 6 characters, including one letter and one digit.";
