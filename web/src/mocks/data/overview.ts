/**
 * Project-wide mock factory for the Overview (`OverviewRead`) returned by
 * `GET /v1/overview`, and its parts: key rates (`KeyRateItem`), file counts
 * (`FileCountsItem`) and spot curves (`SpotCurveItem`).
 *
 * Composes the sibling factories rather than re-defining shapes:
 * - the 10Y nominal key rate equals the canonical 10Y rate (`createRate()`),
 * - spot curve points come from `./curve-points`,
 * - `RecentFiles` are the five newest files from `createFiles()` (newest first),
 * - the latest valuation date is `CANONICAL_OBSERVATION_DATE`.
 *
 * `ChangeBp` is a nullable number rendered as a string by the codegen; "no prior
 * day" (null) is represented by omitting the field — use `withoutChange()`.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  FileCountsItem,
  FileRead,
  KeyRateItem,
  OverviewRead,
  SpotCurveItem,
} from '../../types/api-generated';
import { createCurvePoints } from './curve-points';
import { createFiles } from './file';
import { CANONICAL_OBSERVATION_DATE, createRate } from './rate';

/** Families drawn on the Overview spot curves chart, in series order (chart-1..3). */
export const SPOT_CURVE_FAMILIES = ['Nominal', 'Real', 'Inflation'] as const;
export type SpotCurveFamily = (typeof SPOT_CURVE_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Key rates
// ---------------------------------------------------------------------------

/** Canonical key rate: 10Y nominal spot, up 2.1 bp on the prior day. */
export function createKeyRate(
  overrides: Partial<KeyRateItem> = {},
): KeyRateItem {
  return {
    CurveCode: 'GlcNominalSpotCurve',
    Name: 'UK nominal spot curve',
    Family: 'Nominal',
    RateType: 'Spot',
    TenorLabel: '10Y',
    RatePercent: createRate().RatePercent,
    ChangeBp: '2.1',
    ...overrides,
  };
}

/** 10Y implied inflation spot, down 1.4 bp on the prior day (the "decrease" case). */
export function createInflationKeyRate(
  overrides: Partial<KeyRateItem> = {},
): KeyRateItem {
  return createKeyRate({
    CurveCode: 'GlcInflationSpotCurve',
    Name: 'UK implied inflation spot curve',
    Family: 'Inflation',
    RatePercent: createCurvePoints('Inflation').find((p) => p.TenorYears === 10)
      ?.RatePercent,
    ChangeBp: '-1.4',
    ...overrides,
  });
}

/** Drop `ChangeBp` (the service's null: no prior day, BR1). */
export function withoutChange(rate: KeyRateItem): KeyRateItem {
  const copy = { ...rate };
  delete copy.ChangeBp;
  return copy;
}

/** Both headline key rates: nominal (increase) then inflation (decrease). */
export function createKeyRates(): KeyRateItem[] {
  return [createKeyRate(), createInflationKeyRate()];
}

// ---------------------------------------------------------------------------
// File counts
// ---------------------------------------------------------------------------

/** Canonical counts: some failed (so the "{n} failed, {m} current" line shows). */
export function createFileCounts(
  overrides: Partial<FileCountsItem> = {},
): FileCountsItem {
  return { Total: 6, Current: 2, Failed: 2, ...overrides };
}

// ---------------------------------------------------------------------------
// Spot curves
// ---------------------------------------------------------------------------

const SPOT_CURVE_META: Record<SpotCurveFamily, { code: string; name: string }> =
  {
    Nominal: { code: 'GlcNominalSpotCurve', name: 'UK nominal spot curve' },
    Real: { code: 'GlcRealSpotCurve', name: 'UK implied real spot curve' },
    Inflation: {
      code: 'GlcInflationSpotCurve',
      name: 'UK implied inflation spot curve',
    },
  };

/** Long-end spot curve for one family on the canonical date. */
export function createSpotCurve(
  family: SpotCurveFamily = 'Nominal',
  overrides: Partial<SpotCurveItem> = {},
): SpotCurveItem {
  const meta = SPOT_CURVE_META[family];
  return {
    CurveCode: meta.code,
    CurveName: meta.name,
    RateType: 'Spot',
    Family: family,
    Segment: 'Long',
    ObservationDate: CANONICAL_OBSERVATION_DATE,
    Points: createCurvePoints(family),
    ...overrides,
  };
}

/** Spot curves for the given families (default: all three, in series order). */
export function createSpotCurves(
  families: readonly SpotCurveFamily[] = SPOT_CURVE_FAMILIES,
): SpotCurveItem[] {
  return families.map((f) => createSpotCurve(f));
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** The five newest files from the shared file collection, newest first. */
export function createRecentFiles(limit = 5): FileRead[] {
  return [...createFiles()]
    .sort((a, b) => (b.ReceivedAt ?? '').localeCompare(a.ReceivedAt ?? ''))
    .slice(0, limit);
}

/** Canonical, fully populated Overview. */
export function createOverview(
  overrides: Partial<OverviewRead> = {},
): OverviewRead {
  return {
    LatestValuationDate: CANONICAL_OBSERVATION_DATE,
    KeyRates: createKeyRates(),
    FileCounts: createFileCounts(),
    SpotCurves: createSpotCurves(),
    RecentFiles: createRecentFiles(),
    ...overrides,
  };
}

/**
 * The live service's state at smoke test (2026-10-04): files logged but no rates
 * — no valuation date, empty `KeyRates` and `SpotCurves`, counts 4 / 4 / 0.
 */
export function createEmptyRatesOverview(
  overrides: Partial<OverviewRead> = {},
): OverviewRead {
  return {
    KeyRates: [],
    FileCounts: { Total: 4, Current: 4, Failed: 0 },
    SpotCurves: [],
    RecentFiles: createRecentFiles(4),
    ...overrides,
  };
}

/** Nothing imported or received at all. */
export function createEmptyOverview(): OverviewRead {
  return {
    KeyRates: [],
    FileCounts: { Total: 0, Current: 0, Failed: 0 },
    SpotCurves: [],
    RecentFiles: [],
  };
}
