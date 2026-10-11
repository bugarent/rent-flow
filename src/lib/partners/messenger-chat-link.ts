import { PARTNER_SOCIAL_PLATFORMS, type PartnerSocialPlatform } from "@/lib/partner";

export function partnerPhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Open a chat with this phone on a messenger the partner turned on. */
export function partnerMessengerChatHref(platform: PartnerSocialPlatform, phone: string): string | null {
  const digits = partnerPhoneDigits(phone);
  if (!digits) return null;
  if (platform === "WHATSAPP") return `https://wa.me/${digits}`;
  if (platform === "VIBER") return `viber://chat?number=%2B${digits}`;
  return `https://t.me/+${digits}`;
}

export function activePartnerMessengerLinks(phone: string, messengers: readonly string[]) {
  const selected = new Set(messengers.map((item) => String(item).toUpperCase()));
  return PARTNER_SOCIAL_PLATFORMS.flatMap((platform) => {
    if (!selected.has(platform.value)) return [];
    const href = partnerMessengerChatHref(platform.value, phone);
    if (!href) return [];
    return [{ platform: platform.value, label: platform.label, href }];
  });
}
