import type { StatusTone } from '@/components/status-chip/StatusChip';
import type { ProcessInstanceRead } from '@/types/api-generated';

/** Every workflow instance `CurrentStatus` the service can return. */
export const PROCESS_STATUSES = [
  'Idle',
  'Running',
  'Suspended',
  'Finished',
  'Cancelled',
  'Faulted',
] as const;

/** The RateLoad run's process name (the service has no process called RateLoad). */
export const RATE_LOAD_PROCESS_NAME = 'LoadYieldCurves';

/** The RateLoad activity a failed run ends on (the service never reports Faulted). */
export const RATE_LOAD_ERROR_ACTIVITY = 'Error';

/** Label for a RateLoad run that finished on its Error activity. */
export const FINISHED_ON_ERROR_LABEL = 'Finished (Error)';

/**
 * Workflow instance status → chip tone (BR4): Finished success, Faulted danger,
 * Running info; Idle, Suspended and Cancelled are neutral.
 */
export const PROCESS_STATUS_TONE: Readonly<Record<string, StatusTone>> = {
  Finished: 'success',
  Faulted: 'danger',
  Running: 'info',
};

/** Tone for a workflow instance status; anything else is neutral. */
export function processStatusTone(status: string): StatusTone {
  return PROCESS_STATUS_TONE[status] ?? 'neutral';
}

/** True for a RateLoad run that is Finished with last activity 'Error' (a failure). */
export function isRateLoadFinishedOnError(
  run: Pick<
    ProcessInstanceRead,
    'ProcessName' | 'CurrentStatus' | 'LastExecutedActivityName'
  >,
): boolean {
  return (
    run.ProcessName === RATE_LOAD_PROCESS_NAME &&
    run.CurrentStatus === 'Finished' &&
    run.LastExecutedActivityName?.trim() === RATE_LOAD_ERROR_ACTIVITY
  );
}

/**
 * The status chip for a run: label + tone. A RateLoad run that finished on its
 * Error activity reads "Finished (Error)" in danger; every other run shows its
 * `CurrentStatus` with `processStatusTone`. Null when the run has no status.
 */
export function runStatusDisplay(
  run: Pick<
    ProcessInstanceRead,
    'ProcessName' | 'CurrentStatus' | 'LastExecutedActivityName'
  >,
): { label: string; tone: StatusTone } | null {
  const status = run.CurrentStatus?.trim() ?? '';
  if (status === '') return null;
  if (isRateLoadFinishedOnError(run)) {
    return { label: FINISHED_ON_ERROR_LABEL, tone: 'danger' };
  }
  return { label: status, tone: processStatusTone(status) };
}

/** RateLoad steps in their real order (the service sends them out of order). */
export const RATE_LOAD_STEP_ORDER = [
  'Register',
  'Validate',
  'Transform',
  'Import',
  'Complete',
] as const;

/**
 * A run's steps in display order. RateLoad steps follow RATE_LOAD_STEP_ORDER,
 * unknown step names after them in service order; every other process keeps
 * the service order exactly.
 */
export function orderRunSteps<T extends { Name?: string }>(
  processName: string | undefined,
  steps: readonly T[],
): T[] {
  if (processName !== RATE_LOAD_PROCESS_NAME) return [...steps];
  const order: readonly string[] = RATE_LOAD_STEP_ORDER;
  const rank = (step: T) => {
    const index = order.indexOf(step.Name ?? '');
    return index < 0 ? order.length : index;
  };
  // Array.prototype.sort is stable, so unknown steps keep service order.
  return [...steps].sort((a, b) => rank(a) - rank(b));
}
