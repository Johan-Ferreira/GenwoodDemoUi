/**
 * Project-wide mock factory for the ProcessInstanceDetail entity
 * (`ProcessInstanceDetailRead`) — a workflow execution with its steps.
 *
 * Variants mirror the file statuses: Finished (Imported), Faulted (Failed),
 * Running (Processing). `ContextId` is the WOID linking it to a file.
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
