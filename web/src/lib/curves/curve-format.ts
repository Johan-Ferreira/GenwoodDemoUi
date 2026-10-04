import { NO_VALUE } from '@/lib/files/file-format';
import type { CurveRead, RateRead, TenorRead } from '@/types/api-generated';

/** Decimal places for rates (percent) and tenor years. */
export const RATE_DECIMALS = 4;

/** A number to 4 decimal places, or "—" when the service gave none. */
export function formatDecimal4(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(RATE_DECIMALS)
    : NO_VALUE;
}

/** A whole number as the service gave it, or "—". */
export function formatInteger(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : NO_VALUE;
}

const SEGMENT_TEXT: Record<string, string> = {
  Long: 'long end',
  ShortEnd: 'short end',
};

/** "{Family} · {spot|forward} · {long end|short end} · {Code}". */
export function curveSubtitle(curve: CurveRead): string {
  return [
    curve.Family,
    curve.RateType?.toLowerCase(),
    curve.Segment ? (SEGMENT_TEXT[curve.Segment] ?? curve.Segment) : undefined,
    curve.Code,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}

/** One by-maturity row: a service tenor and the rate for it (if any). */
export interface MaturityRow {
  tenor: TenorRead;
  rate: RateRead | undefined;
}

/**
 * One row per service tenor, each joined to its rate by tenor LABEL (never by
 * position). An empty rate list (no data for the date) yields no rows.
 */
export function joinRatesToTenors(
  tenors: readonly TenorRead[],
  rates: readonly RateRead[],
): MaturityRow[] {
  if (rates.length === 0) return [];
  const byLabel = new Map<string, RateRead>();
  for (const rate of rates) {
    if (rate.TenorLabel) byLabel.set(rate.TenorLabel, rate);
  }
  return tenors.map((tenor) => ({
    tenor,
    rate: tenor.Label ? byLabel.get(tenor.Label) : undefined,
  }));
}
