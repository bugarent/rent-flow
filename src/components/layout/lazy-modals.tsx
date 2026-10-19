"use client";

import dynamic from "next/dynamic";
import { ModalSkeleton, PanelSkeleton } from "@/components/ui/skeleton";

export const loadManageBookingModal = () => import("@/components/layout/manage-booking-modal");
export const loadContactOptionsModal = () => import("@/components/contact/contact-options-modal");
export const loadPartnerApplicationForm = () => import("@/components/partner/partner-application-form");
export const loadLiveChatPanel = () => import("@/components/live-chat/live-chat-panel");
export const loadBookingInfoModal = () => import("@/components/bookings/booking-info-modal");

export const ManageBookingModal = dynamic(
  () => loadManageBookingModal().then((m) => m.ManageBookingModal),
  { ssr: false, loading: () => <ModalSkeleton size="lg" /> },
);

export const ContactOptionsModal = dynamic(
  () => loadContactOptionsModal().then((m) => m.ContactOptionsModal),
  { ssr: false, loading: () => <ModalSkeleton size="sm" /> },
);

export const PartnerApplicationForm = dynamic(
  () => loadPartnerApplicationForm().then((m) => m.PartnerApplicationForm),
  { ssr: false, loading: () => <ModalSkeleton size="lg" /> },
);

export const LiveChatPanel = dynamic(
  () => loadLiveChatPanel().then((m) => m.LiveChatPanel),
  { ssr: false, loading: () => <PanelSkeleton /> },
);

export const BookingInfoModal = dynamic(
  () => loadBookingInfoModal().then((m) => m.BookingInfoModal),
  { ssr: false, loading: () => <ModalSkeleton size="xl" /> },
);
