import type { StatusTone } from '@/components/status-chip/StatusChip';

/** Neutral placeholder shown where the service has no value. */
export const NO_VALUE = '—';

/** Status → chip tone: Imported success, Failed danger, Processing info. */
export const FILE_STATUS_TONE: Readonly<Record<string, StatusTone>> = {
  Imported: 'success',
  Failed: 'danger',
  Processing: 'info',
};

/** Tone for a service status; anything unrecognised is neutral. */
export function fileStatusTone(status: string): StatusTone {
  return FILE_STATUS_TONE[status] ?? 'neutral';
}

/**
 * Human-readable size, 1024-based with one decimal: "342.7 KB".
 * Under 1 KB shows bytes; 1 MB and over shows MB. `null` → placeholder.
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return NO_VALUE;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Exact size in bytes with thousands separators: "350,925 bytes". `null` → placeholder. */
export function formatByteCount(bytes: number | null): string {
  return bytes === null ? NO_VALUE : `${bytes.toLocaleString('en-GB')} bytes`;
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
