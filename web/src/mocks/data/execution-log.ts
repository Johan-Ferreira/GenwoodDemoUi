/**
 * Project-wide mock factory for the ExecutionLogEntry entity (`ExecutionLogRead`)
 * and its envelope (`ExecutionLogReadList`) returned by
 * `GET /v1/process-instances/{Id}/execution-logs`.
 *
 * Each variant mirrors the matching detail in `./process-instance-detail`
 * (same activities, timestamps inside the run's CreatedAt..LastExecutedAt window),
 * ordered oldest first as the service returns it (BR2). The faulted log carries
 * the failing activity's message — the same text as the failed file's
 * `ExceptionNote` in `./file-detail` — so the cause can be read (BR5).
 *
 * Event names use the service's plain form ("Started" / "Completed" / "Faulted");
 * `createPrefixedExecutionLogs()` gives the "Activity"-prefixed form the design
 * strips, for exercising both.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  ExecutionLogRead,
  ExecutionLogReadList,
} from '../../types/api-generated';

/** Canonical entry (matches the OpenAPI example's "Completed" event). */
export function createExecutionLog(
  overrides: Partial<ExecutionLogRead> = {},
): ExecutionLogRead {
  return {
    Timestamp: '2026-09-30 18:02:19',
    ActivityName: 'PublishCurves',
    EventName: 'Completed',
    Message: 'Published 26 rates for 1 curve',
    ...overrides,
  };
}

function entry(
  Timestamp: string,
  ActivityName: string,
  EventName: string,
  Message?: string,
): ExecutionLogRead {
  const log = createExecutionLog({
    Timestamp,
    ActivityName,
    EventName,
    Message,
  });
  if (Message === undefined) delete log.Message;
  return log;
}

/** Log for the canonical Finished run (`createProcessInstanceDetail()`), oldest first. */
export function createExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:02:11', 'ReceiveFile', 'Started'),
    entry(
      '2026-09-30 18:02:12',
      'ReceiveFile',
      'Completed',
      'File received from inbox',
    ),
    entry('2026-09-30 18:02:12', 'BackupFile', 'Started'),
    entry('2026-09-30 18:02:13', 'BackupFile', 'Completed', 'Backup written'),
    entry('2026-09-30 18:02:13', 'ParseRates', 'Started'),
    entry('2026-09-30 18:02:17', 'ParseRates', 'Completed', 'Parsed 26 rows'),
    entry('2026-09-30 18:02:17', 'PublishCurves', 'Started'),
    createExecutionLog(),
  ];
}

/** Log for the Faulted run (`createFaultedProcessInstanceDetail()`): ParseRates faults. */
export function createFaultedExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:05:40', 'ReceiveFile', 'Started'),
    entry(
      '2026-09-30 18:05:41',
      'ReceiveFile',
      'Completed',
      'File received from inbox',
    ),
    entry('2026-09-30 18:05:41', 'BackupFile', 'Started'),
    entry('2026-09-30 18:05:42', 'BackupFile', 'Completed', 'Backup written'),
    entry('2026-09-30 18:05:42', 'ParseRates', 'Started'),
    entry(
      '2026-09-30 18:05:44',
      'ParseRates',
      'Faulted',
      'Row 12: invalid rate',
    ),
  ];
}

/** Log for the Running run (`createRunningProcessInstanceDetail()`): BackupFile in progress. */
export function createRunningExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:09:02', 'ReceiveFile', 'Started'),
    entry(
      '2026-09-30 18:09:04',
      'ReceiveFile',
      'Completed',
      'File received from inbox',
    ),
    entry('2026-09-30 18:09:05', 'BackupFile', 'Started'),
  ];
}

/** The canonical log with "Activity"-prefixed event names ("ActivityStarted" ...). */
export function createPrefixedExecutionLogs(): ExecutionLogRead[] {
  return createExecutionLogs().map((log) => ({
    ...log,
    EventName: `Activity${log.EventName}`,
  }));
}

/** Response body for the execution-logs endpoint. */
export function createExecutionLogList(
  logs: ExecutionLogRead[] = createExecutionLogs(),
): ExecutionLogReadList {
  return { ExecutionLogs: logs };
}

/** A run with no log entries (drives "No log entries exist"). */
export function createEmptyExecutionLogList(): ExecutionLogReadList {
  return { ExecutionLogs: [] };
}
