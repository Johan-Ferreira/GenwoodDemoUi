/**
 * Project-wide mock factory for the Import trace (`ImportRead`) returned by
 * `GET /v1/imports/{Woid}`: the file detail, its workflow instance, and published
 * data counts.
 *
 * Composes `./file-detail` and `./process-instance-detail` so each variant's file
 * status, WOID and workflow state stay consistent.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { ImportRead } from '../../types/api-generated';
import {
  createFailedFileDetail,
  createFileDetail,
  createProcessingFileDetail,
} from './file-detail';
import {
  createFaultedProcessInstanceDetail,
  createProcessInstanceDetail,
  createRunningProcessInstanceDetail,
} from './process-instance-detail';

/** Canonical successful import: Imported file, Finished workflow, data published. */
export function createImport(overrides: Partial<ImportRead> = {}): ImportRead {
  return {
    File: createFileDetail(),
    ProcessInstance: createProcessInstanceDetail(),
    RatesCount: 26,
    CurvesCount: 1,
    ...overrides,
  };
}

/** Failed import: exception note on the file, Faulted workflow, nothing published. */
export function createFailedImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return createImport({
    File: createFailedFileDetail(),
    ProcessInstance: createFaultedProcessInstanceDetail(),
    RatesCount: 0,
    CurvesCount: 0,
    ...overrides,
  });
}

/** In-flight import: Processing file, Running workflow, nothing published yet. */
export function createProcessingImport(
  overrides: Partial<ImportRead> = {},
): ImportRead {
  return createImport({
    File: createProcessingFileDetail(),
    ProcessInstance: createRunningProcessInstanceDetail(),
    RatesCount: 0,
    CurvesCount: 0,
    ...overrides,
  });
}
