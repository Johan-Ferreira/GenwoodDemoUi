/**
 * Project-wide mock factory for the ProcessInstanceDetail entity
 * (`ProcessInstanceDetailRead`) — a workflow execution with its steps.
 *
 * Contract (verified against the live service, 2026-10-05):
 * - The service returns NO `ContextId` on process instances (list or detail), so
 *   these factories omit it.
 * - Two process names exist: `ImportFile` (the ImportPro staging run) and
 *   `LoadYieldCurves` (the GenwoodDemo RateLoad run).
 * - An `ImportFile` run's `ProcessInstanceId` EQUALS its file's `Woid`, so
 *   `GET /v1/imports/{ProcessInstanceId}` resolves for ImportFile runs.
 * - A file's `WorkflowInstanceId` (set once RateLoad has picked the file up:
 *   Importing, Imported, RateLoad-failed) is its `LoadYieldCurves` run id.
 * - RateLoad (`LoadYieldCurves`) steps are Register, Validate, Transform, Import,
 *   Complete — but the service SENDS them out of order (Register, Validate,
 *   Complete, Import, Transform). `RATE_LOAD_STEPS` is the display order;
 *   `RATE_LOAD_SERVICE_STEP_ORDER` is the order these factories emit.
 *   ImportFile steps are emitted in their natural order.
 * - A RateLoad run that failed is `Finished` with `LastExecutedActivityName`
 *   `'Error'`; the steps after the failure stay `Pending`. A normal one ends
 *   `'Complete'` (the live service reports `'End'` — neither is `'Error'`).
 * - A RateLoad run still importing is `Suspended` at `'Complete'` (Complete step
 *   Running), as the live service shows.
 *
 * ImportFile runs (id = file Woid, see `./file`):
 * - Finished  `0d41a44498814111bcce69d60f7a823a` = file 101 (Imported, current)
 * - Faulted   `3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f` = file 102 (Failed, ImportPro)
 * - Finished  `9a8b7c6d5e4f40312a1b2c3d4e5f6a7b` = file 103 (Importing)
 * - Running   `b4c5d6e7f8a94b0c9d1e2f3a4b5c6d7e` = file 104 (Staging)
 * - Finished  `c5d6e7f8a9b04c1d8e2f3a4b5c6d7e8f` = file 105 (Staged)
 * - Finished  `a7b8c9d0e1f24a3b8c4d5e6f7a8b9c0d` = file 106 (Failed, RateLoad)
 *
 * LoadYieldCurves runs (id = file WorkflowInstanceId, see `./file-detail`):
 * - Finished/Complete `6645057045ca4ce59a9827c6f5138246` = file 101
 * - Finished/Complete `2a3b4c5d6e7f40819a0b1c2d3e4f5a6b` = file 98
 * - Suspended         `e5f6a7b8c9d04e1f2a3b4c5d6e7f8091` = file 103 (Importing)
 * - Finished/Error    `b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e` = file 106 (failed at Validate)
 * - Finished/Error    `3e4f5a6b7c8d4e9fa0b1c2d3e4f5a6b7` = older failed run (no file)
 * - Cancelled / Idle cover the remaining `CurrentStatus` values (no file).
 *
 * Live-shaped ImportFile variants (steps = `IMPORT_FILE_LIVE_STEPS`, incl. the
 * Hold… / Clear… branch; not in the list collection, no file):
 * - Finished at 'End'          `d1e2f3a4b5c64d7e8f9a0b1c2d3e4f5a`
 * - Suspended on a Hold step   `e2f3a4b5c6d74e8f9a0b1c2d3e4f5a6b` (HoldValidateDuplidate Running)
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

/** RateLoad steps in their real (display) order. */
export const RATE_LOAD_STEPS = [
  'Register',
  'Validate',
  'Transform',
  'Import',
  'Complete',
] as const;
export type RateLoadStep = (typeof RATE_LOAD_STEPS)[number];

/** The order the live service sends RateLoad steps in (NOT the display order). */
export const RATE_LOAD_SERVICE_STEP_ORDER = [
  'Register',
  'Validate',
  'Complete',
  'Import',
  'Transform',
] as const;

function steps(
  names: readonly string[],
  states: string[],
): ProcessInstanceDetailRead['Steps'] {
  return names.map((Name, i) => ({ Name, State: states[i] ?? 'Pending' }));
}

/**
 * RateLoad steps in the service's out-of-order sequence. `states` is keyed by
 * step name; any step not listed is `Pending`.
 */
function rateLoadSteps(
  states: Partial<Record<RateLoadStep, string>>,
): ProcessInstanceDetailRead['Steps'] {
  return RATE_LOAD_SERVICE_STEP_ORDER.map((Name) => ({
    Name,
    State: states[Name] ?? 'Pending',
  }));
}

