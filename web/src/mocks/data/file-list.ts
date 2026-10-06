/**
 * Project-wide mock factory for the paginated FileList (`FileReadList`) returned
 * by `GET /v1/files`.
 *
 * Defaults to the mixed collection from `./file` (every status Staging / Staged /
 * Importing / Imported / Failed, both stages, every curve family, all current)
 * on page 1. `TotalItems` defaults to the number of
 * files supplied, so override it explicitly when testing multi-page results.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { FileRead, FileReadList } from '../../types/api-generated';
import { createFiles } from './file';

export function createFileList(
  overrides: Partial<FileReadList> = {},
): FileReadList {
  const files: FileRead[] = overrides.Files ?? createFiles();
  return {
    Files: files,
    TotalItems: files.length,
    Page: 1,
    Size: 50,
    ...overrides,
  };
}

/** Empty result (e.g. no files match the filters). */
export function createEmptyFileList(
  overrides: Partial<FileReadList> = {},
): FileReadList {
  return createFileList({ Files: [], TotalItems: 0, ...overrides });
}
