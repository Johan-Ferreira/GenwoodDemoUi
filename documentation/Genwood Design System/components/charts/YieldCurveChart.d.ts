export interface CurveSeries {
  name: string;
  /** [maturityYears, yieldPercent] pairs, ascending by maturity. */
  points: [number, number][];
  /** Defaults to --chart-N by index. */
  color?: string;
  /** Dashed thinner line — use for comparison dates (e.g. prior day). */
  dashed?: boolean;
}
export interface YieldCurveChartProps {
  series: CurveSeries[];
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xTicks?: number[];
  /** Decimals in hover tooltip (default 2). */
  yDecimals?: number;
  showPoints?: boolean;
  style?: React.CSSProperties;
}
export declare function YieldCurveChart(props: YieldCurveChartProps): JSX.Element;
