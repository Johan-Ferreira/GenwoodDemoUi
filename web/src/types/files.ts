/**
 * App-side shapes for received files (file log rows), normalised from the
 * data service's `FileRead`. Shared by the File log and Overview views.
 */

/** The statuses the data service derives for a file (never user-entered). */
export const FILE_STATUSES = ['Imported', 'Failed', 'Processing'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/** The curve families a file belongs to (the `CurveFamily` filter values). */
export const CURVE_FAMILIES = ['Nominal', 'Real', 'Inflation', 'OIS'] as const;
export type CurveFamily = (typeof CURVE_FAMILIES)[number];

/** A file-log row with nullable-text numbers already parsed. */
export interface FileRow {
  id: number;
  fileName: string;
  curveFamily: string;
  /** `YYYY-MM-DD HH:MM:SS` as returned by the service (24h). */
  receivedAt: string;
  /** Bytes, or `null` when the service has no value. */
  sizeBytes: number | null;
  recordCount: number | null;
  /** Rows inserted, or `null` when the service has no value. */
  recordsInserted: number | null;
  woid: string;
  /** The service-derived status text (Imported / Failed / Processing). */
  status: string;
  isCurrent: boolean;
}
