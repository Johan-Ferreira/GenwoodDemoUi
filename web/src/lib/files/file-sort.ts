import { sortBy, type SortState, type SortValue } from '@/lib/utils/sort';
import type { FileRow } from '@/types/files';

/** The file-log columns, each sortable in the browser (R9). */
export type FileSortKey =
  | 'id'
  | 'fileName'
  | 'curveFamily'
  | 'receivedAt'
  | 'sizeBytes'
  | 'recordsInserted'
  | 'woid'
  | 'status';

export type FileSort = SortState<FileSortKey>;

/** The value a file-log column sorts on (numbers stay numbers; missing stays `null`). */
export function fileSortValue(row: FileRow, key: FileSortKey): SortValue {
  return row[key];
}

/**
 * The rows sorted by the active column. Missing sizes / records inserted sort
 * last in both directions (BR4); ties keep the incoming (newest-first) order.
 */
export function sortFileRows(
  rows: readonly FileRow[],
  sort: FileSort | null,
): FileRow[] {
  return sortBy(rows, sort, fileSortValue);
}
