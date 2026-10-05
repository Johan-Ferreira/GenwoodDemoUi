/**
 * Project-wide mock factory for the ProcessInstanceDetail entity
 * (`ProcessInstanceDetailRead`) — a workflow execution with its steps.
 *
 * Contract (verified against the live service):
 * - The service returns NO `ContextId` on process instances (list or detail), so
 *   these factories omit it.
 * - Two process names exist: `ImportFile` and `LoadYieldCurves`.
 * - An `ImportFile` run's `ProcessInstanceId` EQUALS its file's `Woid`, so
 *   `GET /v1/imports/{ProcessInstanceId}` resolves for ImportFile runs.
 * - An Imported file's `WorkflowInstanceId` points to a separate `LoadYieldCurves`
 *   run whose `ProcessInstanceId` matches NO import (imports lookup -> 404
 *   "Import not found"). Failed / Processing files have no `WorkflowInstanceId`
 *   but still have an ImportFile run at their Woid.
 *
 * ImportFile variants (one per seeded file in `./file`):
 * - Finished  `0d41a44498814111bcce69d60f7a823a` = file 101 (Imported, current)
 * - Faulted   `3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f` = file 102 (Failed)
 * - Running   `9a8b7c6d5e4f40312a1b2c3d4e5f6a7b` = file 103 (Processing)
 *
 * LoadYieldCurves variants (no matching import):
 * - Finished  `6645057045ca4ce59a9827c6f5138246` = file 101's WorkflowInstanceId
 * - Cancelled / Suspended / Idle cover the remaining `CurrentStatus` values.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { ProcessInstanceDetailRead } from '../../types/api-generated';

/** The two process names the service runs. */
export const IMPORT_FILE = 'ImportFile';
export const LOAD_YIELD_CURVES = 'LoadYieldCurves';

const IMPORT_FILE_STEPS = [
  'ReceiveFile',
  'BackupFile',
  'ParseRates',
  'PublishCurves',
] as const;

const LOAD_YIELD_CURVES_STEPS = [
  'LoadRates',
  'BuildCurves',
  'StoreCurves',
] as const;

function steps(
  names: readonly string[],
  states: string[],
): ProcessInstanceDetailRead['Steps'] {
  return names.map((Name, i) => ({ Name, State: states[i] ?? 'Pending' }));
}

/**
 * Canonical Finished ImportFile run — the run behind file 101 (its
 * `ProcessInstanceId` is file 101's Woid).
 */
export function createProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return {
    ProcessInstanceId: '0d41a44498814111bcce69d60f7a823a',
    ProcessName: IMPORT_FILE,
    CurrentStatus: 'Finished',
    CreatedAt: '2026-09-30 18:02:11',
    LastExecutedAt: '2026-09-30 18:02:19',
    FinishedAt: '2026-09-30 18:02:19',
    LastExecutedActivityName: 'PublishCurves',
    Steps: steps(IMPORT_FILE_STEPS, [
      'Completed',
      'Completed',
      'Completed',
      'Completed',
    ]),
    ...overrides,
  };
}

/** Faulted ImportFile run — behind the Failed file 102 (ParseRates faults). */
export function createFaultedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    CurrentStatus: 'Faulted',
    CreatedAt: '2026-09-30 18:05:40',
    LastExecutedAt: '2026-09-30 18:05:44',
    FaultedAt: '2026-09-30 18:05:44',
    LastExecutedActivityName: 'ParseRates',
    Steps: steps(IMPORT_FILE_STEPS, ['Completed', 'Completed', 'Faulted']),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Running ImportFile run — behind the Processing file 103 (BackupFile in progress). */
export function createRunningProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: '9a8b7c6d5e4f40312a1b2c3d4e5f6a7b',
    CurrentStatus: 'Running',
    CreatedAt: '2026-09-30 18:09:02',
    LastExecutedAt: '2026-09-30 18:09:05',
    LastExecutedActivityName: 'BackupFile',
    Steps: steps(IMPORT_FILE_STEPS, ['Completed', 'Running']),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/**
 * Finished LoadYieldCurves run — the run file 101's `WorkflowInstanceId` points
 * to. Its `ProcessInstanceId` matches no import (imports lookup -> 404).
 */
export function createLoadYieldCurvesProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return {
    ProcessInstanceId: '6645057045ca4ce59a9827c6f5138246',
    ProcessName: LOAD_YIELD_CURVES,
    CurrentStatus: 'Finished',
    CreatedAt: '2026-09-30 18:02:20',
    LastExecutedAt: '2026-09-30 18:02:31',
    FinishedAt: '2026-09-30 18:02:31',
    LastExecutedActivityName: 'StoreCurves',
    Steps: steps(LOAD_YIELD_CURVES_STEPS, [
      'Completed',
      'Completed',
      'Completed',
    ]),
    ...overrides,
  };
}

/**
 * Cancelled LoadYieldCurves run: carries `CancelledAt`, no `FinishedAt` /
 * `FaultedAt`. Steps after the cancellation point stay Pending (BR-12).
 */
export function createCancelledProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'd4e5f6a7b8c94d0e1f2a3b4c5d6e7f80',
    CurrentStatus: 'Cancelled',
    CreatedAt: '2026-09-29 09:14:03',
    LastExecutedAt: '2026-09-29 09:14:06',
    CancelledAt: '2026-09-29 09:14:07',
    LastExecutedActivityName: 'LoadRates',
    Steps: steps(LOAD_YIELD_CURVES_STEPS, ['Completed']),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Suspended LoadYieldCurves run: paused mid-run, no terminal timestamp. */
export function createSuspendedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'e5f6a7b8c9d04e1f2a3b4c5d6e7f8091',
    CurrentStatus: 'Suspended',
    CreatedAt: '2026-09-28 14:30:12',
    LastExecutedAt: '2026-09-28 14:30:18',
    LastExecutedActivityName: 'BuildCurves',
    Steps: steps(LOAD_YIELD_CURVES_STEPS, ['Completed', 'Completed']),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Idle LoadYieldCurves run: created but never executed — every step Pending, no last activity. */
export function createIdleProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'f6a7b8c9d0e14f2a3b4c5d6e7f8091a2',
    CurrentStatus: 'Idle',
    CreatedAt: '2026-09-27 08:00:00',
    Steps: steps(LOAD_YIELD_CURVES_STEPS, []),
  });
  delete instance.FinishedAt;
  delete instance.LastExecutedAt;
  delete instance.LastExecutedActivityName;
  return { ...instance, ...overrides };
}
