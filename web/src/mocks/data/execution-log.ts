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
 * The live service actually writes "Executing" + "Executed" PAIRS per activity;
 * the `createPaired…ExecutionLogs()` factories below mirror that shape (the
 * single-row factories above are kept unchanged for the existing tests).
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

/** Log for the canonical Finished ImportFile run (`createProcessInstanceDetail()`), oldest first. */
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

/** Log for the Running run (`createRunningProcessInstanceDetail()`, file 104 Staging): BackupFile in progress. */
export function createRunningExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:12:30', 'ReceiveFile', 'Started'),
    entry(
      '2026-09-30 18:12:32',
      'ReceiveFile',
      'Completed',
      'File received from inbox',
    ),
    entry('2026-09-30 18:12:33', 'BackupFile', 'Started'),
  ];
}

/**
 * Log for the Finished RateLoad run (`createLoadYieldCurvesProcessInstanceDetail()`,
 * file 101's WorkflowInstanceId): Register -> Validate -> Transform -> Import -> Complete.
 */
export function createLoadYieldCurvesExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:02:20', 'Start', 'Started'),
    entry('2026-09-30 18:02:20', 'Start', 'Completed'),
    entry('2026-09-30 18:02:21', 'Register', 'Started'),
    entry('2026-09-30 18:02:22', 'Register', 'Completed'),
    entry('2026-09-30 18:02:22', 'Validate', 'Started'),
    entry('2026-09-30 18:02:24', 'Validate', 'Completed'),
    entry('2026-09-30 18:02:24', 'ValidationSuccessful?', 'Started'),
    entry('2026-09-30 18:02:24', 'ValidationSuccessful?', 'Completed'),
    entry('2026-09-30 18:02:25', 'Transform', 'Started'),
    entry('2026-09-30 18:02:27', 'Transform', 'Completed'),
    entry('2026-09-30 18:02:27', 'Import', 'Started'),
    entry('2026-09-30 18:02:30', 'Import', 'Completed', 'Loaded 26 rates'),
    entry('2026-09-30 18:02:30', 'Complete', 'Started'),
    entry('2026-09-30 18:02:31', 'Complete', 'Completed'),
  ];
}

/**
 * Log for the RateLoad run that ended on its Error step
 * (`createRateLoadErrorProcessInstanceDetail()`, file 106's WorkflowInstanceId):
 * Register and Validate ran, the validation decision went to `Error`. Like the
 * live service, entries carry no message (and the file has no ExceptionNote).
 */
export function createRateLoadErrorExecutionLogs(): ExecutionLogRead[] {
  return [
    entry('2026-09-30 18:07:25', 'Start', 'Started'),
    entry('2026-09-30 18:07:25', 'Start', 'Completed'),
    entry('2026-09-30 18:07:26', 'Register', 'Started'),
    entry('2026-09-30 18:07:26', 'Register', 'Completed'),
    entry('2026-09-30 18:07:26', 'Validate', 'Started'),
    entry('2026-09-30 18:07:27', 'Validate', 'Completed'),
    entry('2026-09-30 18:07:28', 'ValidationSuccessful?', 'Started'),
    entry('2026-09-30 18:07:28', 'ValidationSuccessful?', 'Completed'),
    entry('2026-09-30 18:07:28', 'Error', 'Started'),
    entry('2026-09-30 18:07:28', 'Error', 'Completed'),
  ];
}

// ---------------------------------------------------------------------------
// Live-shaped PAIRED logs (verified by curl, 2026-10-05): the service writes an
// "Executing" row and then an "Executed" row for every activity, oldest first.
// An activity still running has an "Executing" row and no "Executed" row yet.
// ---------------------------------------------------------------------------

/** An "Executing" + "Executed" pair for one activity. */
function pair(
  executingAt: string,
  executedAt: string,
  ActivityName: string,
): ExecutionLogRead[] {
  return [
    entry(executingAt, ActivityName, 'Executing'),
    entry(executedAt, ActivityName, 'Executed'),
  ];
}

/**
 * Paired log for the live-shaped Finished ImportFile run
 * (`createFinishedImportFileWithHoldStepsDetail()`): Start, LogNewImport,
 * LogImportDetails, ValidateDuplicate, ValidateFormat, ImportData, End — each an
 * Executing + Executed pair. 14 rows.
 */
export function createPairedImportFileExecutionLogs(): ExecutionLogRead[] {
  return [
    ...pair('2026-10-01 09:15:02', '2026-10-01 09:15:02', 'Start'),
    ...pair('2026-10-01 09:15:02', '2026-10-01 09:15:03', 'LogNewImport'),
    ...pair('2026-10-01 09:15:03', '2026-10-01 09:15:04', 'LogImportDetails'),
    ...pair('2026-10-01 09:15:04', '2026-10-01 09:15:05', 'ValidateDuplicate'),
    ...pair('2026-10-01 09:15:05', '2026-10-01 09:15:06', 'ValidateFormat'),
    ...pair('2026-10-01 09:15:06', '2026-10-01 09:15:09', 'ImportData'),
    ...pair('2026-10-01 09:15:09', '2026-10-01 09:15:09', 'End'),
  ];
}

/**
 * Paired log for the RateLoad Error runs (`createRateLoadErrorProcessInstanceDetail()`,
 * same shape for `createOlderRateLoadErrorProcessInstanceDetail()`): Start,
 * Register, Validate, ValidationSuccessful?, Error — each an Executing + Executed
 * pair, no messages (as live). 10 rows.
 */
export function createPairedRateLoadErrorExecutionLogs(): ExecutionLogRead[] {
  return [
    ...pair('2026-09-30 18:07:25', '2026-09-30 18:07:25', 'Start'),
    ...pair('2026-09-30 18:07:25', '2026-09-30 18:07:26', 'Register'),
    ...pair('2026-09-30 18:07:26', '2026-09-30 18:07:27', 'Validate'),
    ...pair(
      '2026-09-30 18:07:27',
      '2026-09-30 18:07:28',
      'ValidationSuccessful?',
    ),
    ...pair('2026-09-30 18:07:28', '2026-09-30 18:07:28', 'Error'),
  ];
}

/**
 * Paired log for the ImportFile run stopped on a Hold step
 * (`createHoldStoppedImportFileProcessInstanceDetail()`): Start, LogNewImport,
 * LogImportDetails, ValidateDuplicate as pairs, then a TRAILING
 * `HoldValidateDuplidate` "Executing" row with NO "Executed" row (still running).
 * 9 rows.
 */
export function createPairedRunningExecutionLogs(): ExecutionLogRead[] {
  return [
    ...pair('2026-10-01 09:40:11', '2026-10-01 09:40:11', 'Start'),
    ...pair('2026-10-01 09:40:11', '2026-10-01 09:40:12', 'LogNewImport'),
    ...pair('2026-10-01 09:40:12', '2026-10-01 09:40:13', 'LogImportDetails'),
    ...pair('2026-10-01 09:40:13', '2026-10-01 09:40:15', 'ValidateDuplicate'),
    entry('2026-10-01 09:40:15', 'HoldValidateDuplidate', 'Executing'),
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
