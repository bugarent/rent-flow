export type ContactRequestTypeId =
  | "booking"
  | "payment"
  | "cancel"
  | "account"
  | "other";

export type ContactRequestSubtypeId =
  | "booking_info"
  | "booking_change"
  | "booking_issue"
  | "payment_deposit"
  | "payment_refund"
  | "cancel_request"
  | "cancel_policy"
  | "account_login"
  | "account_data"
  | "other_general";

export type ContactRequestTypeDef = {
  id: ContactRequestTypeId;
  subtypes: ContactRequestSubtypeId[];
};

/** Fixed taxonomy for the public contact form (labels live in i18n). */
export const CONTACT_REQUEST_TYPES: ContactRequestTypeDef[] = [
  {
    id: "booking",
    subtypes: ["booking_info", "booking_change", "booking_issue"],
  },
  {
    id: "payment",
    subtypes: ["payment_deposit", "payment_refund"],
  },
  {
    id: "cancel",
    subtypes: ["cancel_request", "cancel_policy"],
  },
  {
    id: "account",
    subtypes: ["account_login", "account_data"],
  },
  {
    id: "other",
    subtypes: ["other_general"],
  },
];

export const CONTACT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const CONTACT_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
