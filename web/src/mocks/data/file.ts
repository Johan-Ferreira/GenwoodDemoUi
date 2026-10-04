/**
 * Project-wide mock factory for the File entity (`FileRead`).
 *
 * Single source of truth for file-log row shape + canonical values, shared by the
 * Vitest and Playwright layers. Per-epic scenario fixtures compose these — never
 * re-define the shape in a test.
 *
 * Nullable numeric fields (`SizeBytes`, `RecordsInserted`) are typed as optional
 * strings by the codegen; a "null" value from the service is represented here by
 * omitting the field (undefined), which JSON-serialises to an absent property.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { FileRead } from '../../types/api-generated';

export const FILE_STATUSES = ['Imported', 'Failed', 'Processing'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

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
    IsCurrent: true,
    ...overrides,
  };
}

/** Imported but superseded (not the current version). */
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

/** Failed import: nothing inserted (RecordsInserted absent), not current. */
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
    IsCurrent: false,
  });
  delete base.RecordsInserted;
  return { ...base, ...overrides };
}

/** Processing import: size and inserted counts not yet known (both absent). */
export function createProcessingFile(
  overrides: Partial<FileRead> = {},
): FileRead {
  const base = createFile({
    Id: 103,
    FileName: 'OIS daily data current month.xlsx',
    CurveFamily: 'OIS',
    ReceivedAt: '2026-09-30 18:09:02',
    RecordCount: 0,
    Woid: '9a8b7c6d5e4f40312a1b2c3d4e5f6a7b',
    Status: 'Processing',
    IsCurrent: false,
  });
  delete base.SizeBytes;
  delete base.RecordsInserted;
  return { ...base, ...overrides };
}

/** A small mixed collection: covers every status, every curve family, IsCurrent true/false. */
export function createFiles(): FileRead[] {
  return [
    createProcessingFile(),
    createFailedFile(),
    createFile(),
    createSupersededFile(),
    createFile({
      Id: 97,
      FileName: 'GLC Inflation daily data current month.xlsx',
      CurveFamily: 'Inflation',
      ReceivedAt: '2026-09-29 18:00:12',
      SizeBytes: '199870',
      RecordCount: 26,
      RecordsInserted: '26',
      Woid: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
      IsCurrent: true,
    }),
    createFailedFile({
      Id: 95,
      FileName: 'OIS daily data current month.xlsx',
      CurveFamily: 'OIS',
      ReceivedAt: '2026-09-28 18:03:30',
      Woid: '1f2e3d4c5b6a47980a1b2c3d4e5f6071',
    }),
  ];
}
