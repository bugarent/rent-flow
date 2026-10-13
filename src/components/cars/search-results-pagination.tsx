"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Six rows of the four-column desktop grid. */
export const SEARCH_RESULTS_PAGE_SIZE = 24;

type PageItem = number | "gap-start" | "gap-end";

/** First, last, and the pages around the current one; gaps become "…". */
function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const items: PageItem[] = [1];
  if (start > 2) items.push("gap-start");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < total - 1) items.push("gap-end");
  items.push(total);
  return items;
}

export function SearchResultsPagination({
  page,
  pageCount,
  onPageChange,
  prevLabel,
  nextLabel,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  if (pageCount <= 1) return null;
  const arrowClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#1d6fe8] hover:text-[#1d6fe8] disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      <button
        type="button"
        aria-label={prevLabel}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={arrowClass}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      {pageItems(page, pageCount).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-bold tabular-nums shadow-sm transition",
              item === page
                ? "border-[#1d6fe8] bg-[#1d6fe8] text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-[#1d6fe8] hover:text-[#1d6fe8]",
            )}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="inline-flex h-10 w-6 items-center justify-center text-slate-400" aria-hidden>
            …
          </span>
        ),
      )}
      <button
        type="button"
        aria-label={nextLabel}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={arrowClass}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </nav>
  );
}
