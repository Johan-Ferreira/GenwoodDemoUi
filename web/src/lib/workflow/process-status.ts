import type { StatusTone } from '@/components/status-chip/StatusChip';

/** Workflow instance status → chip tone: Finished success, Faulted danger, Running info, Cancelled warning. */
export const PROCESS_STATUS_TONE: Readonly<Record<string, StatusTone>> = {
  Finished: 'success',
  Faulted: 'danger',
  Running: 'info',
  Cancelled: 'warning',
};

/** Tone for a workflow instance status; anything unrecognised is neutral. */
export function processStatusTone(status: string): StatusTone {
  return PROCESS_STATUS_TONE[status] ?? 'neutral';
}
