import type { StatusTone } from '@/components/status-chip/StatusChip';
import { sortBy } from '@/lib/utils/sort';
import type { ExecutionLogRead } from '@/types/api-generated';

/** Shown for a step the service sends without a state: it has not run yet (BR1). */
export const PENDING_STEP_STATE = 'Pending';

/** Step state → tile tone (R2): Completed success, Faulted danger, Running info. */
const STEP_STATE_TONE: Readonly<Record<string, StatusTone>> = {
  Completed: 'success',
  Faulted: 'danger',
  Running: 'info',
};

/** Tone for a step state; Pending and anything else are neutral. */
export function stepStateTone(state: string): StatusTone {
  return STEP_STATE_TONE[state] ?? 'neutral';
}

/** The plain event name: "ActivityCompleted" → "Completed"; "Completed" unchanged. */
export function plainEventName(eventName: string): string {
  return eventName.replace(/^Activity(?=[A-Z])/, '');
}

const EVENT_TONE: Readonly<Record<string, StatusTone>> = {
  Completed: 'success',
  Faulted: 'danger',
};

/** Tone for a (plain) log event: Completed success, Faulted danger, others neutral. */
export function logEventTone(eventName: string): StatusTone {
  return EVENT_TONE[plainEventName(eventName)] ?? 'neutral';
}

/**
 * Drops an "Executing" entry when the next entry for the same activity is its
 * "Executed" entry (the service writes both for every activity). An "Executing"
 * entry with no "Executed" after it (still running) is kept. Pass the log in
 * display (oldest-first) order; order is preserved.
 */
export function collapseExecutingPairs(
  logs: readonly ExecutionLogRead[],
): ExecutionLogRead[] {
  const event = (log: ExecutionLogRead) => plainEventName(log.EventName ?? '');
  return logs.filter((log, index) => {
    if (event(log) !== 'Executing') return true;
    const next = logs
      .slice(index + 1)
      .find((later) => later.ActivityName === log.ActivityName);
    return next === undefined || event(next) !== 'Executed';
  });
}

/**
 * Log entries oldest first by `Timestamp` (BR2), whatever order the service
 * sends; entries with the same time keep the service's order.
 */
export function sortLogsOldestFirst(
  logs: readonly ExecutionLogRead[],
): ExecutionLogRead[] {
  return sortBy<ExecutionLogRead, 'timestamp'>(
    logs,
    { key: 'timestamp', direction: 'ascending' },
    (log) =>
      log.Timestamp !== undefined && log.Timestamp.trim() !== ''
        ? log.Timestamp
        : null,
    { numericText: false },
  );
}
