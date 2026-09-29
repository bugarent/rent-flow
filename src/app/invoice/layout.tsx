import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoice — Rent Airport Cars",
  robots: { index: false, follow: false },
};

/** Minimal layout so shared invoice links do not depend on the public marketing shell. */
export default function InvoiceShareLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#e8ecf2]">{children}</div>;
}
