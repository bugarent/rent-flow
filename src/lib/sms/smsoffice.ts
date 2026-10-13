import "server-only";

/** smsoffice.ge needs `SMSOFFICE_API_KEY` and an approved sender name in `SMSOFFICE_SENDER`. */
function smsConfig() {
  const key = process.env.SMSOFFICE_API_KEY?.trim() || "";
  const sender = process.env.SMSOFFICE_SENDER?.trim() || "";
  return key && sender ? { key, sender } : null;
}

export function isSmsConfigured(): boolean {
  return smsConfig() !== null;
}

/** International digits without "+"; bare Georgian mobiles (5XXXXXXXX) get the 995 prefix. */
export function smsDestination(phone: string): string | null {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^5\d{8}$/.test(digits)) digits = `995${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function sendSms(phone: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const config = smsConfig();
  if (!config) return { ok: false, error: "sms-not-configured" };
  const destination = smsDestination(phone);
  if (!destination) return { ok: false, error: "bad-phone" };
  const url = new URL("https://smsoffice.ge/api/v2/send/");
  url.searchParams.set("key", config.key);
  url.searchParams.set("destination", destination);
  url.searchParams.set("sender", config.sender);
  url.searchParams.set("content", text);
  url.searchParams.set("urgent", "true");
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const data = (await res.json().catch(() => null)) as { Success?: boolean; Message?: string } | null;
    if (res.ok && data?.Success) return { ok: true };
    return { ok: false, error: data?.Message || `http-${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "sms-failed" };
  }
}
