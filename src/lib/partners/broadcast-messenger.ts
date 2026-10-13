import type { PartnerBroadcastContact } from "@/lib/partners/broadcast-types";
import { partnerPhoneDigits } from "@/lib/partners/messenger-chat-link";

export type BroadcastMessenger = "wa" | "viber";

/** One line per selected number. A partner with no selected number gets one line with empty digits. */
export type BroadcastMessengerLine = {
  key: string;
  contactId: string;
  name: string;
  phone: string;
  digits: string;
  messengers: string[];
};

export function broadcastMessengerLines(contacts: PartnerBroadcastContact[]): BroadcastMessengerLine[] {
  return contacts.flatMap((contact) => {
    const phones = (contact.phones.length ? contact.phones : [contact.phone]).filter(Boolean);
    const base = { contactId: contact.id, name: contact.name, messengers: contact.messengers };
    if (!phones.length) return [{ ...base, key: contact.id, phone: "", digits: "" }];
    return phones.map((phone) => {
      const digits = partnerPhoneDigits(phone);
      return { ...base, key: `${contact.id}:${digits}`, phone, digits };
    });
  });
}

export function whatsappMessageHref(digits: string, text: string) {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** `draft` is honoured by Viber on phones; Viber Desktop opens the chat without it. */
export function viberMessageHref(digits: string, text: string) {
  return `viber://chat?number=%2B${digits}&draft=${encodeURIComponent(text)}`;
}

export function broadcastProgressKey(lineKey: string, messenger: BroadcastMessenger) {
  return `${lineKey}:${messenger}`;
}
