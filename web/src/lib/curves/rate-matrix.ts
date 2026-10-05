import type {
  CurveRead,
  RateMatrixRead,
  TenorRead,
} from '@/types/api-generated';

/** Inline message for tenors not entered as comma-separated labels (R10). */
export const TENOR_LIST_MESSAGE =
  'Separate tenor labels with commas, for example 1Y,5Y,10Y.';

/** One tenor label: letters, digits and a decimal point (e.g. 10Y, 6M, 0.5Y). */
const TENOR_LABEL_PATTERN = /^[0-9A-Za-z.]+$/;

/**
 * Parses a comma-separated tenor list. Spaces around commas are tolerated;
 * labels are upper-cased. `[]` means "nothing entered" (use the key tenors);
 * `null` means the text is not a comma-separated list of labels.
 */
export function parseTenorList(text: string): string[] | null {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  const labels = trimmed.split(',').map((part) => part.trim());
  if (labels.some((label) => !TENOR_LABEL_PATTERN.test(label))) return null;
  return [...new Set(labels.map((label) => label.toUpperCase()))];
}

/** The design's key tenors, in months: long end and short end. */
const KEY_TENOR_MONTHS: Record<'Long' | 'ShortEnd', readonly number[]> = {
  Long: [12, 24, 60, 120, 240, 360],
  ShortEnd: [1, 3, 6, 12, 24, 60],
};

const KEY_TENOR_LABELS: Record<'Long' | 'ShortEnd', readonly string[]> = {
  Long: ['1Y', '2Y', '5Y', '10Y', '20Y', '30Y'],
  ShortEnd: ['1M', '3M', '6M', '1Y', '2Y', '5Y'],
};

/**
 * The key tenors for a curve when none are entered: long end 1Y, 2Y, 5Y, 10Y,
 * 20Y, 30Y; short end 1M, 3M, 6M, 1Y, 2Y, 5Y. Matched to the curve's own
 * tenors by maturity (months) so the service's labels are used (a short-end
 * curve may label 1Y as 12M); falls back to the design labels when the curve
 * lists none of them.
 */
export function keyTenorLabels(
  curve: CurveRead,
  tenors: readonly TenorRead[],
): string[] {
  const segment = curve.Segment === 'ShortEnd' ? 'ShortEnd' : 'Long';
  const matched = KEY_TENOR_MONTHS[segment].flatMap((months) => {
    const tenor = tenors.find((candidate) => candidate.Months === months);
    return tenor?.Label ? [tenor.Label] : [];
  });
  return matched.length > 0 ? matched : [...KEY_TENOR_LABELS[segment]];
}

/** One matrix row: the observation date and one value per column (or undefined). */
export interface MatrixRow {
  date: string;
  values: (number | undefined)[];
}

/** The matrix laid out for display. */
export interface MatrixLayout {
  /** Column tenor labels, in the service's `Tenors[]` order. */
  tenors: string[];
  /** Rows newest date first. */
  rows: MatrixRow[];
}

/**
 * Lays out a rate matrix: one column per `Tenors[]` entry, each row's cells
 * matched to columns by `TenorLabel` (never by position; BR4). Rows run newest
 * first; a missing cell is `undefined`.
 */
export function layOutRateMatrix(matrix: RateMatrixRead): MatrixLayout {
  const tenors = matrix.Tenors ?? [];
  const rows = (matrix.Rows ?? []).map((row) => {
    const byLabel = new Map<string, number | undefined>();
    for (const cell of row.Rates ?? []) {
      if (cell.TenorLabel) byLabel.set(cell.TenorLabel, cell.RatePercent);
    }
    return {
      date: row.ObservationDate ?? '',
      values: tenors.map((label) => byLabel.get(label)),
    };
  });
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return { tenors, rows };
}
