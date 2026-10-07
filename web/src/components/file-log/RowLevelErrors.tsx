'use client';

import { useId, useState } from 'react';

import {
  CELL_CLASS,
  HEAD_CLASS,
  TableSkeleton,
} from '@/components/curve-data/RatesByMaturity';
import { DataState } from '@/components/data-state/DataState';
import { NotFoundMessage } from '@/components/data-state/NotFoundMessage';
import { IMPORT_NOT_FOUND } from '@/components/file-log/ImportTrace';
import { SortableTableHead } from '@/components/table-sort/SortableTableHead';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getImportMessages } from '@/lib/api/endpoints';
import { lookUp } from '@/lib/api/not-found';
import { NO_VALUE } from '@/lib/files/file-format';
import {
  DEFAULT_IMPORT_MESSAGE_SORT,
  sortImportMessages,
  type ImportMessageSort,
  type ImportMessageSortKey,
} from '@/lib/files/import-message-sort';
import { nextSort } from '@/lib/utils/sort';
import type {
  ImportMessageRead,
  ImportMessageReadList,
} from '@/types/api-generated';

export const ROW_LEVEL_ERRORS_TITLE = 'Row-level errors';
export const VIEW_ROW_LEVEL_ERRORS = 'View row-level errors';
export const HIDE_ROW_LEVEL_ERRORS = 'Hide row-level errors';
export const NO_FAILED_ROWS = 'No failed rows.';
export const ROW_NUMBER_HELP =
  'Row numbers count the header rows of the original file, so each one matches the row number a spreadsheet shows when you open the Download original file.';
const FILE_LIST_PATH = '/file-log';

const COLUMNS: ReadonlyArray<{
  key: ImportMessageSortKey;
  label: string;
  className?: string;
}> = [
  { key: 'row', label: 'Row number', className: 'w-32 text-right' },
  { key: 'observationDate', label: 'Observation date', className: 'w-40' },
  { key: 'message', label: 'Message' },
];

function messagesOf(list: ImportMessageReadList): ImportMessageRead[] {
  return list.ImportMessages ?? [];
}

/** The failed rows, client-sorted (default row number ascending; R3–R5, BR2). */
function RowLevelErrorsTable({
  messages,
}: {
  messages: readonly ImportMessageRead[];
}) {
  const [sort, setSort] = useState<ImportMessageSort>(
    DEFAULT_IMPORT_MESSAGE_SORT,
  );
  const rows = sortImportMessages(messages, sort);

  return (
    <div className="max-h-(--layout-table-max-height) overflow-auto rounded-md border [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <SortableTableHead
                key={column.key}
                label={column.label}
                sortKey={column.key}
                sort={sort}
                onSortChange={(key) =>
                  setSort((current) => nextSort(current, key))
                }
                className={`${HEAD_CLASS} ${column.className ?? ''}`}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((message, index) => (
            <TableRow key={`${message.SourceRowNumber ?? 'row'}-${index}`}>
              <TableCell className={`${CELL_CLASS} text-right`}>
                {message.SourceRowNumber ?? NO_VALUE}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                {message.ObservationDate?.trim() || NO_VALUE}
              </TableCell>
              <TableCell className="px-3 py-2 break-words whitespace-normal">
                {message.Message ?? NO_VALUE}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The row-level errors of a Failed file's import, inline in the file details:
 * `GET /v1/imports/{woid}/messages` (full Woid, BR3) through DataState; empty →
 * "No failed rows."; 404 → "Import not found" with the way back (BR4).
 */
export function RowLevelErrors({ woid }: { woid: string }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 border-t border-border-subtle pt-4"
    >
      <h3 id={titleId} className="text-base font-semibold">
        {ROW_LEVEL_ERRORS_TITLE}
      </h3>
      <p className="text-muted-foreground">{ROW_NUMBER_HELP}</p>
      <DataState
        load={() => lookUp(() => getImportMessages(encodeURIComponent(woid)))}
        skeleton={<TableSkeleton />}
        isEmpty={(lookup) =>
          lookup.found && messagesOf(lookup.value).length === 0
        }
        empty={NO_FAILED_ROWS}
      >
        {(lookup) =>
          lookup.found ? (
            <RowLevelErrorsTable messages={messagesOf(lookup.value)} />
          ) : (
            <NotFoundMessage
              message={IMPORT_NOT_FOUND}
              backHref={FILE_LIST_PATH}
              backLabel="Back to the file list"
            />
          )
        }
      </DataState>
    </section>
  );
}
