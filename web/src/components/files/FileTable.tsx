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
import { fileStatusTone, formatCount } from '@/lib/files/file-format';
import type { FileSort, FileSortKey } from '@/lib/files/file-sort';
import type { FileRow } from '@/types/files';

const HEAD_CLASS =
  'h-9 px-2 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_CLASS = 'px-2 py-2.5';
/** Monospace values (12px) keep the columns within a desktop-width table. */
const MONO_CELL_CLASS = `${CELL_CLASS} font-mono text-xs`;
/**
 * The columns after File get wider horizontal padding so they spread across
 * the table instead of bunching against the right edge (spacing tokens only).
 */
const SPREAD_CLASS = 'px-4';

const COLUMNS: ReadonlyArray<{
  key: FileSortKey;
  label: string;
  className?: string;
}> = [
  { key: 'id', label: '#', className: 'w-14' },
  // File takes whatever width the other columns leave (see its cell).
  { key: 'fileName', label: 'File', className: 'w-full' },
  { key: 'curveFamily', label: 'Curve family', className: SPREAD_CLASS },
  { key: 'receivedAt', label: 'Received', className: SPREAD_CLASS },
  {
    key: 'recordsInserted',
    label: 'Records inserted',
    className: `${SPREAD_CLASS} text-right`,
  },
  { key: 'status', label: 'Status', className: SPREAD_CLASS },
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
 * The file-log columns (#, File, Curve family, Received, Records inserted,
 * Status) for the given rows, in the order supplied.
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
            <TableCell className={`${MONO_CELL_CLASS} text-muted-foreground`}>
              {row.id}
            </TableCell>
            {/* max-w-0 + w-full: the column fills the leftover width and a long
                name is cut with an ellipsis (full name on hover) rather than
                pushing the table into a horizontal scroll. */}
            <TableCell
              className={`${MONO_CELL_CLASS} w-full max-w-0 truncate`}
              title={row.fileName}
            >
              {row.fileName}
            </TableCell>
            <TableCell className={`${CELL_CLASS} ${SPREAD_CLASS}`}>
              {row.curveFamily}
            </TableCell>
            <TableCell className={`${MONO_CELL_CLASS} ${SPREAD_CLASS}`}>
              {row.receivedAt}
            </TableCell>
            <TableCell
              className={`${MONO_CELL_CLASS} ${SPREAD_CLASS} text-right tabular-nums`}
            >
              {formatCount(row.recordsInserted)}
            </TableCell>
            <TableCell className={`${CELL_CLASS} ${SPREAD_CLASS}`}>
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
