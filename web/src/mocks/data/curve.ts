/**
 * Project-wide mock factory for the Curve catalogue entry (`CurveRead`) returned
 * by `GET /v1/curves`.
 *
 * Single source of truth for curve shape + canonical values, shared by the Vitest
 * and Playwright layers. Values mirror the service's 16-curve catalogue (four
 * families x Spot/Forward x Long/ShortEnd, all Percent, Bank of England).
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { CurveRead } from '../../types/api-generated';
import type { CurveFamily } from './file';

// Families are defined once (in ./file, shared with the file log) and re-exported here.
export { CURVE_FAMILIES } from './file';
export type { CurveFamily } from './file';

export const RATE_TYPES = ['Spot', 'Forward'] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const CURVE_SEGMENTS = ['Long', 'ShortEnd'] as const;
export type CurveSegment = (typeof CURVE_SEGMENTS)[number];

/** Canonical curve: UK nominal spot curve, long end (matches the OpenAPI example). */
export function createCurve(overrides: Partial<CurveRead> = {}): CurveRead {
  return {
    Id: 1,
    Code: 'GlcNominalSpotCurve',
    Name: 'UK nominal spot curve',
    Family: 'Nominal',
    RateType: 'Spot',
    Segment: 'Long',
    RateUnit: 'Percent',
    Provider: 'Bank of England',
    ...overrides,
  };
}

/** Short-end variant of the canonical curve (monthly tenors). */
export function createShortEndCurve(
  overrides: Partial<CurveRead> = {},
): CurveRead {
  return createCurve({
    Id: 2,
    Code: 'GlcNominalSpotShortEnd',
    Name: 'UK nominal spot curve, short end',
    Segment: 'ShortEnd',
    ...overrides,
  });
}

/** The full 16-curve catalogue, in service order (Id 1..16). */
export function createCurves(): CurveRead[] {
  const rows: Array<
    [number, string, string, CurveFamily, RateType, CurveSegment]
  > = [
    [
      1,
      'GlcNominalSpotCurve',
      'UK nominal spot curve',
      'Nominal',
      'Spot',
      'Long',
    ],
    [
      2,
      'GlcNominalSpotShortEnd',
      'UK nominal spot curve, short end',
      'Nominal',
      'Spot',
      'ShortEnd',
    ],
    [
      3,
      'GlcNominalFwdCurve',
      'UK instantaneous nominal forward curve',
      'Nominal',
      'Forward',
      'Long',
    ],
    [
      4,
      'GlcNominalFwdsShortEnd',
      'UK instantaneous nominal forward curve, short end',
      'Nominal',
      'Forward',
      'ShortEnd',
    ],
    [
      5,
      'GlcRealSpotCurve',
      'UK implied real spot curve',
      'Real',
      'Spot',
      'Long',
    ],
    [
      6,
      'GlcRealSpotShortEnd',
      'UK implied real spot curve, short end',
      'Real',
      'Spot',
      'ShortEnd',
    ],
    [
      7,
      'GlcRealFwdCurve',
      'UK instantaneous implied real forward curve',
      'Real',
      'Forward',
      'Long',
    ],
    [
      8,
      'GlcRealFwdsShortEnd',
      'UK instantaneous implied forward real rates, short end',
      'Real',
      'Forward',
      'ShortEnd',
    ],
    [
      9,
      'GlcInflationSpotCurve',
      'UK implied inflation spot curve',
      'Inflation',
      'Spot',
      'Long',
    ],
    [
      10,
      'GlcInflationSpotShortEnd',
      'UK implied inflation spot curve, short end',
      'Inflation',
      'Spot',
      'ShortEnd',
    ],
    [
      11,
      'GlcInflationFwdCurve',
      'UK instantaneous implied inflation forward curve',
      'Inflation',
      'Forward',
      'Long',
    ],
    [
      12,
      'GlcInflationFwdsShortEnd',
      'UK instantaneous implied forward inflation rates, short end',
      'Inflation',
      'Forward',
      'ShortEnd',
    ],
    [13, 'OisSpotCurve', 'UK OIS spot curve', 'OIS', 'Spot', 'Long'],
    [
      14,
      'OisSpotShortEnd',
      'UK OIS spot curve, short end',
      'OIS',
      'Spot',
      'ShortEnd',
    ],
    [
      15,
      'OisFwdCurve',
      'UK instantaneous OIS forward curve',
      'OIS',
      'Forward',
      'Long',
    ],
    [
      16,
      'OisFwdsShortEnd',
      'UK instantaneous OIS forward curve, short end',
      'OIS',
      'Forward',
      'ShortEnd',
    ],
  ];
  return rows.map(([Id, Code, Name, Family, RateType, Segment]) =>
    createCurve({ Id, Code, Name, Family, RateType, Segment }),
  );
}

/**
 * The catalogue filtered the way the service's `Family` / `RateType` / `Segment`
 * query parameters filter it — for mocking `GET /v1/curves?...` responses.
 */
export function filterCurves(
  curves: CurveRead[],
  filters: { Family?: string; RateType?: string; Segment?: string },
): CurveRead[] {
  return curves.filter(
    (c) =>
      (!filters.Family || c.Family === filters.Family) &&
      (!filters.RateType || c.RateType === filters.RateType) &&
      (!filters.Segment || c.Segment === filters.Segment),
  );
}
