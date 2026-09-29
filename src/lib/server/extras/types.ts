import "server-only";

import type { ExtraCheckoutSlot } from "@/lib/extras/checkout-slot";

export type StoredExtraService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isTpl: boolean;
  isActive: boolean;
  sortOrder: number;
  defaultPriceEur: number;
  minPriceEur: number | null;
  maxPriceEur: number | null;
  maxPeriodEur: number | null;
  checkoutSlot: ExtraCheckoutSlot;
  createdAt: string;
  updatedAt: string;
};

export type ExtraCreateInput = {
  name: string;
  description?: string;
  minPriceEur?: number | null;
  maxPriceEur?: number | null;
  maxPeriodEur?: number | null;
  defaultPriceEur?: number;
  isActive?: boolean;
  sortOrder?: number;
  checkoutSlot?: ExtraCheckoutSlot;
};

export type ExtraUpdateInput = {
  name?: string;
  description?: string;
  minPriceEur?: number | null;
  maxPriceEur?: number | null;
  maxPeriodEur?: number | null;
  defaultPriceEur?: number;
  isActive?: boolean;
  isTpl?: boolean;
  sortOrder?: number;
  checkoutSlot?: ExtraCheckoutSlot;
};

export type HydratedListingExtra = {
  extraServiceId: string;
  priceEur: number;
  forbidden?: boolean;
  extraService: {
    id: string;
    slug?: string;
    name: string;
    description: string;
    isTpl: boolean;
    isActive: boolean;
    minPriceEur: number | null;
    maxPriceEur: number | null;
    maxPeriodEur?: number | null;
    /** Partner floor for the whole rental. */
    minPeriodEur?: number | null;
    sortOrder?: number;
    checkoutSlot?: ExtraCheckoutSlot;
  } | null;
};
