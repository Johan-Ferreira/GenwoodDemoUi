/**
 * Project-wide mock factory for the Rate entity (`RateRead`) returned by
 * `GET /v1/curves/{Code}/rates?ObservationDate=YYYY-MM-DD`.
 *
 * Every rate carries the WOID of the import that produced it (BR2). The canonical
 * WOID is taken from the File factory (`./file`) so a rate always traces to the
 * same import that `createFile()` / `createImport()` describe — never a free-floating
 * literal. Rates are in percent (BR3), full service precision.
 *
 * An unknown observation date returns HTTP 200 with an empty `Rates` array
 * (BR1) — use `createEmptyRates()` for that case.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  RateRead,
  RateReadList,
  TenorRead,
} from '../../types/api-generated';
import { createFile } from './file';
import { createShortEndTenors, createTenors } from './tenor';

/** WOID of the canonical import (`createFile()`), which produced the canonical rates. */
export const CANONICAL_RATE_WOID = createFile().Woid as string;

/** Canonical observation date for the canonical rates (the latest available date). */
export const CANONICAL_OBSERVATION_DATE = '2026-09-30';

/** Long-end rate (percent) per tenor label on the canonical date. */
const LONG_END_RATES: Record<string, number> = {
  '0.5Y': 3.95120447816203,
  '1Y': 3.84236619027514,
  '2Y': 3.70418853390127,
  '5Y': 3.48802917745362,
  '10Y': 3.55752926323083,
  '20Y': 4.21863051978845,
  '30Y': 4.47190362515528,
};

/** Short-end rate (percent) per tenor label on the canonical date. */
const SHORT_END_RATES: Record<string, number> = {
  '1M': 4.0215338841216,
  '3M': 3.98764102257731,
  '6M': 3.95120447816203,
  '12M': 3.84236619027514,
  '24M': 3.70418853390127,
  '60M': 3.48802917745362,
};

/** Canonical rate: 10Y on `GlcNominalSpotCurve` (matches the OpenAPI example). */
export function createRate(overrides: Partial<RateRead> = {}): RateRead {
  return {
    TenorLabel: '10Y',
    TenorYears: 10,
    RatePercent: 3.55752926323083,
    SourceRowId: 26,
    Woid: CANONICAL_RATE_WOID,
    ...overrides,
  };
}

function ratesFor(
  tenors: TenorRead[],
  values: Record<string, number>,
  overrides: Partial<RateRead>,
): RateRead[] {
  return tenors.map((t) =>
    createRate({
      TenorLabel: t.Label,
      TenorYears: t.Years,
      RatePercent: values[t.Label as string],
      ...overrides,
    }),
  );
}

/**
 * One rate per long-end tenor (`createTenors()`) for the canonical date, all from
 * the canonical import. `overrides` apply to every rate (e.g. a different Woid).
 */
export function createRates(overrides: Partial<RateRead> = {}): RateRead[] {
  return ratesFor(createTenors(), LONG_END_RATES, overrides);
}

/** One rate per short-end tenor (`createShortEndTenors()`) for the canonical date. */
export function createShortEndRates(
  overrides: Partial<RateRead> = {},
): RateRead[] {
  return ratesFor(createShortEndTenors(), SHORT_END_RATES, overrides);
}

/** Response body for `GET .../rates` with the canonical long-end rates. */
export function createRateList(
  rates: RateRead[] = createRates(),
): RateReadList {
  return { Rates: rates };
}

/** Response body for a date with no imported data: 200 with an empty list (BR1). */
export function createEmptyRates(): RateReadList {
  return { Rates: [] };
}
