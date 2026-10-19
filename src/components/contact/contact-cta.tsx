"use client";

import { useState } from "react";
import { usePreferences } from "@/components/providers/preferences-context";
import { ContactOptionsModal, loadContactOptionsModal } from "@/components/layout/lazy-modals";
import { preloadProps, usePreloadWhenIdle } from "@/lib/client/preload";

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
  usePreloadWhenIdle(loadContactOptionsModal);

  return (
    <>
      <button
        type="button"
        className={className}
        {...preloadProps(loadContactOptionsModal)}
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
