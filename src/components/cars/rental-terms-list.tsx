"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type RentalTermsItem = {
  id: string;
  title: string;
  body: string;
};

export function RentalTermsList({
  items,
  disclaimer,
  className,
}: {
  items: RentalTermsItem[];
  disclaimer?: string;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className={className}>
      <ul className="divide-y divide-slate-200">
        {items.map((item) => {
          const openItem = expandedId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm text-slate-800 hover:bg-slate-50 sm:px-5"
                aria-expanded={openItem}
                onClick={() => setExpandedId(openItem ? null : item.id)}
              >
                <span className="font-medium leading-snug">{item.title}</span>
                {openItem ? (
                  <Minus className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.25} />
                ) : (
                  <Plus className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2.25} />
                )}
              </button>
              <div
                className={cn(
                  "overflow-hidden px-4 sm:px-5",
                  openItem ? "pb-3.5" : "h-0 pb-0",
                )}
              >
                {openItem ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {item.body}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {disclaimer ? (
        <p className="border-t border-slate-200 px-4 py-3.5 text-xs font-semibold leading-relaxed text-slate-700 sm:px-5">
          {disclaimer}
        </p>
      ) : null}
    </div>
  );
}
