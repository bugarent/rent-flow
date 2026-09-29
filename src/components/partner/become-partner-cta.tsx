"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSurfaceDictionary } from "@/components/providers/use-surface-dictionary";

const BecomePartnerModal = dynamic(
  () =>
    import("@/components/partner/become-partner-modal").then((m) => m.BecomePartnerModal),
  { ssr: false },
);

export function BecomePartnerCta({
  className = "inline-flex h-10 items-center rounded-md bg-[#22c55e] px-4 text-sm font-bold text-white hover:bg-[#16a34a]",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const { dictionary } = useSurfaceDictionary();
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
        {label ?? dictionary.partner.applyCta}
      </button>
      {mounted ? (
        <BecomePartnerModal open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
