/**
 * Project-wide mock factory for the Tenor entity (`TenorRead`) returned by
 * `GET /v1/curves/{Code}/tenors`.
 *
 * Values follow the service's tenor table: long-end curves use half-year steps
 * (`Years0_5`, `Years1`, ... with `TenorId` = years x 2 for curve 1); short-end
 * curves use monthly steps (`Months1`, ...). Collections here are a
 * representative subset — tests must not assume a fixed grid.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { TenorRead } from '../../types/api-generated';

/** Canonical tenor: 10Y on the nominal spot long-end curve (matches the OpenAPI example). */
export function createTenor(overrides: Partial<TenorRead> = {}): TenorRead {
  return {
    TenorId: 20,
    Label: '10Y',
    Years: 10,
    Months: 120,
    SourceColumn: 'Years10',
    ...overrides,
  };
}

/** Build a long-end tenor from its year value (e.g. 0.5 -> `0.5Y`, `Years0_5`). */
export function longEndTenor(years: number): TenorRead {
  return createTenor({
    TenorId: years * 2,
    Label: `${years}Y`,
    Years: years,
    Months: years * 12,
    SourceColumn: `Years${String(years).replace('.', '_')}`,
  });
}

/** Build a short-end tenor from its month count (e.g. 6 -> `6M`, `Months6`). */
export function shortEndTenor(months: number): TenorRead {
  return createTenor({
    TenorId: 1000 + months,
    Label: `${months}M`,
    Years: Number((months / 12).toFixed(4)),
    Months: months,
    SourceColumn: `Months${months}`,
  });
}

/** Long-end years used by the canonical collections (ascending). */
export const LONG_END_YEARS = [0.5, 1, 2, 5, 10, 20, 30] as const;

/** Short-end months used by the canonical collections (ascending). */
export const SHORT_END_MONTHS = [1, 3, 6, 12, 24, 60] as const;

/** Representative long-end tenor list for `GlcNominalSpotCurve`. */
export function createTenors(): TenorRead[] {
  return LONG_END_YEARS.map(longEndTenor);
}

/** Representative short-end tenor list for `GlcNominalSpotShortEnd`. */
export function createShortEndTenors(): TenorRead[] {
  return SHORT_END_MONTHS.map(shortEndTenor);
}
