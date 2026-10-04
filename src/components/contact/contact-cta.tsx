"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePreferences } from "@/components/providers/preferences-context";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";

const ContactOptionsModal = dynamic(
  () =>
    import("@/components/contact/contact-options-modal").then((m) => m.ContactOptionsModal),
  { ssr: false, loading: () => <RouteLoadingSpinner /> },
);

export function ContactCta({
  className = "hover:text-white",
  label,
  email,
  phone,
}: {
  className?: string;
  label?: string;
  email?: string;
  phone?: string;
}) {
  const { dictionary } = usePreferences();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
      >
        {label ?? dictionary.common.contact}
      </button>
      {mounted ? (
        <ContactOptionsModal
          open={open}
          onClose={() => setOpen(false)}
          email={email}
          phone={phone}
        />
      ) : null}
    </>
  );
}
