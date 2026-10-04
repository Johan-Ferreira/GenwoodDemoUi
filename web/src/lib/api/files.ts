import { getFiles } from '@/lib/api/endpoints';
import { parseNullableNumber } from '@/lib/api/nullable-number';
import type { FileListQueryParams, FileRead } from '@/types/api-generated';
import type { FileRow } from '@/types/files';

/** Filters accepted by `GET /v1/files` (paging is handled by `getAllFiles`). */
export type FileFilters = Omit<FileListQueryParams, 'Page' | 'Size'>;

/** Requested page size when loading the whole list (the service echoes what it applied). */
export const ALL_FILES_PAGE_SIZE = 500;

/** Safety stop so a misbehaving service can never loop forever. */
const MAX_PAGES = 100;

/** Normalises a service `FileRead` into a `FileRow`. */
export function toFileRow(file: FileRead): FileRow {
  return {
    id: file.Id ?? 0,
    fileName: file.FileName ?? '',
    curveFamily: file.CurveFamily ?? '',
    receivedAt: file.ReceivedAt ?? '',
    sizeBytes: parseNullableNumber(file.SizeBytes),
    recordCount: parseNullableNumber(file.RecordCount),
    recordsInserted: parseNullableNumber(file.RecordsInserted),
    woid: file.Woid ?? '',
    status: file.Status ?? '',
    isCurrent: file.IsCurrent ?? false,
  };
}

/** Newest first by received time (ISO-like text sorts lexically), then highest ID. */
export function compareNewestFirst(a: FileRow, b: FileRow): number {
  if (a.receivedAt !== b.receivedAt) {
    return a.receivedAt < b.receivedAt ? 1 : -1;
  }
  return b.id - a.id;
}

/**
 * Loads every file matching `filters`, newest first. Requests one large page
 * and, if the service caps the page size, follows successive pages and merges
 * them until `TotalItems` is reached.
 */
export async function getAllFiles(
  filters: FileFilters = {},
): Promise<FileRow[]> {
  const collected: FileRead[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (collected.length < total && page <= MAX_PAGES) {
    const result = await getFiles({
      ...filters,
      Page: page,
      Size: ALL_FILES_PAGE_SIZE,
    });
    const files = result.Files ?? [];
    collected.push(...files);
    total = result.TotalItems ?? collected.length;
    if (files.length === 0) break;
    page += 1;
  }

  return collected.map(toFileRow).sort(compareNewestFirst);
}
