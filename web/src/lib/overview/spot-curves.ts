import { toChartPoints, type ChartSeries } from '@/lib/charts/line-chart';
import type { SpotCurveItem } from '@/types/api-generated';

export const SPOT_CURVES_TITLE = 'Spot curves on latest valuation date';
export const SPOT_CURVES_SUBTITLE =
  'Nominal, real, implied inflation and OIS, long end';
export const NO_SPOT_CURVES = 'No spot curves have been imported yet.';
export { SPOT_RATE_LABEL } from '@/lib/charts/line-chart';

/** The Overview's families, in series (colour) order. */
const SPOT_FAMILIES = ['Nominal', 'Real', 'Inflation', 'OIS'] as const;
type SpotFamily = (typeof SPOT_FAMILIES)[number];

export interface SpotCurvesChart {
  /** One series per family the service returned with points, in family order. */
  series: ChartSeries[];
  /** Families with no curve (or no points) on the latest date. */
  missing: SpotFamily[];
}

/**
 * The Overview's spot curves as chart series ("Nominal spot", "Real spot",
 * "Inflation spot", "OIS spot"), leaving out any family without data (BR2).
 */
export function spotCurvesChart(
  curves: readonly SpotCurveItem[] | undefined,
): SpotCurvesChart {
  const series: ChartSeries[] = [];
  const missing: SpotFamily[] = [];
  for (const family of SPOT_FAMILIES) {
    const points = toChartPoints(
      curves?.find((c) => c.Family === family)?.Points,
    );
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
