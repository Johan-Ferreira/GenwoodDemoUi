import { sortBy, type SortState, type SortValue } from '@/lib/utils/sort';
import type { ProcessInstanceRead } from '@/types/api-generated';

/**
 * The process names the service runs, offered by the Process name filter.
 * Hardcoded for the demo (the service has no endpoint listing them).
 */
export const PROCESS_NAMES = ['ImportFile', 'LoadYieldCurves'] as const;

/** Characters of a process instance ID shown before the ellipsis. */
const SHORT_INSTANCE_ID_LENGTH = 12;

/** The design's shortened instance ID: the first 12 characters, then "…". */
export function shortInstanceId(id: string): string {
  return `${id.slice(0, SHORT_INSTANCE_ID_LENGTH)}…`;
}

export type ProcessInstanceSortKey =
  | 'instanceId'
  | 'processName'
  | 'contextId'
  | 'createdAt'
  | 'lastExecutedAt'
  | 'lastActivity'
  | 'status';

export type ProcessInstanceSort = SortState<ProcessInstanceSortKey>;

function present(value: string | undefined): string | null {
  return value !== undefined && value.trim() !== '' ? value : null;
}

/** The value a process-instance column sorts on (missing values sort last). */
export function processInstanceSortValue(
  instance: ProcessInstanceRead,
  key: ProcessInstanceSortKey,
): SortValue {
  switch (key) {
    case 'instanceId':
      return present(instance.ProcessInstanceId);
    case 'processName':
      return present(instance.ProcessName);
    case 'contextId':
      return present(instance.ContextId);
    case 'createdAt':
      return present(instance.CreatedAt);
    case 'lastExecutedAt':
      return present(instance.LastExecutedAt);
    case 'lastActivity':
      return present(instance.LastExecutedActivityName);
    case 'status':
      return present(instance.CurrentStatus);
  }
}

/**
 * Process instances newest first by `CreatedAt` (R1), then by the chosen
 * column. IDs and `YYYY-MM-DD HH:MM:SS` timestamps compare character by
 * character, so hex IDs keep their textual order.
 */
export function sortProcessInstances(
  instances: readonly ProcessInstanceRead[],
  sort: ProcessInstanceSort | null,
): ProcessInstanceRead[] {
  const options = { numericText: false };
  const newestFirst = sortBy<ProcessInstanceRead, ProcessInstanceSortKey>(
    instances,
    { key: 'createdAt', direction: 'descending' },
    processInstanceSortValue,
    options,
  );
  return sortBy(newestFirst, sort, processInstanceSortValue, options);
}
