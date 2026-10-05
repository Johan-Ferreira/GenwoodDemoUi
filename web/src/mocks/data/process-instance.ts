/**
 * Project-wide mock factory for the ProcessInstance list row (`ProcessInstanceRead`)
 * and its paged envelope (`ProcessInstanceReadList`) returned by
 * `GET /v1/process-instances?Status=&ProcessName=&Page=&Size=`.
 *
 * Rows are derived from the detail factories (`./process-instance-detail`) by
 * dropping `Steps`, so a list row and its detail never drift. The collection
 * covers every `CurrentStatus` (Idle, Running, Suspended, Finished, Cancelled,
 * Faulted), two process names (so the name filter has something to narrow), and
 * more than 5 rows (so the smallest page size pages). It is ordered newest first
 * by `CreatedAt`, as the service returns it.
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
  createProcessInstanceDetail,
  createRunningProcessInstanceDetail,
  createSuspendedProcessInstanceDetail,
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

/** Process names present in the mixed collection (canonical first). */
export const PROCESS_NAMES = ['ImportCurveFile', 'ReprocessCurveFile'] as const;

/** Strip `Steps` from a detail to get the matching list row. */
export function toProcessInstanceRow(
  detail: ProcessInstanceDetailRead,
): ProcessInstanceRead {
  const row: ProcessInstanceDetailRead = { ...detail };
  delete row.Steps;
  return row;
}

/** Canonical Finished row (same instance as `createProcessInstanceDetail()`). */
export function createProcessInstance(
  overrides: Partial<ProcessInstanceRead> = {},
): ProcessInstanceRead {
  return {
    ...toProcessInstanceRow(createProcessInstanceDetail()),
    ...overrides,
  };
}

/**
 * Mixed collection, newest first. The first three rows are the Running / Faulted /
 * Finished instances behind the Processing / Failed / Imported files in `./file`
 * (WOIDs and `WorkflowInstanceId`s line up); the rest add history and the
 * remaining statuses.
 */
export function createProcessInstances(): ProcessInstanceRead[] {
  return [
    toProcessInstanceRow(createRunningProcessInstanceDetail()),
    toProcessInstanceRow(createFaultedProcessInstanceDetail()),
    createProcessInstance(),
    createProcessInstance({
      ProcessInstanceId: '9b0c1d2e3f4a45b6c7d8e9f0a1b2c3d4',
      ContextId: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
      CreatedAt: '2026-09-29 18:00:15',
      LastExecutedAt: '2026-09-29 18:00:22',
      FinishedAt: '2026-09-29 18:00:22',
    }),
    toProcessInstanceRow(createCancelledProcessInstanceDetail()),
    toProcessInstanceRow(
      createFaultedProcessInstanceDetail({
        ProcessInstanceId: '0a1b2c3d4e5f46a7b8c9d0e1f2a3b4c5',
        ContextId: '1f2e3d4c5b6a47980a1b2c3d4e5f6071',
        CreatedAt: '2026-09-28 18:03:33',
        LastExecutedAt: '2026-09-28 18:03:37',
        FaultedAt: '2026-09-28 18:03:37',
      }),
    ),
    toProcessInstanceRow(createSuspendedProcessInstanceDetail()),
    createProcessInstance({
      ProcessInstanceId: '2a3b4c5d6e7f40819a0b1c2d3e4f5a6b',
      ProcessName: 'ReprocessCurveFile',
      ContextId: '7b2e19c4a5f04e0d9c1f3a6b8d2e4f10',
      CreatedAt: '2026-09-28 09:41:50',
      LastExecutedAt: '2026-09-28 09:41:58',
      FinishedAt: '2026-09-28 09:41:58',
    }),
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
 * `GET /v1/process-instances?...` responses. `Status` matches exactly;
 * `ProcessName` matches case-insensitively as a substring (free-text filter).
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
  const name = query.ProcessName?.toLowerCase();
  const matching = instances.filter(
    (p) =>
      (!query.Status || p.CurrentStatus === query.Status) &&
      (!name || (p.ProcessName ?? '').toLowerCase().includes(name)),
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
