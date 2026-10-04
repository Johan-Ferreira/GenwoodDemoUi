/**
 * Project-wide mock factory for the rate matrix (`RateMatrixRead`) returned by
 * `GET /v1/curves/{Code}/rate-matrix?ObservationDateFrom=&ObservationDateTo=&Tenors=`.
 *
 * Observation dates are rows, requested tenors are columns, and each cell is
 * matched to its column by `TenorLabel`, not position (BR4). The canonical rows
 * deliberately list cells in a different order from `Tenors` so a positional
 * implementation renders the wrong values.
 *
 * The latest row's values match the canonical rates in `./rate`.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  RateMatrixCellItem,
  RateMatrixRead,
  RateMatrixRowItem,
} from '../../types/api-generated';
import { createRates } from './rate';

/** Default requested tenors (the comma-separated example `1Y,5Y,10Y`). */
export const DEFAULT_MATRIX_TENORS = ['1Y', '5Y', '10Y'] as const;

/** Single matrix cell; canonical value is the 10Y rate. */
export function createRateMatrixCell(
  overrides: Partial<RateMatrixCellItem> = {},
): RateMatrixCellItem {
  return {
    TenorLabel: '10Y',
    RatePercent: 3.55752926323083,
    ...overrides,
  };
}

/** Single matrix row for one observation date. */
export function createRateMatrixRow(
  overrides: Partial<RateMatrixRowItem> = {},
): RateMatrixRowItem {
  return {
    ObservationDate: '2026-09-30',
    Rates: [
      createRateMatrixCell({
        TenorLabel: '10Y',
        RatePercent: 3.55752926323083,
      }),
      createRateMatrixCell({ TenorLabel: '1Y', RatePercent: 3.84236619027514 }),
      createRateMatrixCell({ TenorLabel: '5Y', RatePercent: 3.48802917745362 }),
    ],
    ...overrides,
  };
}

/**
 * Canonical matrix: tenors `1Y,5Y,10Y`, three dates (ascending). Cells are in
 * 10Y/1Y/5Y order inside every row to exercise label matching (BR4).
 */
export function createRateMatrix(
  overrides: Partial<RateMatrixRead> = {},
): RateMatrixRead {
  const latest = Object.fromEntries(
    createRates().map((r) => [r.TenorLabel as string, r.RatePercent as number]),
  );
  return {
    Tenors: [...DEFAULT_MATRIX_TENORS],
    Rows: [
      createRateMatrixRow({
        ObservationDate: '2026-09-28',
        Rates: [
          createRateMatrixCell({
            TenorLabel: '10Y',
            RatePercent: 3.6176937511284,
          }),
          createRateMatrixCell({
            TenorLabel: '1Y',
            RatePercent: 3.86015524180933,
          }),
          createRateMatrixCell({
            TenorLabel: '5Y',
            RatePercent: 3.52114906632481,
          }),
        ],
      }),
      createRateMatrixRow({
        ObservationDate: '2026-09-29',
        Rates: [
          createRateMatrixCell({
            TenorLabel: '10Y',
            RatePercent: 3.57557413164773,
          }),
          createRateMatrixCell({
            TenorLabel: '1Y',
            RatePercent: 3.85102270417736,
          }),
          createRateMatrixCell({
            TenorLabel: '5Y',
            RatePercent: 3.50247781960318,
          }),
        ],
      }),
      createRateMatrixRow({
        ObservationDate: '2026-09-30',
        Rates: [
          createRateMatrixCell({
            TenorLabel: '10Y',
            RatePercent: latest['10Y'],
          }),
          createRateMatrixCell({ TenorLabel: '1Y', RatePercent: latest['1Y'] }),
          createRateMatrixCell({ TenorLabel: '5Y', RatePercent: latest['5Y'] }),
        ],
      }),
    ],
    ...overrides,
  };
}

/** A range with no imported data: requested tenors echoed, no rows. */
export function createEmptyRateMatrix(
  tenors: string[] = [...DEFAULT_MATRIX_TENORS],
): RateMatrixRead {
  return { Tenors: tenors, Rows: [] };
}
