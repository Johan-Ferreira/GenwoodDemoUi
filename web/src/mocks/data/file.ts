/**
 * Project-wide mock factory for the File entity (`FileRead`).
 *
 * Single source of truth for file-log row shape + canonical values, shared by the
 * Vitest and Playwright layers. Per-epic scenario fixtures compose these — never
 * re-define the shape in a test.
 *
 * Status contract (verified live 2026-10-05): a file goes through two processes —
 * ImportPro (`ImportFile` run, id = `Woid`) stages it, then RateLoad
 * (`LoadYieldCurves` run, id = the detail's `WorkflowInstanceId`) completes it.
 * - `Status`: Staging | Staged | Importing | Imported | Failed (no 'Processing').
 * - `Stage`: 'ImportPro' (Staging, Staged, ImportPro-failed) | 'RateLoad'
 *   (Importing, Imported, RateLoad-failed).
 * - `FailedStep`: only on Failed files. RateLoad failure -> the last RateLoad step
 *   that ran (e.g. 'Validate'); ImportPro failure -> the internal ImportPro step
 *   (e.g. 'HoldImportDetailsLog').
 * - Every file is `IsCurrent: true` (live behaviour). `createSupersededFile()` is
 *   the only explicit `IsCurrent: false` variant and is NOT in `createFiles()`.
 *
 * Seeded files (id / Woid / status):
 * - 104 `b4c5d6e7f8a94b0c9d1e2f3a4b5c6d7e` Staging   (ImportPro)
 * - 105 `c5d6e7f8a9b04c1d8e2f3a4b5c6d7e8f` Staged    (ImportPro)
 * - 103 `9a8b7c6d5e4f40312a1b2c3d4e5f6a7b` Importing (RateLoad)
 * - 106 `a7b8c9d0e1f24a3b8c4d5e6f7a8b9c0d` Failed    (RateLoad, FailedStep Validate)
 * - 102 `3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f` Failed    (ImportPro, FailedStep HoldImportDetailsLog)
 * - 101 `0d41a44498814111bcce69d60f7a823a` Imported  (RateLoad, canonical)
 * - 98  `7b2e19c4a5f04e0d9c1f3a6b8d2e4f10` Imported
 * - 97  `5e6f7a8b9c0d41e2f3a4b5c6d7e8f901` Imported
 * - 95  `1f2e3d4c5b6a47980a1b2c3d4e5f6071` Failed    (ImportPro)
 *
 * Nullable numeric fields (`SizeBytes`, `RecordsInserted`) are typed as optional
 * strings by the codegen; a "null" value from the service is represented here by
 * omitting the field (undefined), which JSON-serialises to an absent property.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { FileRead } from '../../types/api-generated';

/** Every file status, in lifecycle order (the File log filter's option order). */
export const FILE_STATUSES = [
  'Staging',
  'Staged',
  'Importing',
  'Imported',
  'Failed',
] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/** The process a file's status relates to. */
export const FILE_STAGES = ['ImportPro', 'RateLoad'] as const;
export type FileStage = (typeof FILE_STAGES)[number];

export const CURVE_FAMILIES = ['Nominal', 'Real', 'Inflation', 'OIS'] as const;
export type CurveFamily = (typeof CURVE_FAMILIES)[number];

/** Canonical Imported, current file (matches the OpenAPI example). */
export function createFile(overrides: Partial<FileRead> = {}): FileRead {
  return {
    Id: 101,
    FileName: 'GLC Nominal daily data current month.xlsx',
    CurveFamily: 'Nominal',
    ReceivedAt: '2026-09-30 18:02:11',
    SizeBytes: '350925',
    RecordCount: 26,
    RecordsInserted: '26',
    Woid: '0d41a44498814111bcce69d60f7a823a',
    Status: 'Imported',
    Stage: 'RateLoad',
    IsCurrent: true,
    ...overrides,
  };
}

/** Imported file (RateLoad completed) — same as the canonical `createFile()`. */
export function createImportedFile(
  overrides: Partial<FileRead> = {},
): FileRead {
  return createFile(overrides);
}

/** Imported but superseded (not the current version). Not in `createFiles()`. */
export function createSupersededFile(
  overrides: Partial<FileRead> = {},
): FileRead {
  return createFile({
    Id: 98,
    FileName: 'GLC Real daily data current month.xlsx',
    CurveFamily: 'Real',
    ReceivedAt: '2026-09-29 18:01:47',
    SizeBytes: '298114',
    RecordCount: 25,
    RecordsInserted: '25',
    Woid: '7b2e19c4a5f04e0d9c1f3a6b8d2e4f10',
    Status: 'Imported',
    IsCurrent: false,
    ...overrides,
  });
}

