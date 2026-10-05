/**
 * Project-wide curve point tables (`CurvePointItem`) shared by the Overview spot
 * curves (`SpotCurveItem.Points`) and the curve compare series
 * (`CurveCompareSeriesItem.Points`).
 *
 * The nominal spot points on the canonical date are derived from the Rate factory
 * (`createRates()`), so the chart, the rates table and the 10Y headline rate always
 * agree. Other families / dates use representative values at the same long-end
 * tenors (`LONG_END_YEARS`). Rates are in percent, full service precision.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { CurvePointItem } from '../../types/api-generated';
import { createRates } from './rate';
import { LONG_END_YEARS } from './tenor';

export const POINT_SETS = [
  'Nominal',
  'Real',
  'Inflation',
  'OIS',
  'NominalPrevious',
] as const;
export type PointSet = (typeof POINT_SETS)[number];

/** Rate (percent) per long-end tenor year, for families other than canonical nominal. */
const LONG_END_POINT_TABLES: Record<
  Exclude<PointSet, 'Nominal'>,
  Record<number, number>
> = {
  Real: {
    0.5: 0.41838210477104,
    1: 0.36254718930126,
    2: 0.28917403352281,
    5: 0.21470658813092,
    10: 0.33906122017486,
    20: 0.98213470562913,
    30: 1.24719835406271,
  },
  Inflation: {
    0.5: 3.53282237339099,
    1: 3.47981900097388,
    2: 3.41501450037846,
    5: 3.2733225893227,
    10: 3.21846804305597,
    20: 3.23649581415932,
    30: 3.22470527109257,
  },
  OIS: {
    0.5: 3.97813520416633,
    1: 3.86102774153092,
    2: 3.71640298816225,
    5: 3.50217664028114,
    10: 3.58631190274456,
    20: 4.14092736611058,
    30: 4.38825301947712,
  },
  /** Nominal spot on the previous available date (for the across-dates comparison). */
  NominalPrevious: {
    0.5: 3.96834101275519,
    1: 3.85911746210347,
    2: 3.72286408813552,
    5: 3.50617823390451,
    10: 3.53652926323083,
    20: 4.19944137020681,
    30: 4.45583190662205,
  },
};

/** Canonical nominal spot points on the canonical date, from the Rate factory. */
function nominalPoints(): CurvePointItem[] {
  return createRates().map((r) => ({
    TenorYears: r.TenorYears,
    RatePercent: r.RatePercent,
  }));
}

/** Long-end points (ascending tenor) for a family / date point set. */
export function createCurvePoints(set: PointSet = 'Nominal'): CurvePointItem[] {
  if (set === 'Nominal') return nominalPoints();
  const table = LONG_END_POINT_TABLES[set];
  return LONG_END_YEARS.map((years) => ({
    TenorYears: years,
    RatePercent: table[years],
  }));
}
