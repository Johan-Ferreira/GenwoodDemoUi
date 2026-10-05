/**
 * Data shaping and copy for the shared maturity line chart (`LineChartCard`):
 * axis ticks, the merged rows Recharts draws, and the text summary of each
 * series. Pure functions only, so the chart component stays presentational.
 */

/** One point on a curve: maturity in years against a rate in percent. */
export interface ChartPoint {
  x: number;
  y: number;
}

/** One drawn line. Series are coloured chart-1, chart-2, … in the order given. */
export interface ChartSeries {
  /** Name shown in the legend, tooltip and text summary. */
  name: string;
  /** Drawn dashed (the comparison series), and said so in the summary. */
  dashed?: boolean;
  points: readonly ChartPoint[];
}

/** One merged row: the maturity plus each series' rate there (if it has one). */
export type ChartRow = { x: number } & Record<string, number | undefined>;

/** Maturity axis: long end 0 to 40 in fives, short end 0 to 5 in ones. */
export type MaturitySegment = 'long' | 'short';

const AXIS_EXTENT: Record<MaturitySegment, { max: number; step: number }> = {
  long: { max: 40, step: 5 },
  short: { max: 5, step: 1 },
};

/** Number of chart colour tokens (`--chart-1` … `--chart-6`). */
export const CHART_COLOUR_COUNT = 6;

/**
 * Maturity ticks from 0 to the segment's usual end, extended in the same steps
 * when the data goes further (extend rather than clip).
 */
export function maturityTicks(
  series: readonly ChartSeries[],
  segment: MaturitySegment = 'long',
): number[] {
  const { max, step } = AXIS_EXTENT[segment];
  const dataMax = Math.max(
    0,
    ...series.flatMap((s) => s.points.map((p) => p.x)),
  );
  const end = Math.max(max, Math.ceil(dataMax / step) * step);
  const count = Math.round(end / step);
  return Array.from({ length: count + 1 }, (_, i) =>
    Number((i * step).toFixed(6)),
  );
}

/** Data key (and colour variable suffix) of the series at `index`. */
export function seriesKey(index: number): string {
  return `s${index}`;
}

/**
 * Rows sorted by maturity, one per distinct x, with each series' rate under
 * its `seriesKey`.
 */
export function mergeSeriesRows(series: readonly ChartSeries[]): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  for (const [index, s] of series.entries()) {
    for (const point of s.points) {
      const row = rows.get(point.x) ?? { x: point.x };
      row[seriesKey(index)] = point.y;
      rows.set(point.x, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.x - b.x);
}

/** Tooltip heading: "{x} years". */
export function formatYears(x: number): string {
  return `${Number(x.toFixed(4))} years`;
}

/** A rate to 3 decimals (the chart's y precision). */
export function formatRate3(y: number): string {
  return y.toFixed(3);
}

/** CSS colour for the series at `index` (chart-1 … chart-6, then repeating). */
export function seriesColour(index: number): string {
  return `var(--chart-${(index % CHART_COLOUR_COUNT) + 1})`;
}

/**
 * Plain-language text alternative for one series (NFR3): its name first, then
 * the line style when dashed, then its maturity and rate ranges.
 */
export function seriesSummary(series: ChartSeries): string {
  const style = series.dashed ? ', dashed line' : '';
  const xs = series.points.map((p) => p.x);
  const ys = series.points.map((p) => p.y);
  if (xs.length === 0) return `${series.name}${style}: no points`;
  const pointCount = `${xs.length} ${xs.length === 1 ? 'point' : 'points'}`;
  return (
    `${series.name}${style}: ${pointCount} from ` +
    `${Number(Math.min(...xs).toFixed(4))} to ${formatYears(Math.max(...xs))}, ` +
    `rates ${formatRate3(Math.min(...ys))}% to ${formatRate3(Math.max(...ys))}%`
  );
}
