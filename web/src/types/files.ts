/**
 * App-side shapes for received files (file log rows), normalised from the
 * data service's `FileRead`. Shared by the File log and Overview views.
 */

/**
 * The statuses the data service derives for a file (never user-entered), in
 * lifecycle order: ImportPro stages it (Staging → Staged), RateLoad loads it
 * into the target tables (Importing), then Imported or Failed.
 */
export const FILE_STATUSES = [
  'Staging',
  'Staged',
  'Importing',
  'Imported',
  'Failed',
] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/** Statuses a file passes through before it ends Imported or Failed. */
export const IN_PROGRESS_FILE_STATUSES: readonly string[] = [
  'Staging',
  'Staged',
  'Importing',
];

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
  /** The service-derived status text (Staging / Staged / Importing / Imported / Failed). */
  status: string;
  /** The process the status relates to (ImportPro / RateLoad), or `null` when not sent. */
  stage: string | null;
  /** The step that failed (only for Failed files), or `null`. */
  failedStep: string | null;
  isCurrent: boolean;
}
