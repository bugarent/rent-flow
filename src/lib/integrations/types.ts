import { z } from "zod";

export const INTEGRATION_STATUSES = ["DRAFT", "TESTING", "LIVE", "DISABLED"] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const INTEGRATION_SYNC_MODES = ["PULL", "PUSH", "BOTH"] as const;
export type IntegrationSyncMode = (typeof INTEGRATION_SYNC_MODES)[number];

export const MAPPING_KINDS = ["VEHICLE", "LOCATION", "CATEGORY"] as const;
export type IntegrationMappingKind = (typeof MAPPING_KINDS)[number];

export const SYNC_EVENTS = [
  "TEST",
  "PULL_FLEET",
  "PULL_AVAIL",
  "BOOKING_LOCK",
  "BOOKING_UNLOCK",
  "SANDBOX",
] as const;
export type IntegrationSyncEvent = (typeof SYNC_EVENTS)[number];

export const fleetItemSchema = z.object({
  externalId: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1980).max(2100),
  category: z.string().optional(),
  photos: z.array(z.string()).default([]),
  dailyRate: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  active: z.boolean().default(true),
});

export const fleetPayloadSchema = z.object({
  vehicles: z.array(fleetItemSchema).min(1),
});

export const availabilityBlockSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const availabilityItemSchema = z.object({
  externalId: z.string().min(1),
  blocks: z.array(availabilityBlockSchema).default([]),
});

export const availabilityPayloadSchema = z.object({
  availability: z.array(availabilityItemSchema),
});

export const bookingLockSchema = z.object({
  externalId: z.string().min(1),
  lockId: z.string().min(1),
  pickupAt: z.string().min(1),
  dropoffAt: z.string().min(1),
  bookingRef: z.string().min(1),
});

export const bookingLockResponseSchema = z.object({
  ok: z.boolean(),
  externalBookingId: z.string().optional(),
  message: z.string().optional(),
});

export type FleetItem = z.infer<typeof fleetItemSchema>;
export type FleetPayload = z.infer<typeof fleetPayloadSchema>;
export type AvailabilityPayload = z.infer<typeof availabilityPayloadSchema>;
export type BookingLockRequest = z.infer<typeof bookingLockSchema>;
export type BookingLockResponse = z.infer<typeof bookingLockResponseSchema>;

export type PartnerIntegrationRecord = {
  id: string;
  partnerId: string;
  partnerName?: string;
  name: string;
  provider: string;
  status: IntegrationStatus;
  apiKeyHash: string;
  apiKeyPrefix: string;
  webhookUrl: string | null;
  syncMode: IntegrationSyncMode;
  manualOverride: boolean;
  pollIntervalMinutes: number;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastSyncAt: string | null;
  isSandbox: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationMappingRecord = {
  id: string;
  integrationId: string;
  kind: IntegrationMappingKind;
  externalId: string;
  externalLabel: string;
  internalId: string;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationSyncLogRecord = {
  id: string;
  integrationId: string;
  direction: "IN" | "OUT";
  event: IntegrationSyncEvent;
  status: "OK" | "ERROR";
  latencyMs: number;
  requestSummary: string;
  responseSummary: string;
  errorMessage: string | null;
  createdAt: string;
};