const ALL_RATE_LOAD_COMPLETED: Partial<Record<RateLoadStep, string>> = {
  Register: 'Completed',
  Validate: 'Completed',
  Transform: 'Completed',
  Import: 'Completed',
  Complete: 'Completed',
};

// ---------------------------------------------------------------------------
// ImportFile (ImportPro staging) runs
// ---------------------------------------------------------------------------

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

/** Faulted ImportFile run — behind the ImportPro-failed file 102 (ParseRates faults). */
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

/** Running ImportFile run — behind the Staging file 104 (BackupFile in progress). */
export function createRunningProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createProcessInstanceDetail({
    ProcessInstanceId: 'b4c5d6e7f8a94b0c9d1e2f3a4b5c6d7e',
    CurrentStatus: 'Running',
    CreatedAt: '2026-09-30 18:12:30',
    LastExecutedAt: '2026-09-30 18:12:33',
    LastExecutedActivityName: 'BackupFile',
    Steps: steps(IMPORT_FILE_STEPS, ['Completed', 'Running']),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Finished ImportFile run behind the Staged file 105 (RateLoad not started yet). */
export function createStagedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return createProcessInstanceDetail({
    ProcessInstanceId: 'c5d6e7f8a9b04c1d8e2f3a4b5c6d7e8f',
    CreatedAt: '2026-09-30 18:11:00',
    LastExecutedAt: '2026-09-30 18:11:07',
    FinishedAt: '2026-09-30 18:11:07',
    ...overrides,
  });
}

/** Finished ImportFile run behind the Importing file 103. */
export function createImportingStagingProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return createProcessInstanceDetail({
    ProcessInstanceId: '9a8b7c6d5e4f40312a1b2c3d4e5f6a7b',
    CreatedAt: '2026-09-30 18:09:02',
    LastExecutedAt: '2026-09-30 18:09:09',
    FinishedAt: '2026-09-30 18:09:09',
    ...overrides,
  });
}

/**
 * ImportFile steps exactly as the live service sends them (verified by curl,
 * 2026-10-05), in service order. The `Hold…` / `Clear…` steps are the
 * alternative hold / clean-up branch: they stay `Pending` on a normal run, and
 * one of them runs only when the process stops on it. (`HoldValidateDuplidate`
 * is the service's own spelling.)
 */
export const IMPORT_FILE_LIVE_STEPS = [
  'LogNewImport',
  'LogImportDetails',
  'ValidateDuplicate',
  'ValidateFormat',
  'ImportData',
  'HoldImportData',
  'HoldValidateFormat',
  'HoldValidateDuplidate',
  'HoldImportDetailsLog',
  'ClearNewImportLog',
  'HoldLogNewImport',
] as const;
export type ImportFileLiveStep = (typeof IMPORT_FILE_LIVE_STEPS)[number];

/** Live-shaped ImportFile steps; any step not listed in `states` is `Pending`. */
function importFileLiveSteps(
  states: Partial<Record<ImportFileLiveStep, string>>,
): ProcessInstanceDetailRead['Steps'] {
  return IMPORT_FILE_LIVE_STEPS.map((Name) => ({
    Name,
    State: states[Name] ?? 'Pending',
  }));
}

/**
 * Finished ImportFile run shaped like the live service: LogNewImport through
 * ImportData Completed, every `Hold…` / `Clear…` step Pending, last activity
 * `'End'`. (A variant — the canonical `createProcessInstanceDetail()` keeps its
 * older step names so existing tests stay valid.) Not in the list collection.
 */
export function createFinishedImportFileWithHoldStepsDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return {
    ProcessInstanceId: 'd1e2f3a4b5c64d7e8f9a0b1c2d3e4f5a',
    ProcessName: IMPORT_FILE,
    CurrentStatus: 'Finished',
    CreatedAt: '2026-10-01 09:15:02',
    LastExecutedAt: '2026-10-01 09:15:09',
    FinishedAt: '2026-10-01 09:15:09',
    LastExecutedActivityName: 'End',
    Steps: importFileLiveSteps({
      LogNewImport: 'Completed',
      LogImportDetails: 'Completed',
      ValidateDuplicate: 'Completed',
      ValidateFormat: 'Completed',
      ImportData: 'Completed',
    }),
    ...overrides,
  };
}

/**
 * ImportFile run that STOPPED on a Hold step (duplicate detected): `Suspended`
 * at `HoldValidateDuplidate` (Running). LogNewImport, LogImportDetails and
 * ValidateDuplicate Completed; ValidateFormat and ImportData never ran (Pending,
 * non-Hold — so they still show as Pending cards); every other `Hold…` /
 * `Clear…` step Pending. No terminal timestamp. Not in the list collection.
 */
export function createHoldStoppedImportFileProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createFinishedImportFileWithHoldStepsDetail({
    ProcessInstanceId: 'e2f3a4b5c6d74e8f9a0b1c2d3e4f5a6b',
    CurrentStatus: 'Suspended',
    CreatedAt: '2026-10-01 09:40:11',
    LastExecutedAt: '2026-10-01 09:40:15',
    LastExecutedActivityName: 'HoldValidateDuplidate',
    Steps: importFileLiveSteps({
      LogNewImport: 'Completed',
      LogImportDetails: 'Completed',
      ValidateDuplicate: 'Completed',
      HoldValidateDuplidate: 'Running',
    }),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Finished ImportFile run behind the RateLoad-failed file 106 (staging succeeded). */
export function createRateLoadFailedStagingProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return createProcessInstanceDetail({
    ProcessInstanceId: 'a7b8c9d0e1f24a3b8c4d5e6f7a8b9c0d',
    CreatedAt: '2026-09-30 18:07:15',
    LastExecutedAt: '2026-09-30 18:07:22',
    FinishedAt: '2026-09-30 18:07:22',
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// LoadYieldCurves (RateLoad) runs
// ---------------------------------------------------------------------------

/**
 * Finished LoadYieldCurves run that completed normally — file 101's
 * `WorkflowInstanceId`. Steps are sent in the service's out-of-order sequence.
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
    LastExecutedActivityName: 'Complete',
    Steps: rateLoadSteps(ALL_RATE_LOAD_COMPLETED),
    ...overrides,
  };
}

/**
 * RateLoad run that FAILED — file 106's `WorkflowInstanceId`. `Finished` with
 * `LastExecutedActivityName` `'Error'` (the service does not report Faulted):
 * Register and Validate completed, the rest Pending, sent out of order
 * (Register, Validate, Complete, Import, Transform) as the live service does.
 */
export function createRateLoadErrorProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e',
    CreatedAt: '2026-09-30 18:07:25',
    LastExecutedAt: '2026-09-30 18:07:28',
    FinishedAt: '2026-09-30 18:07:28',
    LastExecutedActivityName: 'Error',
    Steps: rateLoadSteps({ Register: 'Completed', Validate: 'Completed' }),
    ...overrides,
  });
}

/**
 * A second, older RateLoad run that failed the same way (Finished, last activity
 * `'Error'`, Register + Validate Completed, rest Pending in service order) —
 * belongs to no seeded file. Gives the "Finished (Error)" status filter two rows.
 */
export function createOlderRateLoadErrorProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  return createRateLoadErrorProcessInstanceDetail({
    ProcessInstanceId: '3e4f5a6b7c8d4e9fa0b1c2d3e4f5a6b7',
    CreatedAt: '2026-09-29 12:30:05',
    LastExecutedAt: '2026-09-29 12:30:09',
    FinishedAt: '2026-09-29 12:30:09',
    ...overrides,
  });
}

/**
 * Cancelled LoadYieldCurves run: carries `CancelledAt`, no `FinishedAt` /
 * `FaultedAt`. Steps after the cancellation point stay Pending (BR-12). No file.
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
    LastExecutedActivityName: 'Register',
    Steps: rateLoadSteps({ Register: 'Completed' }),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/**
 * Suspended LoadYieldCurves run — file 103's `WorkflowInstanceId` (the file is
 * Importing). Like the live service: Register..Import Completed, Complete
 * Running, last activity `'Complete'`, no terminal timestamp.
 */
export function createSuspendedProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'e5f6a7b8c9d04e1f2a3b4c5d6e7f8091',
    CurrentStatus: 'Suspended',
    CreatedAt: '2026-09-30 18:09:15',
    LastExecutedAt: '2026-09-30 18:09:21',
    LastExecutedActivityName: 'Complete',
    Steps: rateLoadSteps({
      Register: 'Completed',
      Validate: 'Completed',
      Transform: 'Completed',
      Import: 'Completed',
      Complete: 'Running',
    }),
  });
  delete instance.FinishedAt;
  return { ...instance, ...overrides };
}

/** Alias: the RateLoad run of the Importing file 103 (same as the Suspended run). */
export const createImportingRateLoadProcessInstanceDetail =
  createSuspendedProcessInstanceDetail;

/** Idle LoadYieldCurves run: created but never executed — every step Pending, no last activity. No file. */
export function createIdleProcessInstanceDetail(
  overrides: Partial<ProcessInstanceDetailRead> = {},
): ProcessInstanceDetailRead {
  const instance = createLoadYieldCurvesProcessInstanceDetail({
    ProcessInstanceId: 'f6a7b8c9d0e14f2a3b4c5d6e7f8091a2',
    CurrentStatus: 'Idle',
    CreatedAt: '2026-09-27 08:00:00',
    Steps: rateLoadSteps({}),
  });
  delete instance.FinishedAt;
  delete instance.LastExecutedAt;
  delete instance.LastExecutedActivityName;
  return { ...instance, ...overrides };
}
