import type { StatusTone } from '@/components/status-chip/StatusChip';

/** Neutral placeholder shown where the service has no value. */
export const NO_VALUE = '—';

/**
 * Status → chip tone: Imported success, Failed danger, Staging and Importing
 * info, Staged neutral (grey).
 */
export const FILE_STATUS_TONE: Readonly<Record<string, StatusTone>> = {
  Staging: 'info',
  Staged: 'neutral',
  Importing: 'info',
  Imported: 'success',
  Failed: 'danger',
};

/** Tone for a service status; anything unrecognised is neutral. */
export function fileStatusTone(status: string): StatusTone {
  return FILE_STATUS_TONE[status] ?? 'neutral';
}

/** A count, or the placeholder when absent. */
export function formatCount(value: number | null): string {
  return value === null ? NO_VALUE : value.toLocaleString('en-GB');
}

/** The first 8 characters of a WOID, as the tables show it. */
export function shortWoid(woid: string): string {
  return woid.slice(0, 8);
}

/** The import trace page for a WOID (`/file-log/imports/{Woid}`). */
export function importTracePath(woid: string): string {
  return `/file-log/imports/${encodeURIComponent(woid)}`;
}
