import type { CurveRead } from '@/types/api-generated';

/** The service's curve rate types (the `RateType` filter values). */
export const RATE_TYPES = ['Spot', 'Forward'] as const;

/** The service's curve segments (the `Segment` filter values). */
export const CURVE_SEGMENTS = ['Long', 'ShortEnd'] as const;

/** Catalogue filters; `null` means "All" (no filter on that attribute). */
export interface CurveFilters {
  family: string | null;
  rateType: string | null;
  segment: string | null;
}

export const NO_CURVE_FILTERS: CurveFilters = {
  family: null,
  rateType: null,
  segment: null,
};

export function hasCurveFilters(filters: CurveFilters): boolean {
  return (
    filters.family !== null ||
    filters.rateType !== null ||
    filters.segment !== null
  );
}

/** The curves matching every set filter, in catalogue order. */
export function filterCurveCatalogue(
  curves: readonly CurveRead[],
  filters: CurveFilters,
): CurveRead[] {
  return curves.filter(
    (curve) =>
      (filters.family === null || curve.Family === filters.family) &&
      (filters.rateType === null || curve.RateType === filters.rateType) &&
      (filters.segment === null || curve.Segment === filters.segment),
  );
}

/** Keep `code` when it is still listed, else the first listed curve ('' when none). */
export function keepOrFirstCurve(
  curves: readonly CurveRead[],
  code: string,
): string {
  if (curves.some((curve) => curve.Code === code)) return code;
  return curves[0]?.Code ?? '';
}
