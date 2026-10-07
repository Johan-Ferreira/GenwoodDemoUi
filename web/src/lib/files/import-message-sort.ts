import { sortBy, type SortState, type SortValue } from '@/lib/utils/sort';
import type { ImportMessageRead } from '@/types/api-generated';

/** The row-level error columns, each sortable in the browser (R4). */
export type ImportMessageSortKey = 'row' | 'observationDate' | 'message';

export type ImportMessageSort = SortState<ImportMessageSortKey>;

/** The grid's default order: row number ascending (R4). */
export const DEFAULT_IMPORT_MESSAGE_SORT: ImportMessageSort = {
  key: 'row',
  direction: 'ascending',
};

/** The value a row-level error column sorts on; a missing value stays missing. */
export function importMessageSortValue(
  message: ImportMessageRead,
  key: ImportMessageSortKey,
): SortValue {
  switch (key) {
    case 'row':
      return message.SourceRowNumber;
    case 'observationDate':
      return message.ObservationDate?.trim() || null;
    case 'message':
      return message.Message;
  }
}

/**
 * The failed rows sorted by the active column. Rows without an observation
 * date stay in the list and sort last in both directions (R5).
 */
export function sortImportMessages(
  messages: readonly ImportMessageRead[],
  sort: ImportMessageSort | null,
): ImportMessageRead[] {
  return sortBy(messages, sort, importMessageSortValue);
}
