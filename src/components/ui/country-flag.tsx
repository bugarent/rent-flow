import { cn } from "@/lib/utils";

/** Official flag artwork via Flagcdn (ISO 3166-1 alpha-2, including XK). */
export function countryFlagUrl(iso2: string, width = 40) {
  return `https://flagcdn.com/w${width}/${iso2.trim().toLowerCase()}.png`;
}

export function CountryFlag({
  iso2,
  className,
  title,
}: {
  iso2: string;
  className?: string;
  title?: string;
}) {
  const code = iso2.trim().toUpperCase();
  if (code.length !== 2) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={countryFlagUrl(code, 40)}
      srcSet={`${countryFlagUrl(code, 80)} 2x`}
      alt=""
      title={title ?? code}
      width={20}
      height={15}
      loading="lazy"
      decoding="async"
      className={cn("inline-block h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)]", className)}
    />
  );
}
