/**
 * Project-wide mock factory for the FileDetail entity (`FileDetailRead`).
 *
 * Composes the File factory (`./file`) so row and detail never drift (including
 * `Status`, `Stage`, `FailedStep`). Adds the workflow, location, hash,
 * exception-note and audit fields.
 *
 * `Woid` is always the file's ImportPro (`ImportFile`) run id.
 * `WorkflowInstanceId` is the file's RateLoad (`LoadYieldCurves`) run id, and is
 * only set once RateLoad has picked the file up (verified live 2026-10-05):
 *
 * | file | status                 | WorkflowInstanceId (LoadYieldCurves run)       |
 * |------|------------------------|------------------------------------------------|
 * | 101  | Imported               | `6645057045ca4ce59a9827c6f5138246` (Complete)  |
 * | 98   | Imported (superseded)  | `2a3b4c5d6e7f40819a0b1c2d3e4f5a6b` (Complete)  |
 * | 103  | Importing              | `e5f6a7b8c9d04e1f2a3b4c5d6e7f8091` (Suspended) |
 * | 106  | Failed (RateLoad)      | `b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e` (Error)     |
 * | 104  | Staging                | none                                           |
 * | 105  | Staged                 | none                                           |
 * | 102  | Failed (ImportPro)     | none                                           |
 *
 * - Only ImportPro failures carry `ExceptionNote`; RateLoad failures do NOT
 *   (their cause is in the RateLoad run's execution log).
 * - `Sha256` is absent where the service has no content key yet (Staging, and the
 *   explicit `createFileDetailWithoutHash` variant).
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { FileDetailRead, FileRead } from '../../types/api-generated';
import {
  createFailedFile,
  createFile,
  createImportingFile,
  createRateLoadFailedFile,
  createStagedFile,
  createStagingFile,
  createSupersededFile,
} from './file';

const INBOX_LOCATION =
  'C:/DigiataFiles/DigiataApps/ImportPro/Inbox/BankOfEngland/';

/** Build a detail with NO `WorkflowInstanceId` unless `extra` supplies one. */
function detailFrom(
  file: FileRead,
  extra: Partial<FileDetailRead>,
): FileDetailRead {
  return {
    ...file,
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
  return detailFrom(createFile(), {
    WorkflowInstanceId: '6645057045ca4ce59a9827c6f5138246',
    ...overrides,
  });
}

/** Imported file detail — same as the canonical `createFileDetail()`. */
export function createImportedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return createFileDetail(overrides);
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

/** Staging detail: no content hash yet, no `WorkflowInstanceId`, no exception note. */
export function createStagingFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = detailFrom(createStagingFile(), {});
  delete detail.Sha256;
  return { ...detail, ...overrides };
}

/** Staged detail: hashed, but RateLoad has not started — no `WorkflowInstanceId`. */
export function createStagedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createStagedFile(), {
    Sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    ...overrides,
  });
}

/** Importing detail: `WorkflowInstanceId` is the Suspended RateLoad run. */
export function createImportingFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createImportingFile(), {
    WorkflowInstanceId: 'e5f6a7b8c9d04e1f2a3b4c5d6e7f8091',
    Sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    ...overrides,
  });
}

/**
 * ImportPro (staging) failure detail: carries the exception note and
 * `FailedStep`; no `WorkflowInstanceId` (RateLoad never ran).
 */
export function createFailedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createFailedFile(), {
    Sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    ExceptionNote: 'Row 12: invalid rate',
    ...overrides,
  });
}

/** Alias of `createFailedFileDetail()` — the ImportPro (staging) failure. */
export const createStagingFailedFileDetail = createFailedFileDetail;

/**
 * RateLoad failure detail: `FailedStep` 'Validate', `WorkflowInstanceId` is the
 * RateLoad run that ended on Error, and NO `ExceptionNote`.
 */
export function createRateLoadFailedFileDetail(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  return detailFrom(createRateLoadFailedFile(), {
    WorkflowInstanceId: 'b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e',
    Sha256: '0803f814f1f2443205c689f66afb53691ba6a21a0a56e2c61b46076b672a3726',
    CreatedBy: 'System',
    ...overrides,
  });
}

/** Imported detail whose content hash is absent (service returned no FileContentKey). */
export function createFileDetailWithoutHash(
  overrides: Partial<FileDetailRead> = {},
): FileDetailRead {
  const detail = createFileDetail();
  delete detail.Sha256;
  return { ...detail, ...overrides };
}
