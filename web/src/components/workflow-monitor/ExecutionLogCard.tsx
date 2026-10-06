import Link from 'next/link';
import { useId, useMemo } from 'react';

import { fileLogSelectionPath } from '@/components/file-log/useSelectedFile';
import { StatusChip } from '@/components/status-chip/StatusChip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NO_VALUE } from '@/lib/files/file-format';
import { FILE_LOG_PATH } from '@/lib/navigation/nav-items';
import {
  collapseExecutingPairs,
  logEventTone,
  plainEventName,
  sortLogsOldestFirst,
} from '@/lib/workflow/execution-log';
import type { ExecutionLogRead } from '@/types/api-generated';

export const NO_LOG_ENTRIES = 'No log entries exist';
export const EXECUTION_LOG_SUBTITLE = "Each step's events, oldest first";

const HEAD_CLASS =
  'h-9 px-3 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_CLASS = 'px-3 py-2 align-top';

function text(value: string | undefined): string {
  return value !== undefined && value.trim() !== '' ? value : NO_VALUE;
}

/** No entries (R5): say so and route to the run's file details. */
function NoLogEntries({ fileId }: { fileId: number | null }) {
  return (
    <div className="flex flex-col items-start gap-2 px-5 pb-5">
      <p className="font-medium">{NO_LOG_ENTRIES}</p>
      <Link
        href={fileId === null ? FILE_LOG_PATH : fileLogSelectionPath(fileId)}
        className="focus-ring rounded-sm text-primary underline underline-offset-2"
      >
        {fileId === null ? 'Open the file log' : "Open this run's file details"}
      </Link>
    </div>
  );
}

function LogTable({ logs }: { logs: readonly ExecutionLogRead[] }) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className={`${HEAD_CLASS} w-[170px]`}>Timestamp</TableHead>
          <TableHead className={`${HEAD_CLASS} w-[220px]`}>Activity</TableHead>
          <TableHead className={`${HEAD_CLASS} w-[120px]`}>Event</TableHead>
          <TableHead className={HEAD_CLASS}>Message</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log, index) => {
          const event = log.EventName ? plainEventName(log.EventName) : '';
          return (
            <TableRow key={`${index}-${log.Timestamp ?? ''}`}>
              <TableCell className={`${CELL_CLASS} font-mono text-xs`}>
                {text(log.Timestamp)}
              </TableCell>
              <TableCell className={`${CELL_CLASS} truncate`}>
                {text(log.ActivityName)}
              </TableCell>
              <TableCell className={CELL_CLASS}>
                {event !== '' ? (
                  <StatusChip tone={logEventTone(event)} label={event} />
                ) : (
                  NO_VALUE
                )}
              </TableCell>
              <TableCell className={`${CELL_CLASS} whitespace-normal`}>
                {text(log.Message)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * The run's execution log (R4, BR2, BR5): Timestamp, Activity, Event, Message,
 * always oldest first, one row per Executing/Executed pair; empty → "No log entries exist" with the file route (R5).
 */
export function ExecutionLogCard({
  logs,
  fileId,
}: {
  logs: readonly ExecutionLogRead[];
  /** The run's file (ProcessInstanceId → import → File.Id), for the empty-log route. */
  fileId: number | null;
}) {
  const titleId = useId();
  const ordered = useMemo(
    () => collapseExecutingPairs(sortLogsOldestFirst(logs)),
    [logs],
  );

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <div className="px-5 pt-5">
        <h2 id={titleId} className="text-base font-semibold">
          Execution log
        </h2>
        <p className="mt-1 text-muted-foreground">{EXECUTION_LOG_SUBTITLE}</p>
      </div>
      {ordered.length === 0 ? (
        <NoLogEntries fileId={fileId} />
      ) : (
        <div className="border-t">
          <LogTable logs={ordered} />
        </div>
      )}
    </section>
  );
}
