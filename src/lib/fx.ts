export type FxRates = {
  /** Units of USD per 1 EUR */
  eurUsd: number;
  /** Units of GBP per 1 EUR */
  eurGbp: number;
  /** Units of GEL per 1 EUR */
  eurGel: number;
  /** Units of RUB per 1 EUR */
  eurRub: number;
};

export const DEFAULT_FX_RATES: FxRates = {
  eurUsd: 1.08,
  eurGbp: 0.86,
  eurGel: 2.9,
  eurRub: 100,
};
