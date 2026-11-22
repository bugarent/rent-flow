"use client";

import dynamic from "next/dynamic";
import { ModalSkeleton, Skeleton } from "@/components/ui/skeleton";

export const loadRentalTermsModal = () => import("@/components/cars/rental-terms-modal");
export const loadLegalDocumentModal = () => import("@/components/legal/legal-document-modal");
export const loadCheckoutPaypalSandbox = () => import("@/components/cars/checkout-paypal-sandbox");
export const loadCheckoutPaypalCard = () => import("@/components/cars/checkout-paypal-card");
export const loadCheckoutBogCard = () => import("@/components/cars/checkout-bog-card");

export const RentalTermsModal = dynamic(
  () => loadRentalTermsModal().then((m) => m.RentalTermsModal),
  { ssr: false, loading: () => <ModalSkeleton size="lg" /> },
);

export const LegalDocumentModal = dynamic(
  () => loadLegalDocumentModal().then((m) => m.LegalDocumentModal),
  { ssr: false, loading: () => <ModalSkeleton size="lg" /> },
);

export const CheckoutPaypalSandbox = dynamic(
  () => loadCheckoutPaypalSandbox().then((m) => m.CheckoutPaypalSandbox),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <Skeleton className="mx-auto h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    ),
  },
);

export const CheckoutBogCard = dynamic(
  () => loadCheckoutBogCard().then((m) => m.CheckoutBogCard),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <Skeleton className="mx-auto h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    ),
  },
);

export const CheckoutPaypalCard = dynamic(
  () => loadCheckoutPaypalCard().then((m) => m.CheckoutPaypalCard),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <Skeleton className="mx-auto h-5 w-40" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    ),
  },
);
