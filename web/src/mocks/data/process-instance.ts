/**
 * Project-wide mock factory for the ProcessInstance list row (`ProcessInstanceRead`)
 * and its paged envelope (`ProcessInstanceReadList`) returned by
 * `GET /v1/process-instances?Status=&ProcessName=&Page=&Size=`.
 *
 * Rows are derived from the detail factories (`./process-instance-detail`) by
 * dropping `Steps`, so a list row and its detail never drift. Like the live
 * service, rows carry NO `ContextId`.
 *
 * The collection (16 rows, newest first by `CreatedAt`) mixes both process names
 * and covers every `CurrentStatus`, plus two RateLoad runs that are Finished with
 * last activity 'Error' (`b8c9d0e1f2a3…` = file 106, `3e4f5a6b7c8d…` = no file),
 * so a "Finished (Error)" filter has data:
 * - Each `ImportFile` row's `ProcessInstanceId` is a seeded file's `Woid` in
 *   `./file` (files 104, 105, 103, 106, 102, 101, 98, 97, 95), so its import
 *   resolves.
 * - `LoadYieldCurves` rows are the `WorkflowInstanceId`s of files 103
 *   (Suspended), 106 (Finished, 'Error'), 101 and 98 (Finished, 'Complete') in
 *   `./file-detail`; the Cancelled and Idle rows belong to no file.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  ProcessInstanceDetailRead,
  ProcessInstanceRead,
  ProcessInstanceReadList,
} from '../../types/api-generated';
import {
  createCancelledProcessInstanceDetail,
  createFaultedProcessInstanceDetail,
  createIdleProcessInstanceDetail,
  createImportingStagingProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createOlderRateLoadErrorProcessInstanceDetail,
  createProcessInstanceDetail,
  createRateLoadErrorProcessInstanceDetail,
  createRateLoadFailedStagingProcessInstanceDetail,
  createRunningProcessInstanceDetail,
  createStagedProcessInstanceDetail,
  createSuspendedProcessInstanceDetail,
  IMPORT_FILE,
  LOAD_YIELD_CURVES,
} from './process-instance-detail';

/** Every `CurrentStatus` value the service can return. */
export const PROCESS_STATUSES = [
  'Idle',
  'Running',
  'Suspended',
  'Finished',
  'Cancelled',
  'Faulted',
] as const;

/** The two process names the service runs (canonical first). */
export const PROCESS_NAMES = [IMPORT_FILE, LOAD_YIELD_CURVES] as const;

/**
 * True for a run the "Finished (Error)" filter lists: `Finished` with
 * `LastExecutedActivityName` `'Error'` (the failed RateLoad runs).
 */
export function isFinishedWithError(instance: ProcessInstanceRead): boolean {
  return (
    instance.CurrentStatus === 'Finished' &&
    instance.LastExecutedActivityName === 'Error'
  );
}

/** Strip `Steps` from a detail to get the matching list row. */
export function toProcessInstanceRow(
  detail: ProcessInstanceDetailRead,
): ProcessInstanceRead {
  const row: ProcessInstanceDetailRead = { ...detail };
  delete row.Steps;
  return row;
}

/** Canonical Finished ImportFile row (same instance as `createProcessInstanceDetail()`). */
export function createProcessInstance(
  overrides: Partial<ProcessInstanceRead> = {},
): ProcessInstanceRead {
  return {
    ...toProcessInstanceRow(createProcessInstanceDetail()),
    ...overrides,
  };
}

