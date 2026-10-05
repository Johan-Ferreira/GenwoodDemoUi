/**
 * Project-wide mock factory for the Import trace (`ImportRead`) returned by
 * `GET /v1/imports/{Woid}`: the file detail, its two process instances, and
 * published data counts.
 *
 * Composes `./file-detail` and `./process-instance-detail` so each variant's file
 * status, ids and workflow state stay consistent (verified live 2026-10-05):
 * - `StagingProcessInstance` — the ImportPro `ImportFile` run; always present;
 *   its id === `File.Woid`.
 * - `RateLoadProcessInstance` — the GenwoodDemo `LoadYieldCurves` run; its id ===
 *   `File.WorkflowInstanceId`. ABSENT until RateLoad picks the file up
 *   (Staging, Staged, ImportPro-failed).
 * - `ProcessInstance` (legacy) — the RateLoad run when there is one, otherwise
 *   the staging run.
 *
 * Variants:
 * | factory                        | file | Staging run (Woid)                 | RateLoad run (WorkflowInstanceId)          |
 * |--------------------------------|------|------------------------------------|--------------------------------------------|
 * | createImport (imported)        | 101  | 0d41a444... Finished               | 66450570... Finished, 'Complete'           |
 * | createImportingImport          | 103  | 9a8b7c6d... Finished               | e5f6a7b8... Suspended, 'Complete' Running  |
 * | createRateLoadFailedImport     | 106  | a7b8c9d0... Finished               | b8c9d0e1... Finished, 'Error'              |
 * | createStagingFailedImport      | 102  | 3c9d5e7f... Faulted                | none                                       |
 * | createStagedImport             | 105  | c5d6e7f8... Finished               | none                                       |
 * | createStagingImport            | 104  | b4c5d6e7... Running                | none                                       |
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  FileDetailRead,
  ImportRead,
  ProcessInstanceDetailRead,
} from '../../types/api-generated';
import {
  createFailedFileDetail,
  createFileDetail,
  createImportingFileDetail,
  createRateLoadFailedFileDetail,
  createStagedFileDetail,
  createStagingFileDetail,
} from './file-detail';
import {
  createFaultedProcessInstanceDetail,
  createImportingStagingProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createProcessInstanceDetail,
  createRateLoadErrorProcessInstanceDetail,
  createRateLoadFailedStagingProcessInstanceDetail,
  createRunningProcessInstanceDetail,
  createStagedProcessInstanceDetail,
  createSuspendedProcessInstanceDetail,
} from './process-instance-detail';

function trace(
  File: FileDetailRead,
  staging: ProcessInstanceDetailRead,
  rateLoad: ProcessInstanceDetailRead | undefined,
  counts: { RatesCount: number; CurvesCount: number },
): ImportRead {
  const result: ImportRead = {
    File,
    ProcessInstance: rateLoad ?? staging,
    StagingProcessInstance: staging,
    ...counts,
  };
  if (rateLoad) result.RateLoadProcessInstance = rateLoad;
  return result;
}

const NOTHING_PUBLISHED = { RatesCount: 0, CurvesCount: 0 };

/** Canonical successful import: Imported file, both runs Finished, data published. */
export function createImport(overrides: Partial<ImportRead> = {}): ImportRead {
  return {
    ...trace(
      createFileDetail(),
      createProcessInstanceDetail(),
      createLoadYieldCurvesProcessInstanceDetail(),
      { RatesCount: 26, CurvesCount: 1 },
    ),
    ...overrides,
  };
}

/** Importing: staging Finished, RateLoad Suspended at Complete, nothing published yet. */
export function createImportingImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return {
    ...trace(
      createImportingFileDetail(),
      createImportingStagingProcessInstanceDetail(),
      createSuspendedProcessInstanceDetail(),
      NOTHING_PUBLISHED,
    ),
    ...overrides,
  };
}

/** RateLoad failure: staging Finished, RateLoad Finished on 'Error', no exception note. */
export function createRateLoadFailedImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return {
    ...trace(
      createRateLoadFailedFileDetail(),
      createRateLoadFailedStagingProcessInstanceDetail(),
      createRateLoadErrorProcessInstanceDetail(),
      NOTHING_PUBLISHED,
    ),
    ...overrides,
  };
}

/** ImportPro (staging) failure: exception note, Faulted staging run, no RateLoad run. */
export function createStagingFailedImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return {
    ...trace(
      createFailedFileDetail(),
      createFaultedProcessInstanceDetail(),
      undefined,
      NOTHING_PUBLISHED,
    ),
    ...overrides,
  };
}

/** Alias of `createStagingFailedImport()` — kept for existing callers. */
export const createFailedImport = createStagingFailedImport;

/** Staged: staging run Finished, RateLoad not started (no RateLoad run). */
export function createStagedImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return {
    ...trace(
      createStagedFileDetail(),
      createStagedProcessInstanceDetail(),
      undefined,
      NOTHING_PUBLISHED,
    ),
    ...overrides,
  };
}

/** Staging: staging run still Running, no RateLoad run. */
export function createStagingImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return {
    ...trace(
      createStagingFileDetail(),
      createRunningProcessInstanceDetail(),
      undefined,
      NOTHING_PUBLISHED,
    ),
    ...overrides,
  };
}
