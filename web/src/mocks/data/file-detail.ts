/**
 * Project-wide mock factory for the FileDetail entity (`FileDetailRead`).
 *
 * Composes the File factory (`./file`) so row and detail never drift. Adds the
 * workflow, location, hash, exception-note and audit fields.
 *
 * - `WorkflowInstanceId` is only set for Imported files. It points to a separate
 *   `LoadYieldCurves` run (file 101 -> `6645057045ca4ce59a9827c6f5138246`,
 *   file 98 -> `2a3b4c5d6e7f40819a0b1c2d3e4f5a6b`) whose id matches no import.
 *   The file's own `ImportFile` run has `ProcessInstanceId === Woid`.
 *
 * - Failed detail carries `ExceptionNote`; Imported / Processing never do (BR5).
 * - `Sha256` is absent where the service has no content key yet (Processing,
 *   and the explicit `createFileDetailWithoutHash` variant).
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { FileDetailRead, FileRead } from '../../types/api-generated';
import {
  createFailedFile,
  createFile,
  createProcessingFile,
  createSupersededFile,
} from './file';

const INBOX_LOCATION =
  'C:/DigiataFiles/DigiataApps/ImportPro/Inbox/BankOfEngland/';

function detailFrom(
  file: FileRead,
  extra: Partial<FileDetailRead>,
): FileDetailRead {
  return {
    ...file,
    WorkflowInstanceId: '6645057045ca4ce59a9827c6f5138246',
    InboxLocation: INBOX_LOCATION,
    BackupFileName: `${file.Woid}_${file.FileName}`,
    Sha256: 'd141ba24a0612efa459ec3e824d0d57eecc422cff2f722e312bb7995a4841906',
    CreatedBy: 'John Doe',
    ...extra,
  };
}

/** Canonical Imported, current file detail (matches the OpenAPI example). No exception note. */
export function createFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createFile(), overrides);
}

/** Imported but not the current version. */
export function createSupersededFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createSupersededFile(), {
    WorkflowInstanceId: '2a3b4c5d6e7f40819a0b1c2d3e4f5a6b',
    Sha256: 'a3f5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a3c5e7b9d1f3a5',
    ...overrides,
  });
}

/**
 * Failed import detail: carries the exception note. No `WorkflowInstanceId` (the
 * service only sets it for Imported files); its ImportFile run lives at its Woid.
 */
export function createFailedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = detailFrom(createFailedFile(), {
    Sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    ExceptionNote: 'Row 12: invalid rate',
  });
  delete detail.WorkflowInstanceId;
  return { ...detail, ...overrides };
}

/**
 * Processing import detail: no content hash yet, no exception note, no
 * `WorkflowInstanceId` (not Imported); its ImportFile run lives at its Woid.
 */
export function createProcessingFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = detailFrom(createProcessingFile(), {});
  delete detail.Sha256;
  delete detail.WorkflowInstanceId;
  return { ...detail, ...overrides };
}

/** Imported detail whose content hash is absent (service returned no FileContentKey). */
export function createFileDetailWithoutHash(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = createFileDetail();
  delete detail.Sha256;
  return { ...detail, ...overrides };
}
