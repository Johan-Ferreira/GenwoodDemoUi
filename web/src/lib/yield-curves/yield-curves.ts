/**
 * Yield curves view: which curves it offers, the default selection, and the
 * Across dates and Across families charts (series, subtitle and missing-data
 * copy). Pure functions.
 */
import { isIsoDate } from '@/lib/validation/iso-date';
import { toChartPoints, type ChartSeries } from '@/lib/charts/line-chart';
import type {
  AvailabilityRead,
  CurveCompareRead,
  CurveRead,
} from '@/types/api-generated';

export const YIELD_CURVES_SUBTITLE =
  'Compare a curve across dates, or curve families on one date.';

/** The curve selected on arrival: "UK nominal spot curve". */
export const DEFAULT_YIELD_CURVE_CODE = 'GlcNominalSpotCurve';

/** The two chart modes. */
export type YieldCurvesMode = 'dates' | 'families';

/** The curves the Yield curves selector offers: long end only, catalogue order. */
export function longEndCurves(curves: readonly CurveRead[]): CurveRead[] {
  return curves.filter((curve) => curve.Segment === 'Long' && curve.Code);
}

/** The default curve when offered, else the first offered ('' when none). */
export function defaultYieldCurveCode(curves: readonly CurveRead[]): string {
  if (curves.some((curve) => curve.Code === DEFAULT_YIELD_CURVE_CODE)) {
    return DEFAULT_YIELD_CURVE_CODE;
  }
  return curves[0]?.Code ?? '';
}

/** Display name of a curve (its code when the service sends no name). */
export function curveName(curve: CurveRead): string {
  return curve.Name ?? curve.Code ?? '';
}

/**
 * Default dates from availability: the latest date with data and the one
 * before it ('' when there is none).
 */
export function defaultDates(availability: AvailabilityRead): {
  valuation: string;
  compare: string;
} {
  const dates = [...new Set(availability.Dates ?? [])].filter(isIsoDate).sort();
  const valuation = dates[dates.length - 1] ?? availability.MaxDate ?? '';
  const compare = dates[dates.length - 2] ?? '';
  return { valuation, compare };
}

/** The dates to chart: valuation first, then the comparison (if set and different). */
export function acrossDatesDates(
  valuation: string,
  compare: string | null,
): string[] {
  return compare && compare !== valuation ? [valuation, compare] : [valuation];
}

/** "No data has been imported for {name}." / "… on {date}." / "… on {date} or {date}." */
export function noDataImportedMessage(
  name: string,
  dates: readonly string[] = [],
): string {
  if (dates.length === 0) return `No data has been imported for ${name}.`;
  return `No data has been imported for ${name} on ${dates.join(' or ')}.`;
}

export interface AcrossDatesChart {
  /** One series per date with points, named by date; the comparison dashed. */
  series: ChartSeries[];
  /** Requested dates the service returned no points for. */
  missing: string[];
}

/**
 * Across dates: one series per requested date (valuation first) for `code`.
 * A date whose series is absent or has no points is left out (BR2).
 */
export function acrossDatesChart(
  response: CurveCompareRead,
  code: string,
  dates: readonly string[],
): AcrossDatesChart {
  const series: ChartSeries[] = [];
  const missing: string[] = [];
  dates.forEach((date, index) => {
    const match = (response.Series ?? []).find(
      (s) => (s.Code ?? code) === code && s.ObservationDate === date,
    );
    const points = toChartPoints(match?.Points);
    if (points.length === 0) {
      missing.push(date);
    } else {
      series.push({ name: date, dashed: index > 0, points });
    }
  });
  return { series, missing };
}

/**
 * Across dates subtitle: "{date} compared with {compare date}" ("{date}" for
 * one date), replaced by the missing-data line when a date has no data.
 */
export function acrossDatesSubtitle(
  name: string,
  dates: readonly string[],
  missing: readonly string[],
): string {
  if (missing.length > 0) return noDataImportedMessage(name, missing);
  return dates.join(' compared with ');
}

/** Across families series order (chart-1 … chart-4); series are named by family. */
export const FAMILY_ORDER = ['Nominal', 'Real', 'Inflation', 'OIS'] as const;

/**
 * The family curves for Across families: one catalogue curve per family (in
 * `FAMILY_ORDER`) sharing the selected curve's RateType and Segment. A family
 * with no such curve in the catalogue is skipped.
 */
export function familyCurves(
  catalogue: readonly CurveRead[],
  selected: CurveRead,
): CurveRead[] {
  return FAMILY_ORDER.flatMap((family) => {
    const match = catalogue.find(
      (curve) =>
        curve.Code &&
        curve.Family === family &&
        curve.RateType === selected.RateType &&
        curve.Segment === selected.Segment,
    );
    return match ? [match] : [];
  });
}

/** "Spot curves by family" / "Forward curves by family". */
export function acrossFamiliesTitle(
  rateType: string | null | undefined,
): string {
  return rateType === 'Forward'
    ? 'Forward curves by family'
    : 'Spot curves by family';
}

export interface AcrossFamiliesChart {
  /** One series per family curve with points, named by family, in family order. */
  series: ChartSeries[];
  /** Names of the family curves the service returned no points for. */
  missing: string[];
}

/**
 * Across families: one series per family curve on `date`. A curve whose series
 * is absent or has no points is left out and listed by name (BR2).
 */
export function acrossFamiliesChart(
  response: CurveCompareRead,
  curves: readonly CurveRead[],
  date: string,
): AcrossFamiliesChart {
  const series: ChartSeries[] = [];
  const missing: string[] = [];
  curves.forEach((curve) => {
    const match = (response.Series ?? []).find(
      (s) => s.Code === curve.Code && s.ObservationDate === date,
    );
    const points = toChartPoints(match?.Points);
    if (points.length === 0) {
      missing.push(curveName(curve));
    } else {
      series.push({ name: curve.Family ?? curveName(curve), points });
    }
  });
  return { series, missing };
}

/**
 * Across families subtitle: "{date}, long end" (or "short end"), replaced by
 * "No data has been imported for {name}[ or {name}] on {date}." when a family
 * curve has no data.
 */
export function acrossFamiliesSubtitle(
  date: string,
  segment: string | null | undefined,
  missing: readonly string[],
): string {
  if (missing.length > 0) return familiesNoDataMessage(missing, date);
  return `${date}, ${segment === 'ShortEnd' ? 'short end' : 'long end'}`;
}

/** "No data has been imported for {name}[ or {name}…] on {date}." */
export function familiesNoDataMessage(
  names: readonly string[],
  date: string,
): string {
  return `No data has been imported for ${names.join(' or ')} on ${date}.`;
}
