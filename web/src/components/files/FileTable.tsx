import type { KeyboardEvent } from 'react';

import { StatusChip } from '@/components/status-chip/StatusChip';
import { SortableTableHead } from '@/components/table-sort/SortableTableHead';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fileStatusTone,
  formatCount,
  formatFileSize,
  shortWoid,
} from '@/lib/files/file-format';
import type { FileSort, FileSortKey } from '@/lib/files/file-sort';
import type { FileRow } from '@/types/files';

const HEAD_CLASS =
  'h-9 px-3 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_CLASS = 'px-3 py-2.5';

const COLUMNS: ReadonlyArray<{
  key: FileSortKey;
  label: string;
  className?: string;
}> = [
  { key: 'id', label: 'ID', className: 'w-14' },
  { key: 'fileName', label: 'File' },
  { key: 'curveFamily', label: 'Curve family' },
  { key: 'receivedAt', label: 'Received' },
  { key: 'sizeBytes', label: 'Size', className: 'text-right' },
  {
    key: 'recordsInserted',
    label: 'Records inserted',
    className: 'text-right',
  },
  { key: 'woid', label: 'WOID' },
  { key: 'status', label: 'Status' },
];

export interface FileTableProps {
  rows: readonly FileRow[];
  /** Active sort, shown on its header. Omit (with `onSortChange`) for plain headers. */
  sort?: FileSort | null;
  /** When given, every header is a sort button that reports its column. */
  onSortChange?: (key: FileSortKey) => void;
  /** Id of the selected file: its row gets `aria-selected` and the selected fill. */
  selectedId?: number | null;
  /** When given, rows are clickable (and keyboard-activatable) and report their file. */
  onSelect?: (row: FileRow) => void;
}

const SELECTABLE_ROW_CLASS =
  'cursor-pointer focus-ring aria-selected:bg-selected aria-selected:shadow-[inset_2px_0_0_var(--selected-foreground)] aria-selected:hover:bg-selected';

/**
 * The file-log columns (ID, File, Curve family, Received, Size, Records
 * inserted, WOID, Status) for the given rows, in the order supplied.
 */
export function FileTable({
  rows,
  sort = null,
  onSortChange,
  selectedId = null,
  onSelect,
}: FileTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => {
            const className = column.className
              ? `${HEAD_CLASS} ${column.className}`
              : HEAD_CLASS;
            return onSortChange ? (
              <SortableTableHead
                key={column.key}
                label={column.label}
                sortKey={column.key}
                sort={sort}
                onSortChange={onSortChange}
                className={className}
              />
            ) : (
              <TableHead key={column.key} className={className}>
                {column.label}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            {...(onSelect && {
              className: SELECTABLE_ROW_CLASS,
              tabIndex: 0,
              'aria-selected': row.id === selectedId,
              onClick: () => onSelect(row),
              onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(row);
                }
              },
            })}
          >
            <TableCell
              className={`${CELL_CLASS} font-mono text-muted-foreground`}
            >
              {row.id}
            </TableCell>
            <TableCell className={`${CELL_CLASS} font-mono`}>
              {row.fileName}
            </TableCell>
            <TableCell className={CELL_CLASS}>{row.curveFamily}</TableCell>
            <TableCell className={`${CELL_CLASS} font-mono`}>
              {row.receivedAt}
            </TableCell>
            <TableCell className={`${CELL_CLASS} text-right font-mono`}>
              {formatFileSize(row.sizeBytes)}
            </TableCell>
            <TableCell className={`${CELL_CLASS} text-right font-mono`}>
              {formatCount(row.recordsInserted)}
            </TableCell>
            <TableCell
              className={`${CELL_CLASS} font-mono text-muted-foreground`}
              title={row.woid}
            >
              {shortWoid(row.woid)}
            </TableCell>
            <TableCell className={CELL_CLASS}>
              <StatusChip
                tone={fileStatusTone(row.status)}
                label={row.status}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
