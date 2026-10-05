import type { KeyboardEvent } from 'react';

import { StatusChip } from '@/components/status-chip/StatusChip';
import { SortableTableHead } from '@/components/table-sort/SortableTableHead';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NO_VALUE, shortWoid } from '@/lib/files/file-format';
import {
  shortInstanceId,
  type ProcessInstanceSort,
  type ProcessInstanceSortKey,
} from '@/lib/workflow/process-instances';
import { runStatusDisplay } from '@/lib/workflow/process-status';
import type { ProcessInstanceRead } from '@/types/api-generated';

const HEAD_CLASS =
  'h-9 px-2 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_CLASS = 'px-2 py-2.5';
const MONO_CELL_CLASS = `${CELL_CLASS} font-mono text-xs`;

const COLUMNS: ReadonlyArray<{ key: ProcessInstanceSortKey; label: string }> = [
  { key: 'instanceId', label: 'Instance ID' },
  { key: 'processName', label: 'Process' },
  { key: 'contextId', label: 'Context (WOID)' },
  { key: 'createdAt', label: 'Created' },
  { key: 'lastExecutedAt', label: 'Last executed' },
  { key: 'lastActivity', label: 'Last activity' },
  { key: 'status', label: 'Status' },
];

const SELECTABLE_ROW_CLASS =
  'cursor-pointer focus-ring aria-selected:bg-selected aria-selected:shadow-[inset_2px_0_0_var(--selected-foreground)] aria-selected:hover:bg-selected';

function text(value: string | undefined): string {
  return value && value.trim() !== '' ? value : NO_VALUE;
}

export interface ProcessInstanceTableProps {
  /** Rows in the order to show them. */
  instances: readonly ProcessInstanceRead[];
  sort: ProcessInstanceSort | null;
  onSortChange: (key: ProcessInstanceSortKey) => void;
  /** ID of the selected run: its row gets `aria-selected` and the selected fill. */
  selectedId?: string | null;
  /** When given, rows are clickable (and keyboard-activatable) and report their run. */
  onSelect?: (instance: ProcessInstanceRead) => void;
}

/**
 * The "Process instances" columns (Instance ID, Process, Context (WOID),
 * Created, Last executed, Last activity, Status); every header sorts.
 */
export function ProcessInstanceTable({
  instances,
  sort,
  onSortChange,
  selectedId = null,
  onSelect,
}: ProcessInstanceTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => (
            <SortableTableHead
              key={column.key}
              label={column.label}
              sortKey={column.key}
              sort={sort}
              onSortChange={onSortChange}
              className={HEAD_CLASS}
            />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {instances.map((instance, index) => {
          const id = instance.ProcessInstanceId ?? '';
          const woid = instance.ContextId ?? '';
          const status = runStatusDisplay(instance);
          return (
            <TableRow
              key={id || `row-${index}`}
              {...(onSelect && {
                className: SELECTABLE_ROW_CLASS,
                tabIndex: 0,
                'aria-selected': id !== '' && id === selectedId,
                onClick: () => onSelect(instance),
                onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(instance);
                  }
                },
              })}
            >
              <TableCell
                className={`${MONO_CELL_CLASS} text-muted-foreground`}
                title={id || undefined}
              >
                {id ? shortInstanceId(id) : NO_VALUE}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                {text(instance.ProcessName)}
              </TableCell>
              <TableCell
                className={`${MONO_CELL_CLASS} text-muted-foreground`}
                title={woid || undefined}
              >
                {woid ? shortWoid(woid) : NO_VALUE}
              </TableCell>
              <TableCell className={MONO_CELL_CLASS}>
                {text(instance.CreatedAt)}
              </TableCell>
              <TableCell className={MONO_CELL_CLASS}>
                {text(instance.LastExecutedAt)}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                {text(instance.LastExecutedActivityName)}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                {status ? (
                  <StatusChip tone={status.tone} label={status.label} />
                ) : (
                  NO_VALUE
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
