/**
 * Project-wide mock factory for the FileDetail entity (`FileDetailRead`).
 *
 * Composes the File factory (`./file`) so row and detail never drift. Adds the
 * workflow, location, hash, exception-note and audit fields.
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

/** Failed import detail: carries the exception note. */
export function createFailedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createFailedFile(), {
    WorkflowInstanceId: 'b7c8d9e0f1a24b3c8d9e0f1a2b3c4d5e',
    Sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    ExceptionNote: 'Row 12: invalid rate',
    ...overrides,
  });
}

/** Processing import detail: no content hash yet, no exception note. */
export function createProcessingFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = detailFrom(createProcessingFile(), {
    WorkflowInstanceId: 'c1d2e3f4a5b64c7d8e9f0a1b2c3d4e5f',
  });
  delete detail.Sha256;
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
