import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function HelpBackButton({ href = "/help", label }: { href?: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
