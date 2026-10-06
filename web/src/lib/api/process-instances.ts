import { getProcessInstances } from '@/lib/api/endpoints';
import type {
  ProcessInstanceListQueryParams,
  ProcessInstanceRead,
} from '@/types/api-generated';

/** Filters accepted by `GET /v1/process-instances` (paging is handled by `getAllProcessInstances`). */
export type ProcessInstanceListFilters = Omit<
  ProcessInstanceListQueryParams,
  'Page' | 'Size'
>;

/** Page size requested when loading every matching run (accepted by the live service). */
export const ALL_PROCESS_INSTANCES_PAGE_SIZE = 50;

/** Safety stop so a misbehaving service can never loop forever (50 × 40 = 2,000 runs). */
const MAX_PAGES = 40;

/**
 * Loads every process instance matching `filters`, following the service's
 * pages until `TotalItems` is reached (or a page comes back empty, or
 * `MAX_PAGES` pages have been read). Service order is kept.
 */
export async function getAllProcessInstances(
  filters: ProcessInstanceListFilters = {},
): Promise<ProcessInstanceRead[]> {
  const collected: ProcessInstanceRead[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (collected.length < total && page <= MAX_PAGES) {
    const result = await getProcessInstances({
      ...filters,
      Page: page,
      Size: ALL_PROCESS_INSTANCES_PAGE_SIZE,
    });
    const instances = result.ProcessInstances ?? [];
    collected.push(...instances);
    total = result.TotalItems ?? collected.length;
    if (instances.length === 0) break;
    page += 1;
  }

  return collected;
}
