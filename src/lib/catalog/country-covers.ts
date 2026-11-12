/** Landmark photo shown behind the homepage search once a country is picked. */
export type CountryCover = {
  /** Landscape, desktop / tablet. */
  webp: string;
  avif?: string;
  /** 3:4 crop around the landmark, phones. */
  mobileWebp: string;
  mobileAvif?: string;
  /** Horizontal focus of the landmark, 0 (left) … 1 (right). */
  focalX: number;
  width: number;
  height: number;
  /** Set for admin uploads; built-in covers have none. */
  updatedAt?: string;
};

export type CountryCoverMap = Record<string, CountryCover>;

function builtIn(iso: string, focalX: number): CountryCover {
  const base = `/images/countries/${iso}`;
  return {
    webp: `${base}.webp`,
    avif: `${base}.avif`,
    mobileWebp: `${base}-sm.webp`,
    mobileAvif: `${base}-sm.avif`,
    focalX,
    width: 1280,
    height: 720,
  };
}

/** Shipped with the site; an admin upload for the same country replaces it. */
export const BUILT_IN_COUNTRY_COVERS: CountryCoverMap = {
  GE: builtIn("ge", 0.66),
  AM: builtIn("am", 0.4),
  AZ: builtIn("az", 0.63),
  ME: builtIn("me", 0.7),
  RS: builtIn("rs", 0.5),
};

export function normalizeCoverIso(iso: string | null | undefined): string {
  const code = String(iso || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "";
}

export function clampFocal(value: unknown, fallback = 0.5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}
