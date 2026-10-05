/**
 * Project-wide mock factory for the ProcessInstanceDetail entity
 * (`ProcessInstanceDetailRead`) — a workflow execution with its steps.
 *
 * Variants mirror the file statuses: Finished (Imported), Faulted (Failed),
 * Running (Processing). `ContextId` is the WOID linking it to a file.
 * Cancelled / Suspended / Idle cover the remaining `CurrentStatus` values; their
 * WOIDs match no file in `./file`, so they also back the "Import not found" path.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { ProcessInstanceDetailRead } from '../../types/api-generated';

/** Canonical finished instance (matches the OpenAPI example). */
export function createProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return {
    ProcessInstanceId: '6645057045ca4ce59a9827c6f5138246',
    ProcessName: 'ImportCurveFile',
    ContextId: '0d41a44498814111bcce69d60f7a823a',
    CurrentStatus: 'Finished',
    CreatedAt: '2026-09-30 18:02:11',
    LastExecutedAt: '2026-09-30 18:02:19',
    FinishedAt: '2026-09-30 18:02:19',
    LastExecutedActivityName: 'PublishCurves',
    Steps: [
      { Name: 'ReceiveFile', State: 'Completed' },
      { Name: 'BackupFile', State: 'Completed' },
      { Name: 'ParseRates', State: 'Completed' },
      { Name: 'PublishCurves', State: 'Completed' },
    ],
    ...overrides,
  };
}

/** Faulted instance (backs a Failed file). */
export function createFaultedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'b7c8d9e0f1a24b3c8d9e0f1a2b3c4d5e',
    ContextId: '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    CurrentStatus: 'Faulted',
    CreatedAt: '2026-09-30 18:05:40',
    LastExecutedAt: '2026-09-30 18:05:44',
    FaultedAt: '2026-09-30 18:05:44',
    LastExecutedActivityName: 'ParseRates',
    Steps: [
      { Name: 'ReceiveFile', State: 'Completed' },
      { Name: 'BackupFile', State: 'Completed' },
      { Name: 'ParseRates', State: 'Faulted' },
      { Name: 'PublishCurves', State: 'Pending' },
    ],
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Running instance (backs a Processing file). */
export function createRunningProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'c1d2e3f4a5b64c7d8e9f0a1b2c3d4e5f',
    ContextId: '9a8b7c6d5e4f40312a1b2c3d4e5f6a7b',
    CurrentStatus: 'Running',
    CreatedAt: '2026-09-30 18:09:02',
    LastExecutedAt: '2026-09-30 18:09:05',
    LastExecutedActivityName: 'BackupFile',
    Steps: [
      { Name: 'ReceiveFile', State: 'Completed' },
      { Name: 'BackupFile', State: 'Running' },
      { Name: 'ParseRates', State: 'Pending' },
      { Name: 'PublishCurves', State: 'Pending' },
    ],
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/**
 * Cancelled instance: carries `CancelledAt`, no `FinishedAt` / `FaultedAt`.
 * Steps after the cancellation point stay Pending (BR-12).
 */
export function createCancelledProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'd4e5f6a7b8c94d0e1f2a3b4c5d6e7f80',
    ContextId: '4d5e6f708192a3b4c5d6e7f8091a2b3c',
    CurrentStatus: 'Cancelled',
    CreatedAt: '2026-09-29 09:14:03',
    LastExecutedAt: '2026-09-29 09:14:06',
    CancelledAt: '2026-09-29 09:14:07',
    LastExecutedActivityName: 'BackupFile',
    Steps: [
      { Name: 'ReceiveFile', State: 'Completed' },
      { Name: 'BackupFile', State: 'Completed' },
      { Name: 'ParseRates', State: 'Pending' },
      { Name: 'PublishCurves', State: 'Pending' },
    ],
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Suspended instance: paused mid-run, no terminal timestamp. */
export function createSuspendedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'e5f6a7b8c9d04e1f2a3b4c5d6e7f8091',
    ContextId: '6a7b8c9d0e1f42a3b4c5d6e7f8091a2b',
    CurrentStatus: 'Suspended',
    CreatedAt: '2026-09-28 14:30:12',
    LastExecutedAt: '2026-09-28 14:30:18',
    LastExecutedActivityName: 'ParseRates',
    Steps: [
      { Name: 'ReceiveFile', State: 'Completed' },
      { Name: 'BackupFile', State: 'Completed' },
      { Name: 'ParseRates', State: 'Completed' },
      { Name: 'PublishCurves', State: 'Pending' },
    ],
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Idle instance: created but never executed — every step Pending, no last activity. */
export function createIdleProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'f6a7b8c9d0e14f2a3b4c5d6e7f8091a2',
    ContextId: '8c9d0e1f2a3b44c5d6e7f8091a2b3c4d',
    CurrentStatus: 'Idle',
    CreatedAt: '2026-09-27 08:00:00',
    Steps: [
      { Name: 'ReceiveFile', State: 'Pending' },
      { Name: 'BackupFile', State: 'Pending' },
      { Name: 'ParseRates', State: 'Pending' },
      { Name: 'PublishCurves', State: 'Pending' },
    ],
  });
  delete instance.FinishedAt;
  delete instance.LastExecutedAt;
  delete instance.LastExecutedActivityName;
  return { ...instance, ...overrides };
}
