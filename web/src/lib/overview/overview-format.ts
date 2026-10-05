import type { StatusTone } from '@/components/status-chip/StatusChip';
import { parseNullableNumber } from '@/lib/api/nullable-number';
import { RATE_DECIMALS } from '@/lib/curves/curve-format';
import type { FileCountsItem, KeyRateItem } from '@/types/api-generated';

/** Value shown on a stat card when the service returned nothing for it. */
export const NO_DATA = 'No data';

/** Line under the Latest valuation date card when nothing has been imported. */
export const NO_RATES_IMPORTED = 'No rates have been imported yet.';

/** The fixed source sentence of the Overview subtitle. */
export const OVERVIEW_SOURCE =
  'Source: Bank of England, daily estimated UK yield curves.';

/** True minus sign (U+2212) for negative changes. */
const MINUS = '−';

/** The tenor of the Overview headline rates. */
const HEADLINE_TENOR = '10Y';

/** "Latest valuation date {date}. Source: …", or the source sentence alone. */
export function overviewSubtitle(latestDate: string | null): string {
  return latestDate
    ? `Latest valuation date ${latestDate}. ${OVERVIEW_SOURCE}`
    : OVERVIEW_SOURCE;
}

/** The service's latest valuation date, or `null` when absent or empty. */
export function latestValuationDate(raw: string | undefined): string | null {
  const text = raw?.trim();
  return text ? text : null;
}

function sameText(a: string | undefined, b: string): boolean {
  return a?.trim().toLowerCase() === b.toLowerCase();
}

/**
 * The 10Y spot key rate for a curve family ("Nominal", "Inflation"), or
 * `undefined` when the service did not return one. Items that state a
 * different tenor or rate type are never used.
 */
export function findHeadlineRate(
  keyRates: readonly KeyRateItem[] | undefined,
  family: string,
): KeyRateItem | undefined {
  return (keyRates ?? []).find(
    (rate) =>
      sameText(rate.Family, family) &&
      (rate.TenorLabel === undefined ||
        sameText(rate.TenorLabel, HEADLINE_TENOR)) &&
      (rate.RateType === undefined || sameText(rate.RateType, 'Spot')),
  );
}

/** A percent rate to 4 decimals, or `null` when the service gave no number. */
export function formatRatePercent(value: number | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(RATE_DECIMALS)
    : null;
}

export interface ChangeLine {
  text: string;
  tone: StatusTone;
}

/**
 * "+2.1 bp vs prior day" (success) / "−2.1 bp vs prior day" (danger), 1 decimal.
 * `null` when there is no prior day (BR1): no change line at all.
 */
export function changeLine(
  rawChangeBp: string | number | null | undefined,
): ChangeLine | null {
  const change = parseNullableNumber(rawChangeBp);
  if (change === null) return null;

  const magnitude = Math.abs(change).toFixed(1);
  if (Number(magnitude) === 0) {
    return { text: `${magnitude} bp vs prior day`, tone: 'neutral' };
  }
  return change > 0
    ? { text: `+${magnitude} bp vs prior day`, tone: 'success' }
    : { text: `${MINUS}${magnitude} bp vs prior day`, tone: 'danger' };
}

function count(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** "{n} failed, {m} current", or "{m} current" when none have failed. */
export function filesReceivedLine(counts: FileCountsItem): string {
  const failed = count(counts.Failed);
  const current = count(counts.Current).toLocaleString('en-GB');
  return failed > 0
    ? `${failed.toLocaleString('en-GB')} failed, ${current} current`
    : `${current} current`;
}

/** The total file count, or `null` when the service gave none. */
export function filesReceivedTotal(
  counts: FileCountsItem | undefined,
): string | null {
  const total = counts?.Total;
  return typeof total === 'number' && Number.isFinite(total)
    ? total.toLocaleString('en-GB')
    : null;
}
