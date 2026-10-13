export type PartnerBroadcastChannel = "telegram" | "email" | "sms";

export const PARTNER_BROADCAST_CHANNELS: PartnerBroadcastChannel[] = ["telegram", "email", "sms"];

export const PARTNER_BROADCAST_MAX_RECIPIENTS = 300;
export const PARTNER_BROADCAST_MAX_TEXT = 2000;

export type PhoneSlot = "primary" | "secondary";

/** `slots` are the checked numbers. Empty means the partner was selected with no phone. */
export type PartnerBroadcastTarget = {
  id: string;
  slots: PhoneSlot[];
};

export type PartnerBroadcastContact = {
  id: string;
  name: string;
  /** First selected number, kept for older readers. */
  phone: string;
  /** Every selected number. Each one receives its own SMS. */
  phones: string[];
  email: string;
  messengers: string[];
  hasTelegram: boolean;
};

export type PartnerBroadcastResult = {
  id: string;
  name: string;
  telegram?: boolean;
  email?: boolean;
  sms?: boolean;
};