/** Mixed collection, newest first. */
export function createProcessInstances(): ProcessInstanceRead[] {
  return [
    // ImportFile, Running — file 104 (Staging)
    toProcessInstanceRow(createRunningProcessInstanceDetail()),
    // ImportFile, Finished — file 105 (Staged; RateLoad not started)
    toProcessInstanceRow(createStagedProcessInstanceDetail()),
    // LoadYieldCurves, Suspended at Complete — file 103's WorkflowInstanceId (Importing)
    toProcessInstanceRow(createSuspendedProcessInstanceDetail()),
    // ImportFile, Finished — file 103 (Importing)
    toProcessInstanceRow(createImportingStagingProcessInstanceDetail()),
    // LoadYieldCurves, Finished on 'Error' — file 106's WorkflowInstanceId (RateLoad failed)
    toProcessInstanceRow(createRateLoadErrorProcessInstanceDetail()),
    // ImportFile, Finished — file 106 (staging succeeded, RateLoad failed)
    toProcessInstanceRow(createRateLoadFailedStagingProcessInstanceDetail()),
    // ImportFile, Faulted — file 102 (Failed in ImportPro, "Row 12: invalid rate")
    toProcessInstanceRow(createFaultedProcessInstanceDetail()),
    // LoadYieldCurves, Finished on 'Complete' — file 101's WorkflowInstanceId
    toProcessInstanceRow(createLoadYieldCurvesProcessInstanceDetail()),
    // ImportFile, Finished — file 101 (Imported, current)
    createProcessInstance(),
    // LoadYieldCurves, Finished on 'Complete' — file 98's WorkflowInstanceId
    toProcessInstanceRow(
      createLoadYieldCurvesProcessInstanceDetail({
        ProcessInstanceId: '2a3b4c5d6e7f40819a0b1c2d3e4f5a6b',
        CreatedAt: '2026-09-29 18:01:55',
        LastExecutedAt: '2026-09-29 18:02:04',
        FinishedAt: '2026-09-29 18:02:04',
      }),
    ),
    // ImportFile, Finished — file 98 (Imported, superseded)
    createProcessInstance({
      ProcessInstanceId: '7b2e19c4a5f04e0d9c1f3a6b8d2e4f10',
      CreatedAt: '2026-09-29 18:01:47',
      LastExecutedAt: '2026-09-29 18:01:54',
      FinishedAt: '2026-09-29 18:01:54',
    }),
    // ImportFile, Finished — file 97 (Imported, current)
    createProcessInstance({
      ProcessInstanceId: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
      CreatedAt: '2026-09-29 18:00:12',
      LastExecutedAt: '2026-09-29 18:00:19',
      FinishedAt: '2026-09-29 18:00:19',
    }),
    // LoadYieldCurves, Finished on 'Error' — an older failed RateLoad run (no file)
    toProcessInstanceRow(createOlderRateLoadErrorProcessInstanceDetail()),
    // LoadYieldCurves, Cancelled (no file)
    toProcessInstanceRow(createCancelledProcessInstanceDetail()),
    // ImportFile, Faulted — file 95 (Failed in ImportPro)
    toProcessInstanceRow(
      createFaultedProcessInstanceDetail({
        ProcessInstanceId: '1f2e3d4c5b6a47980a1b2c3d4e5f6071',
        CreatedAt: '2026-09-28 18:03:30',
        LastExecutedAt: '2026-09-28 18:03:34',
        FaultedAt: '2026-09-28 18:03:34',
      }),
    ),
    // LoadYieldCurves, Idle (no file)
    toProcessInstanceRow(createIdleProcessInstanceDetail()),
  ];
}

/** Response body for `GET /v1/process-instances`. `TotalItems` defaults to the rows supplied. */
export function createProcessInstanceList(
  overrides: Partial<ProcessInstanceReadList> = {},
): ProcessInstanceReadList {
  const instances = overrides.ProcessInstances ?? createProcessInstances();
  return {
    ProcessInstances: instances,
    TotalItems: instances.length,
    Page: 1,
    Size: 20,
    ...overrides,
  };
}

/** Empty result (no runs at all, or no runs match the filters). */
export function createEmptyProcessInstanceList(
  overrides: Partial<ProcessInstanceReadList> = {},
): ProcessInstanceReadList {
  return createProcessInstanceList({
    ProcessInstances: [],
    TotalItems: 0,
    ...overrides,
  });
}

/**
 * The collection filtered and paged the way the service's `Status` / `ProcessName`
 * / `Page` (1-based) / `Size` query parameters do — for mocking
 * `GET /v1/process-instances?...` responses. `Status` and `ProcessName` both
 * match exactly (`ProcessName` is one of `PROCESS_NAMES`).
 *
 * There is deliberately NO "Finished (Error)" status here: the service cannot
 * filter on the last activity. The app asks for `Status=Finished` and filters
 * (and pages) the result on the page with `isFinishedWithError`; mock that
 * option by serving `Status: 'Finished'` and letting the app narrow it.
 */
export function queryProcessInstances(
  instances: ProcessInstanceRead[],
  query: {
    Status?: string;
    ProcessName?: string;
    Page?: number;
    Size?: number;
  },
): ProcessInstanceReadList {
  const matching = instances.filter(
    (p) =>
      (!query.Status || p.CurrentStatus === query.Status) &&
      (!query.ProcessName || p.ProcessName === query.ProcessName),
  );
  const page = query.Page ?? 1;
  const size = query.Size ?? 20;
  const start = (page - 1) * size;
  return {
    ProcessInstances: matching.slice(start, start + size),
    TotalItems: matching.length,
    Page: page,
    Size: size,
  };
}
