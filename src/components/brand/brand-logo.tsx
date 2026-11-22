export const BRAND_NAVY = "#1A3B5D";
export const BRAND_ORANGE = "#e67e22";
/** Accent blue used on the final word of the mark. */
export const BRAND_SLATE = "#1878c4";

/** Always Latin brand mark — never localized / never machine-translated. No ".com" in the label. */
export const BRAND_WORDMARK = "Rent Airport Cars";

export function BrandLogo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  const mark =
    size === "xl"
      ? "h-8 w-9 sm:h-11 sm:w-[52px] lg:h-12 lg:w-[56px]"
      : size === "lg"
        ? "h-8 w-9 sm:h-10 sm:w-[48px] lg:h-11 lg:w-[52px]"
        : "h-8 w-[38px] sm:h-9 sm:w-[43px] lg:h-[42px] lg:w-[50px]";
  // Slightly tighter on phones so currency/language chips keep room on the next row.
  const word =
    size === "xl"
      ? "text-[13px] sm:text-xl lg:text-[22px]"
      : size === "lg"
        ? "text-[13px] sm:text-lg lg:text-[19px]"
        : "text-[13px] sm:text-[17px] lg:text-[18px]";
  const gap =
    size === "xl" ? "gap-1.5 sm:gap-3.5" : size === "lg" ? "gap-1.5 sm:gap-3" : "gap-1.5 sm:gap-2.5";

  return (
    <span
      className={`notranslate inline-flex min-w-0 max-w-full items-center ${gap} ${className}`}
      lang="en"
      translate="no"
      data-nosnippet
    >
      <span
        aria-hidden
        className={`${mark} shrink-0`}
        style={{
          backgroundColor: "var(--brand-navy)",
          WebkitMaskImage: "url(/brand/logo-mark.webp?v=4)",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
          maskImage: "url(/brand/logo-mark.webp?v=4)",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
          maskMode: "alpha",
        }}
      />
      <span
        className={`min-w-0 truncate whitespace-nowrap font-[family-name:var(--font-brand)] font-semibold leading-none tracking-[-0.02em] ${word}`}
      >
        <span className="text-[color:var(--brand-navy)]">Rent</span>
        <span className="text-[color:var(--brand-navy)]">{"\u00A0"}</span>
        <span className="text-[#9a3412]">Airport</span>
        <span className="text-[color:var(--brand-navy)]">{"\u00A0"}</span>
        <span className="text-[#14629a]">Cars</span>
      </span>
    </span>
  );
}