/** Staging: ImportPro is still taking the file in — size and inserted count unknown. */
export function createStagingFile(overrides: Partial<FileRead> = {}): FileRead {
  const base = createFile({
    Id: 104,
    FileName: 'GLC Real daily data current month - SpotCurve.xlsx',
    CurveFamily: 'Real',
    ReceivedAt: '2026-09-30 18:12:30',
    RecordCount: 0,
    Woid: 'b4c5d6e7f8a94b0c9d1e2f3a4b5c6d7e',
    Status: 'Staging',
    Stage: 'ImportPro',
  });
  delete base.SizeBytes;
  delete base.RecordsInserted;
  return { ...base, ...overrides };
}

/** Staged: ImportPro has staged the file; RateLoad has not picked it up yet. */
export function createStagedFile(overrides: Partial<FileRead> = {}): FileRead {
  const base = createFile({
    Id: 105,
    FileName: 'GLC Nominal daily data current month - SpotCurve.xlsx',
    CurveFamily: 'Nominal',
    ReceivedAt: '2026-09-30 18:11:00',
    SizeBytes: '244580',
    RecordCount: 25,
    Woid: 'c5d6e7f8a9b04c1d8e2f3a4b5c6d7e8f',
    Status: 'Staged',
    Stage: 'ImportPro',
  });
  delete base.RecordsInserted;
  return { ...base, ...overrides };
}

/** Importing: RateLoad is loading the staged rows into the target tables. */
export function createImportingFile(
  overrides: Partial<FileRead> = {},
): FileRead {
  return createFile({
    Id: 103,
    FileName: 'OIS daily data current month.xlsx',
    CurveFamily: 'OIS',
    ReceivedAt: '2026-09-30 18:09:02',
    SizeBytes: '105439',
    RecordCount: 26,
    RecordsInserted: '26',
    Woid: '9a8b7c6d5e4f40312a1b2c3d4e5f6a7b',
    Status: 'Importing',
    Stage: 'RateLoad',
    ...overrides,
  });
}

/**
 * Failed in ImportPro (staging): nothing inserted, `FailedStep` is ImportPro's
 * internal step name. Its detail carries an `ExceptionNote`.
 */
export function createFailedFile(overrides: Partial<FileRead> = {}): FileRead {
  const base = createFile({
    Id: 102,
    FileName: 'GLC Inflation daily data current month.xlsx',
    CurveFamily: 'Inflation',
    ReceivedAt: '2026-09-30 18:05:40',
    SizeBytes: '201337',
    RecordCount: 26,
    Woid: '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    Status: 'Failed',
    Stage: 'ImportPro',
    FailedStep: 'HoldImportDetailsLog',
  });
  delete base.RecordsInserted;
  return { ...base, ...overrides };
}

/** Alias of `createFailedFile()` — the ImportPro (staging) failure. */
export const createStagingFailedFile = createFailedFile;

/**
 * Failed in RateLoad: staged fine (rows inserted into staging), then RateLoad
 * stopped at Validate. No `ExceptionNote` on its detail.
 */
export function createRateLoadFailedFile(
  overrides: Partial<FileRead> = {},
): FileRead {
  return createFile({
    Id: 106,
    FileName: 'OIS daily data current month - FwdCurve.xlsx',
    CurveFamily: 'OIS',
    ReceivedAt: '2026-09-30 18:07:15',
    SizeBytes: '56108',
    RecordCount: 6,
    RecordsInserted: '6',
    Woid: 'a7b8c9d0e1f24a3b8c4d5e6f7a8b9c0d',
    Status: 'Failed',
    Stage: 'RateLoad',
    FailedStep: 'Validate',
    ...overrides,
  });
}

/**
 * A mixed collection, newest first: every status, both stages, both failure
 * kinds, every curve family. All `IsCurrent: true`.
 */
export function createFiles(): FileRead[] {
  return [
    createStagingFile(),
    createStagedFile(),
    createImportingFile(),
    createRateLoadFailedFile(),
    createFailedFile(),
    createFile(),
    createSupersededFile({ IsCurrent: true }),
    createFile({
      Id: 97,
      FileName: 'GLC Inflation daily data current month.xlsx',
      CurveFamily: 'Inflation',
      ReceivedAt: '2026-09-29 18:00:12',
      SizeBytes: '199870',
      RecordCount: 26,
      RecordsInserted: '26',
      Woid: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
    }),
    createFailedFile({
      Id: 95,
      FileName: 'OIS daily data current month.xlsx',
      CurveFamily: 'OIS',
      ReceivedAt: '2026-09-28 18:03:30',
      Woid: '1f2e3d4c5b6a47980a1b2c3d4e5f6071',
      FailedStep: 'HoldValidateDuplidate',
    }),
  ];
}
