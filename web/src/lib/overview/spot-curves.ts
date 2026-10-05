import type { ChartSeries } from '@/lib/charts/line-chart';
import type { SpotCurveItem } from '@/types/api-generated';

export const SPOT_CURVES_TITLE = 'Spot curves on latest valuation date';
export const SPOT_CURVES_SUBTITLE =
  'Nominal, real and implied inflation, long end';
export const NO_SPOT_CURVES = 'No spot curves have been imported yet.';
export const SPOT_RATE_LABEL = 'Spot rate (%)';

/** The Overview's families, in series (colour) order. */
const SPOT_FAMILIES = ['Nominal', 'Real', 'Inflation'] as const;
type SpotFamily = (typeof SPOT_FAMILIES)[number];

export interface SpotCurvesChart {
  /** One series per family the service returned with points, in family order. */
  series: ChartSeries[];
  /** Families with no curve (or no points) on the latest date. */
  missing: SpotFamily[];
}

/** Points with a finite maturity and rate, sorted by maturity. */
function chartPoints(curve: SpotCurveItem | undefined) {
  return (curve?.Points ?? [])
    .flatMap((p) =>
      Number.isFinite(p.TenorYears) && Number.isFinite(p.RatePercent)
        ? [{ x: p.TenorYears as number, y: p.RatePercent as number }]
        : [],
    )
    .sort((a, b) => a.x - b.x);
}

/**
 * The Overview's spot curves as chart series ("Nominal spot", "Real spot",
 * "Inflation spot"), leaving out any family without data (BR2).
 */
export function spotCurvesChart(
  curves: readonly SpotCurveItem[] | undefined,
): SpotCurvesChart {
  const series: ChartSeries[] = [];
  const missing: SpotFamily[] = [];
  for (const family of SPOT_FAMILIES) {
    const points = chartPoints(curves?.find((c) => c.Family === family));
    if (points.length === 0) {
      missing.push(family);
    } else {
      series.push({ name: `${family} spot`, points });
    }
  }
  return { series, missing };
}

/** The chart subtitle, plus "No data for {family}." for each missing family. */
export function spotCurvesSubtitle(missing: readonly string[]): string {
  if (missing.length === 0) return SPOT_CURVES_SUBTITLE;
  const notes = missing.map((family) => `No data for ${family}.`).join(' ');
  return `${SPOT_CURVES_SUBTITLE}. ${notes}`;
}
