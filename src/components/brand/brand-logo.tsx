export const BRAND_NAVY = "#1A3B5D";
export const BRAND_ORANGE = "#e67e22";
/** Existing system blue — kept for “cars.com”. */
export const BRAND_SLATE = "#1878c4";

/** Always Latin brand mark — never localized / never machine-translated. */
export const BRAND_WORDMARK = "Rentairportcars.com";

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
  const word =
    size === "xl"
      ? "text-[15px] sm:text-xl lg:text-[22px]"
      : size === "lg"
        ? "text-[15px] sm:text-lg lg:text-[19px]"
        : "text-[15px] sm:text-[17px] lg:text-[18px]";
  const gap =
    size === "xl" ? "gap-2 sm:gap-3.5" : size === "lg" ? "gap-2 sm:gap-3" : "gap-2 sm:gap-2.5";

  return (
    <span
      className={`notranslate inline-flex min-w-0 items-center ${gap} ${className}`}
      lang="en"
      translate="no"
      data-nosnippet
    >
      <span
        aria-hidden
        className={`${mark} shrink-0`}
        style={{
          backgroundColor: "var(--brand-navy)",
          WebkitMaskImage: "url(/brand/logo-mark.png?v=4)",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
          maskImage: "url(/brand/logo-mark.png?v=4)",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
          maskMode: "alpha",
        }}
      />
      <span
        className={`whitespace-nowrap font-[family-name:var(--font-brand)] font-semibold leading-none tracking-[-0.03em] ${word}`}
      >
        <span className="text-[color:var(--brand-navy)]">Rent</span>
        <span className="text-[#9a3412]">airport</span>
        <span className="text-[#14629a]">cars.com</span>
      </span>
    </span>
  );
}
