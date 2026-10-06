import type { StatusTone } from '@/components/status-chip/StatusChip';
import {
  PENDING_STEP_STATE,
  stepStateTone,
} from '@/lib/workflow/execution-log';
import type {
  FileDetailRead,
  ProcessInstanceRead,
} from '@/types/api-generated';

/** The workflow instance `CurrentStatus` values the live service reports. */
export const PROCESS_STATUSES = [
  'Idle',
  'Running',
  'Suspended',
  'Finished',
  'Cancelled',
] as const;

/** The RateLoad run's process name (the service has no process called RateLoad). */
export const RATE_LOAD_PROCESS_NAME = 'LoadYieldCurves';

/** The staging run's process name. */
export const IMPORT_FILE_PROCESS_NAME = 'ImportFile';

/** The RateLoad activity a failed run ends on (the service never reports Faulted). */
export const RATE_LOAD_ERROR_ACTIVITY = 'Error';

/** Label for a RateLoad run that finished on its Error activity. */
export const FINISHED_ON_ERROR_LABEL = 'Finished (Error)';

/**
 * The Status filter's options: the service statuses, then "Finished (Error)"
 * (the runs `isRateLoadFinishedOnError` accepts — narrowed on the page, since
 * the service cannot filter on the last activity).
 */
export const PROCESS_STATUS_FILTER_OPTIONS = [
  ...PROCESS_STATUSES,
  FINISHED_ON_ERROR_LABEL,
] as const;

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

/**
 * True for a RateLoad (LoadYieldCurves) run that is Finished with last activity
 * 'Error' (a failure). The single predicate behind both the "Finished (Error)"
 * status chip and the "Finished (Error)" Status filter, so a run is listed under
 * the filter exactly when its chip reads "Finished (Error)".
 */
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

/** The file stage of the staging (ImportPro) workflow. */
export const STAGING_FILE_STAGE = 'ImportPro';

/**
 * The exception note to show in a run's Audit history (BR4), or null. Shown
 * only for an ImportFile run whose import resolved to a file, that did not
 * finish successfully (CurrentStatus other than Finished, FaultedAt set, or the
 * file Failed at the ImportPro stage), and whose file has a non-blank note.
 */
export function stagingExceptionNote(
  run: Pick<ProcessInstanceRead, 'ProcessName' | 'CurrentStatus'> & {
    FaultedAt?: string;
  },
  file: Pick<FileDetailRead, 'Status' | 'Stage' | 'ExceptionNote'> | undefined,
): string | null {
  if (run.ProcessName !== IMPORT_FILE_PROCESS_NAME || file === undefined) {
    return null;
  }
  const note = file.ExceptionNote?.trim() ?? '';
  if (note === '') return null;
  const finishedSuccessfully =
    run.CurrentStatus?.trim() === 'Finished' &&
    (run.FaultedAt === undefined || run.FaultedAt.trim() === '') &&
    !(file.Status === 'Failed' && file.Stage === STAGING_FILE_STAGE);
  return finishedSuccessfully ? null : note;
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

/** The state label of the step a failed RateLoad run stopped on. */
export const ERROR_STEP_STATE = 'Error';

/** A step tile as shown: name, state label and tone. */
export interface DisplayedRunStep {
  name: string | undefined;
  state: string;
  tone: StatusTone;
}

/** ImportFile's alternative hold / clean-up branch steps ("Hold…", "Clear…"). */
function isHoldOrClearStep(name: string | undefined): boolean {
  return /^(Hold|Clear)/.test(name ?? '');
}

/**
 * The step tiles of a run, in `orderRunSteps` order (a missing state reads
 * Pending), stopping where the run stopped:
 * - ImportFile: Pending "Hold…" / "Clear…" steps are left out (a Hold/Clear step
 *   the run actually reached shows in its own state).
 * - A LoadYieldCurves run Finished on 'Error': the last step that ran shows as
 *   "Error" (danger) and the Pending steps after it are left out.
 * Everything else shows every step.
 */
export function displayRunSteps(
  run: Pick<
    ProcessInstanceRead,
    'ProcessName' | 'CurrentStatus' | 'LastExecutedActivityName'
  > & { Steps?: ReadonlyArray<{ Name?: string; State?: string }> },
): DisplayedRunStep[] {
  const steps: DisplayedRunStep[] = orderRunSteps(
    run.ProcessName,
    run.Steps ?? [],
  ).map((step) => {
    const state =
      step.State !== undefined && step.State.trim() !== ''
        ? step.State
        : PENDING_STEP_STATE;
    return { name: step.Name, state, tone: stepStateTone(state) };
  });

  if (run.ProcessName === IMPORT_FILE_PROCESS_NAME) {
    return steps.filter(
      (step) =>
        !(step.state === PENDING_STEP_STATE && isHoldOrClearStep(step.name)),
    );
  }

  if (isRateLoadFinishedOnError(run)) {
    let failed = -1;
    steps.forEach((step, index) => {
      if (step.state !== PENDING_STEP_STATE) failed = index;
    });
    // No step ran: nothing to mark, show the steps as the service sent them.
    if (failed < 0) return steps;
    return [
      ...steps.slice(0, failed),
      { name: steps[failed].name, state: ERROR_STEP_STATE, tone: 'danger' },
    ];
  }

  return steps;
}
