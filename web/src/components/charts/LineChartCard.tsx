'use client';

import { useId, useMemo, type ReactNode } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  formatRate3,
  formatYears,
  maturityTicks,
  mergeSeriesRows,
  seriesColour,
  seriesKey,
  seriesSummary,
  type ChartRow,
  type ChartSeries,
  type MaturitySegment,
} from '@/lib/charts/line-chart';
import { cn } from '@/lib/utils';

/** Plot heights: Overview 280px, Yield curves 340px. */
const PLOT_HEIGHT = {
  compact: 'h-70',
  regular: 'h-85',
} as const;
export type PlotHeight = keyof typeof PLOT_HEIGHT;

/** Legend / tooltip swatch colour per series position (chart-1 … chart-6). */
const SWATCH_CLASSES = [
  'border-chart-1',
  'border-chart-2',
  'border-chart-3',
  'border-chart-4',
  'border-chart-5',
  'border-chart-6',
] as const;

const DASH = '4 3';
const STROKE_WIDTH = 1.5;
const MATURITY_LABEL = 'Maturity (years)';

export interface LineChartCardProps {
  /** Card heading; also the accessible name of the card region and the figure. */
  title: string;
  /** Line under the title (e.g. the dates shown, or what has no data). */
  subtitle?: ReactNode;
  /** Y-axis label, e.g. "Spot rate (%)" or "Forward rate (%)". */
  yLabel: string;
  /** X-axis label; defaults to "Maturity (years)". */
  xLabel?: string;
  /** Series to draw, in colour order. Leave out any without data. */
  series: readonly ChartSeries[];
  /** Shown in place of the plot (no axes, legend or summary) when `series` is empty. */
  emptyMessage: string;
  /** Maturity ticks: long end 0–40 in 5s (default), short end 0–5. */
  segment?: MaturitySegment;
  height?: PlotHeight;
}

function summaryItemId(summaryId: string, index: number): string {
  return `${summaryId}-${index}`;
}

function Swatch({ index, dashed }: { index: number; dashed?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block w-4 shrink-0 border-t-2',
        dashed && 'border-dashed',
        SWATCH_CLASSES[index % SWATCH_CLASSES.length],
      )}
    />
  );
}

/** Hover tooltip: "{x} years", then one line per series with its rate. */
function SeriesTooltip({
  active,
  payload,
  series,
}: Pick<TooltipContentProps<number, string>, 'active' | 'payload'> & {
  series: readonly ChartSeries[];
}) {
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || row === undefined) return null;
  return (
    <div
      role="tooltip"
      className="grid min-w-40 gap-1.5 rounded-md border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md"
    >
      <p className="font-mono font-medium">{formatYears(row.x)}</p>
      {series.map((s, index) => {
        const key = seriesKey(index);
        const value = row[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <Swatch index={index} dashed={s.dashed} />
            <span className="text-muted-foreground">{s.name}</span>
            <span className="ml-auto pl-3 font-mono font-medium">
              {value === undefined ? '—' : `${formatRate3(value)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The shared maturity line chart in a titled card: rate (y, 3 decimals)
 * against maturity in years (x), series coloured chart-1 … chart-6, the
 * comparison series dashed, a hover guide with a "{x} years" tooltip, a legend
 * and an accessible text summary of the series.
 *
 * The card is a region and a figure, both named by the title; the figure is
 * described by the items of the visually hidden summary list ("Series", one
 * item per drawn series, starting with its name; a dashed series says so).
 */
export function LineChartCard({
  title,
  subtitle,
  yLabel,
  xLabel = MATURITY_LABEL,
  series,
  emptyMessage,
  segment = 'long',
  height = 'regular',
}: LineChartCardProps) {
  const titleId = useId();
  const summaryId = useId();
  const hasSeries = series.length > 0;

  const rows = useMemo(() => mergeSeriesRows(series), [series]);
  const ticks = useMemo(
    () => maturityTicks(series, segment),
    [series, segment],
  );
  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((s, index) => [
          seriesKey(index),
          { label: s.name, color: seriesColour(index) },
        ]),
      ),
    [series],
  );

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <figure
        aria-labelledby={titleId}
        // Described by the summary items themselves: pointing at the list would
        // yield its label ("Series") rather than the series text.
        aria-describedby={
          hasSeries
            ? series
                .map((_, index) => summaryItemId(summaryId, index))
                .join(' ')
            : undefined
        }
        className="flex flex-col gap-4"
      >
        <figcaption>
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          {subtitle !== undefined && (
            <p className="mt-1 text-muted-foreground">{subtitle}</p>
          )}
        </figcaption>

        {hasSeries ? (
          <>
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
              <p className="self-center text-xs text-chart-label [writing-mode:vertical-rl] rotate-180">
                {yLabel}
              </p>
              <ChartContainer
                config={config}
                className={cn(
                  'aspect-auto w-full [&_.recharts-cartesian-axis-tick_text]:font-mono',
                  PLOT_HEIGHT[height],
                )}
              >
                <LineChart
                  data={rows}
                  // Name the keyboard-focusable chart surface by the visible
                  // heading rather than an SVG <title>, which would duplicate
                  // the title text in the page.
                  aria-labelledby={titleId}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, ticks[ticks.length - 1]]}
                    ticks={ticks}
                    interval={0}
                    allowDecimals
                    stroke="var(--chart-axis)"
                    tick={{ fill: 'var(--chart-label)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    domain={['auto', 'auto']}
                    tickFormatter={formatRate3}
                    width={56}
                    stroke="var(--chart-axis)"
                    tick={{ fill: 'var(--chart-label)' }}
                    tickLine={false}
                  />
                  <ChartTooltip
                    cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                    isAnimationActive={false}
                    content={({ active, payload }) => (
                      <SeriesTooltip
                        active={active}
                        payload={payload}
                        series={series}
                      />
                    )}
                  />
                  {series.map((s, index) => (
                    <Line
                      key={seriesKey(index)}
                      type="monotone"
                      dataKey={seriesKey(index)}
                      name={s.name}
                      stroke={`var(--color-${seriesKey(index)})`}
                      strokeWidth={STROKE_WIDTH}
                      strokeDasharray={s.dashed ? DASH : undefined}
                      dot={false}
                      activeDot={{ r: 3 }}
                      connectNulls
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
              <span />
              <p className="text-center text-xs text-chart-label">{xLabel}</p>
            </div>

            {/* Visual legend; the summary list below carries the same names for
                assistive technology, so this copy is hidden from it. */}
            <div
              aria-hidden="true"
              className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs"
            >
              {series.map((s, index) => (
                <span
                  key={seriesKey(index)}
                  className="flex items-center gap-1.5"
                >
                  <Swatch index={index} dashed={s.dashed} />
                  <span>{s.name}</span>
                </span>
              ))}
            </div>

            <ul aria-label="Series" className="sr-only">
              {series.map((s, index) => (
                <li key={seriesKey(index)} id={summaryItemId(summaryId, index)}>
                  {seriesSummary(s)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p
            className={cn(
              'flex items-center justify-center text-muted-foreground',
              PLOT_HEIGHT[height],
            )}
          >
            {emptyMessage}
          </p>
        )}
      </figure>
    </section>
  );
}
