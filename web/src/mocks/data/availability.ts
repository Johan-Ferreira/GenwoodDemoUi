/**
 * Project-wide mock factory for curve availability (`AvailabilityRead`) returned
 * by `GET /v1/curves/{Code}/availability`.
 *
 * `MinDate` / `MaxDate` match the OpenAPI example; `Dates` is a representative
 * ascending subset of observation dates with data (always including both ends).
 * Dates are YYYY-MM-DD (BR5).
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { AvailabilityRead } from '../../types/api-generated';
import { CANONICAL_OBSERVATION_DATE } from './rate';

/** Observation dates with data for the canonical curve (ascending). */
export const AVAILABLE_DATES = [
  '2020-01-02',
  '2026-09-24',
  '2026-09-25',
  '2026-09-28',
  '2026-09-29',
  CANONICAL_OBSERVATION_DATE,
] as const;

/** Latest date with data (default Valuation date on Yield curves). */
export const LATEST_AVAILABLE_DATE =
  AVAILABLE_DATES[AVAILABLE_DATES.length - 1];

/** Previous date with data (default "Compare with" date on Yield curves). */
export const PREVIOUS_AVAILABLE_DATE =
  AVAILABLE_DATES[AVAILABLE_DATES.length - 2];

/** A weekend date inside the range with no imported data (for the "No data imported" case). */
export const DATE_WITHOUT_DATA = '2026-09-27';

/** Canonical availability for `GlcNominalSpotCurve`. */
export function createAvailability(
  overrides: Partial<AvailabilityRead> = {},
): AvailabilityRead {
  return {
    MinDate: AVAILABLE_DATES[0],
    MaxDate: AVAILABLE_DATES[AVAILABLE_DATES.length - 1],
    Dates: [...AVAILABLE_DATES],
    ...overrides,
  };
}

/** A curve with no imported data at all: no min/max, empty date list. */
export function createEmptyAvailability(): AvailabilityRead {
  return { Dates: [] };
}
