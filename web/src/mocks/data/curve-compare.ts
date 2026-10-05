/**
 * Project-wide mock factory for curve comparisons (`CurveCompareRead`) returned by
 * `GET /v1/curves/compare?Codes=...&ObservationDates=...`.
 *
 * One series per code/date combination that has rates; combinations with no rates
 * are ABSENT from `Series` (BR2) — model the missing-data case by omitting them
 * (`createCurveCompare([...])` with only the series that exist), never by an empty
 * `Points` series.
 *
 * Curve codes / names come from the Curve factory (`createCurves()`); points from
 * `./curve-points`; dates from `./availability` (latest + previous available date).
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  CurveCompareRead,
  CurveCompareSeriesItem,
} from '../../types/api-generated';
import { LATEST_AVAILABLE_DATE, PREVIOUS_AVAILABLE_DATE } from './availability';
import { createCurves } from './curve';
import type { CurveFamily } from './file';
import { createCurvePoints } from './curve-points';

/** Families in Across families series order (chart-1..4). */
export const COMPARE_FAMILY_ORDER: readonly CurveFamily[] = [
  'Nominal',
  'Real',
  'Inflation',
  'OIS',
];

/** Canonical series: UK nominal spot curve on the latest available date. */
export function createCompareSeries(
  overrides: Partial<CurveCompareSeriesItem> = {},
): CurveCompareSeriesItem {
  return {
    Code: 'GlcNominalSpotCurve',
    Name: 'UK nominal spot curve',
    ObservationDate: LATEST_AVAILABLE_DATE,
    Points: createCurvePoints('Nominal'),
    ...overrides,
  };
}

/** UK nominal spot curve on the previous available date (the dashed comparison). */
export function createPreviousDateSeries(
  overrides: Partial<CurveCompareSeriesItem> = {},
): CurveCompareSeriesItem {
  return createCompareSeries({
    ObservationDate: PREVIOUS_AVAILABLE_DATE,
    Points: createCurvePoints('NominalPrevious'),
    ...overrides,
  });
}

/** Response body wrapping the given series. */
export function createCurveCompare(
  series: CurveCompareSeriesItem[] = [
    createCompareSeries(),
    createPreviousDateSeries(),
  ],
): CurveCompareRead {
  return { Series: series };
}

/**
 * Across families: the long-end curves of one rate type for one date, in
 * Nominal, Real, Inflation, OIS order. Pass `families` to omit some (missing data).
 */
export function createFamilyCompare(
  rateType: 'Spot' | 'Forward' = 'Spot',
  families: readonly CurveFamily[] = COMPARE_FAMILY_ORDER,
  observationDate: string = LATEST_AVAILABLE_DATE,
): CurveCompareRead {
  const catalogue = createCurves();
  const series = families.map((family) => {
    const curve = catalogue.find(
      (c) =>
        c.Family === family && c.RateType === rateType && c.Segment === 'Long',
    );
    return createCompareSeries({
      Code: curve?.Code,
      Name: curve?.Name,
      ObservationDate: observationDate,
      Points: createCurvePoints(family),
    });
  });
  return createCurveCompare(series);
}

/** No requested combination has rates: empty `Series`. */
export function createEmptyCompare(): CurveCompareRead {
  return { Series: [] };
}
