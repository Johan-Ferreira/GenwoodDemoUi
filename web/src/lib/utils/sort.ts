/** Direction of an in-browser column sort. */
export type SortDirection = 'ascending' | 'descending';

/** The active sort: which column, which way. `null` = the list's natural order. */
export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

/**
 * The sort after choosing a column header: a new column starts ascending,
 * choosing the active column again flips it.
 */
export function nextSort<K extends string>(
  current: SortState<K> | null,
  key: K,
): SortState<K> {
  if (current?.key === key) {
    return {
      key,
      direction: current.direction === 'ascending' ? 'descending' : 'ascending',
    };
  }
  return { key, direction: 'ascending' };
}

/** A value a column sorts on: numbers compare numerically, text by locale. */
export type SortValue = number | string | null | undefined;

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

/** Character-by-character text order, for identifiers such as hex IDs. */
const plainCollator = new Intl.Collator('en', { sensitivity: 'base' });

export interface SortOptions {
  /**
   * Compare digit runs inside text as numbers ("file2" before "file10").
   * Default true; pass false for identifiers (hex IDs) that must sort
   * character by character.
   */
  numericText?: boolean;
}

/**
 * Compares two sort values in `direction`. Missing values (`null` /
 * `undefined` / NaN) always sort after present ones, in both directions.
 */
export function compareSortValues(
  a: SortValue,
  b: SortValue,
  direction: SortDirection,
  { numericText = true }: SortOptions = {},
): number {
  const aMissing = a === null || a === undefined || Number.isNaN(a);
  const bMissing = b === null || b === undefined || Number.isNaN(b);
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  const order =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : (numericText ? collator : plainCollator).compare(String(a), String(b));
  return direction === 'ascending' ? order : -order;
}

/**
 * Returns a sorted copy of `items` by the value `valueOf` reads for the
 * active column. Ties keep the incoming order (stable sort), so the
 * natural order acts as the tie-break.
 */
export function sortBy<T, K extends string>(
  items: readonly T[],
  sort: SortState<K> | null,
  valueOf: (item: T, key: K) => SortValue,
  options?: SortOptions,
): T[] {
  if (!sort) return [...items];
  return [...items].sort((a, b) =>
    compareSortValues(
      valueOf(a, sort.key),
      valueOf(b, sort.key),
      sort.direction,
      options,
    ),
  );
}
