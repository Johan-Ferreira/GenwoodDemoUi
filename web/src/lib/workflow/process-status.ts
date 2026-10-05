import type { StatusTone } from '@/components/status-chip/StatusChip';

/** Every workflow instance `CurrentStatus` the service can return. */
export const PROCESS_STATUSES = [
  'Idle',
  'Running',
  'Suspended',
  'Finished',
  'Cancelled',
  'Faulted',
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
