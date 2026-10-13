export type PartnerBroadcastChannel = "telegram" | "email" | "sms";

export const PARTNER_BROADCAST_CHANNELS: PartnerBroadcastChannel[] = ["telegram", "email", "sms"];

export const PARTNER_BROADCAST_MAX_RECIPIENTS = 300;
export const PARTNER_BROADCAST_MAX_TEXT = 2000;

export type PartnerBroadcastContact = {
  id: string;
  name: string;
  phone: string;
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
