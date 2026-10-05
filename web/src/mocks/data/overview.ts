/**
 * Project-wide mock factory for the Overview (`OverviewRead`) returned by
 * `GET /v1/overview`, and its parts: key rates (`KeyRateItem`), file counts
 * (`FileCountsItem`) and spot curves (`SpotCurveItem`).
 *
 * Composes the sibling factories rather than re-defining shapes:
 * - the 10Y nominal key rate equals the canonical 10Y rate (`createRate()`),
 * - spot curve points come from `./curve-points`,
 * - `RecentFiles` are the five newest files from `createFiles()` (newest first:
 *   104 Staging, 105 Staged, 103 Importing, 106 Failed/RateLoad/Validate,
 *   102 Failed/ImportPro/HoldImportDetailsLog) — each carries Status/Stage/FailedStep,
 * - `FileCounts` carries Staging/Staged/Importing/Imported/Failed (summing to
 *   Total); see `FILE_COUNT_BREAKDOWN_ORDER` for the display order,
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

/** Families drawn on the Overview spot curves chart, in series order (chart-1..4). */
export const SPOT_CURVE_FAMILIES = [
  'Nominal',
  'Real',
  'Inflation',
  'OIS',
] as const;
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

/**
 * Order of the Overview "Files received" breakdown line (Story 5 AC-6). Only
 * non-zero statuses are shown, in THIS order, lower-cased:
 *   Imported, Importing, Staged, Staging, Failed
 * e.g. `createLiveFileCounts()` -> "2 imported, 19 importing, 10 failed"
 * (the user-approved example). Keyed by `FileCountsItem` field name.
 */
export const FILE_COUNT_BREAKDOWN_ORDER = [
  'Imported',
  'Importing',
  'Staged',
  'Staging',
  'Failed',
] as const;

/**
 * Canonical counts, matching the `createFiles()` collection in `./file` (9 files,
 * all current): 1 staging, 1 staged, 1 importing, 3 imported, 3 failed.
 * Breakdown line: "3 imported, 1 importing, 1 staged, 1 staging, 3 failed".
 * Staging + Staged + Importing + Imported + Failed === Total.
 */
export function createFileCounts(
  overrides: Partial<FileCountsItem> = {},
): FileCountsItem {
  return {
    Total: 9,
    Current: 9,
    Failed: 3,
    Staging: 1,
    Staged: 1,
    Importing: 1,
    Imported: 3,
    ...overrides,
  };
}

/**
 * The live service's counts (2026-10-05): 31 files, zero Staging / Staged.
 * Breakdown line: "2 imported, 19 importing, 10 failed".
 */
export function createLiveFileCounts(
  overrides: Partial<FileCountsItem> = {},
): FileCountsItem {
  return {
    Total: 31,
    Current: 31,
    Failed: 10,
    Staging: 0,
    Staged: 0,
    Importing: 19,
    Imported: 2,
    ...overrides,
  };
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
    OIS: { code: 'OisSpotCurve', name: 'UK OIS spot curve' },
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

/** Spot curves for the given families (default: all four, in series order). */
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
 * Files logged but no rates published — no valuation date, empty `KeyRates` and
 * `SpotCurves`. Recent files are the four newest (Staging, Staged, Importing,
 * RateLoad-failed), and the counts match them.
 */
export function createEmptyRatesOverview(
  overrides: Partial<OverviewRead> = {},
): OverviewRead {
  return {
    KeyRates: [],
    FileCounts: {
      Total: 4,
      Current: 4,
      Failed: 1,
      Staging: 1,
      Staged: 1,
      Importing: 1,
      Imported: 0,
    },
    SpotCurves: [],
    RecentFiles: createRecentFiles(4),
    ...overrides,
  };
}

/** Nothing imported or received at all. */
export function createEmptyOverview(): OverviewRead {
  return {
    KeyRates: [],
    FileCounts: {
      Total: 0,
      Current: 0,
      Failed: 0,
      Staging: 0,
      Staged: 0,
      Importing: 0,
      Imported: 0,
    },
    SpotCurves: [],
    RecentFiles: [],
  };
}
