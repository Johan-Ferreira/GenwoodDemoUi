/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/components/file-log/FileLogView.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 5: two-stage import statuses across the
 * File log and the Overview (R7, BR3, BR5 — change request).
 *
 * Production contract these tests define (implement to it):
 * - Status vocabulary (replaces Imported / Failed / Processing — "Processing" is
 *   gone): Staging, Staged, Importing, Imported, Failed. `FILE_STATUSES` in
 *   web/src/types/files.ts and `FILE_STATUS_TONE` in web/src/lib/files/file-format.ts.
 * - Every status is shown as a StatusChip (text label = the service's Status text,
 *   tone on `data-tone`): Imported=success, Failed=danger, Staging=info,
 *   Importing=info, Staged=neutral. Any unknown status is neutral and shows its
 *   own text. This applies in THREE places:
 *     1. the File log table Status column,
 *     2. the file details card (a StatusChip inside the details `<section>`, which
 *        stays a region labelled by the file-name heading),
 *     3. the Overview "Recent loads" table.
 * - File details `<dl>` gains a "Stage" row (`<dt>Stage</dt>` + value exactly as
 *   the service returns it: "ImportPro" or "RateLoad"). Only when Status is
 *   "Failed" it also shows a "Failed step" row (`<dt>Failed step</dt>` +
 *   FailedStep). A non-Failed file never shows a "Failed step" row, even if the
 *   service sent a FailedStep.
 * - A Failed file ALWAYS shows the danger alert (role="alert"). Its first line is
 *   the ExceptionNote when present; otherwise exactly
 *   "Failed at the {FailedStep} step of {Stage}." (e.g.
 *   "Failed at the Validate step of RateLoad."). It is followed by the existing
 *   guidance line
 *   "Fix the source file or re-import once the Bank of England republishes it.".
 * - Notices (useImportStatusNotices): a file previously seen as Staging, Staged
 *   or Importing that becomes Imported raises the toast "Import complete." once;
 *   one that becomes Failed raises "Import failed. See the file log for details."
 *   once. Moves between Staging / Staged / Importing and files seen for the first
 *   time raise nothing.
 * - Overview "Files received" card (role="group" named "Files received"): the
 *   Total, plus a breakdown line (filesReceivedLine in
 *   web/src/lib/overview/overview-format.ts) listing only the NON-ZERO counts in
 *   the order Imported, Importing, Staged, Staging, Failed (see
 *   FILE_COUNT_BREAKDOWN_ORDER in @/mocks/data/overview), lower-cased, comma
 *   separated: createLiveFileCounts() -> "2 imported, 19 importing, 10 failed";
 *   createFileCounts() -> "3 imported, 1 importing, 1 staged, 1 staging, 3 failed".
 * - FileRow / file details carry Stage and FailedStep (regenerated
 *   api-generated.ts from documentation/CurveData.yaml).
 *
 * The File log filter options (AC-1) are covered by the Playwright spec.
 *
 * Timers: the AC-5 notices test drives the File log's 10 s re-check with Vitest
 * fake timers (same pattern as the file-log Story 5 suite). Only
 * `@/lib/api/client` is mocked (plus next/navigation, since the App Router is not
 * mounted under jsdom). Every payload comes from the shared factories in
 * web/src/mocks/data/.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import OverviewPage from '@/app/(app)/overview/page';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  createFailedFile,
  createFile,
  createFiles,
  createImportingFile,
  createStagedFile,
  createStagingFile,
} from '@/mocks/data/file';
import {
  createFailedFileDetail,
  createImportedFileDetail,
  createRateLoadFailedFileDetail,
  createStagedFileDetail,
} from '@/mocks/data/file-detail';
import { createFileList } from '@/mocks/data/file-list';
import {
  createFileCounts,
  createLiveFileCounts,
  createOverview,
} from '@/mocks/data/overview';
import type {
  FileDetailRead,
  FileRead,
  OverviewRead,
} from '@/types/api-generated';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, get: vi.fn() };
});
const mockGet = get as ReturnType<typeof vi.fn>;

let currentSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/file-log',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const POLL_MS = 10_000;
const IMPORT_COMPLETE = 'Import complete.';
const IMPORT_FAILED = 'Import failed. See the file log for details.';
const GUIDANCE =
  'Fix the source file or re-import once the Bank of England republishes it.';

/** What GET /v1/files currently returns; a test may change it between polls. */
let serverFiles: FileRead[] = [];
/** Details served for GET /v1/files/{Id}. */
let serverDetails: FileDetailRead[] = [];
/** What GET /v1/overview returns. */
let serverOverview: OverviewRead = createOverview();

function serve(path: unknown): Promise<unknown> {
  if (path === '/v1/files') {
    return Promise.resolve(createFileList({ Files: serverFiles }));
  }
  if (path === '/v1/overview') return Promise.resolve(serverOverview);
  const detail = serverDetails.find((d) => path === `/v1/files/${d.Id}`);
  if (detail) return Promise.resolve(detail);
  return Promise.reject(new Error(`Unexpected request: ${String(path)}`));
}

function renderFileLog(fileId?: number) {
  currentSearch = fileId === undefined ? '' : `file=${fileId}`;
  return render(
    <ToastProvider>
      <FileLogPage />
      <ToastContainer />
    </ToastProvider>,
  );
}

function renderOverview() {
  return render(
    <ToastProvider>
      <OverviewPage />
    </ToastProvider>,
  );
}

/** A table row found by its leading ID cell. */
function rowFor(scope: HTMLElement, id: number): HTMLElement {
  return within(scope).getByRole('row', { name: new RegExp(`^${id}\\b`) });
}

/** The file details card: a region labelled by the file-name heading. */
function findDetails(detail: FileDetailRead): Promise<HTMLElement> {
  return screen.findByRole('region', { name: detail.FileName });
}

/** The value next to a details label, or null when the label is not shown. */
function detailValue(scope: HTMLElement, label: string): string | null {
  const term = within(scope).queryByText(label, { selector: 'dt' });
  if (!term) return null;
  return term.nextElementSibling?.textContent?.trim() ?? '';
}

/** Advance the fake clock and flush the resulting reads and renders. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('Epic workflow-monitor-and-api, Story 5: two-stage import statuses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
    serverFiles = createFiles();
    serverDetails = [];
    serverOverview = createOverview();
    mockGet.mockImplementation(serve);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC-2
  it('shows every status as a labelled chip with the agreed tone in the File log, the file details and Overview Recent loads', async () => {
    const unknown = createFile({
      Id: 90,
      FileName: 'GLC Real daily data previous month.xlsx',
      CurveFamily: 'Real',
      ReceivedAt: '2026-09-27 18:00:00',
      Woid: 'f0e1d2c3b4a5469788796a5b4c3d2e1f',
      Status: 'Archived',
    });
    serverFiles = [...createFiles(), unknown];
    const rateLoadFailed = createRateLoadFailedFileDetail();
    serverDetails = [rateLoadFailed];

    const fileLog = renderFileLog(rateLoadFailed.Id);

    const table = await screen.findByRole('table');
    const fileLogTones: Array<[number, string, string]> = [
      [104, 'Staging', 'info'],
      [105, 'Staged', 'neutral'],
      [103, 'Importing', 'info'],
      [101, 'Imported', 'success'],
      [106, 'Failed', 'danger'],
      [90, 'Archived', 'neutral'],
    ];
    for (const [id, label, tone] of fileLogTones) {
      expect(within(rowFor(table, id)).getByText(label)).toHaveAttribute(
        'data-tone',
        tone,
      );
    }
    expect(within(table).queryByText('Processing')).not.toBeInTheDocument();

    const details = await findDetails(rateLoadFailed);
    expect(within(details).getByText('Failed')).toHaveAttribute(
      'data-tone',
      'danger',
    );

    fileLog.unmount();

    serverOverview = createOverview();
    renderOverview();

    const recent = await screen.findByRole('region', { name: 'Recent loads' });
    const recentTones: Array<[number, string, string]> = [
      [104, 'Staging', 'info'],
      [105, 'Staged', 'neutral'],
      [103, 'Importing', 'info'],
      [106, 'Failed', 'danger'],
      [102, 'Failed', 'danger'],
    ];
    for (const [id, label, tone] of recentTones) {
      expect(within(rowFor(recent, id)).getByText(label)).toHaveAttribute(
        'data-tone',
        tone,
      );
    }
  });

  // AC-3
  it('shows the Stage row for every file and a Failed step row only for Failed files', async () => {
    const rateLoadFailed = createRateLoadFailedFileDetail();
    const stagingFailed = createFailedFileDetail();
    // A non-Failed file whose service record carries a stray FailedStep still
    // shows no failed step.
    const imported = createImportedFileDetail({ FailedStep: 'Validate' });
    const staged = createStagedFileDetail();
    serverDetails = [rateLoadFailed, stagingFailed, imported, staged];

    const cases: Array<[FileDetailRead, string, string | null]> = [
      [rateLoadFailed, 'RateLoad', 'Validate'],
      [stagingFailed, 'ImportPro', 'HoldImportDetailsLog'],
      [imported, 'RateLoad', null],
      [staged, 'ImportPro', null],
    ];
    for (const [detail, stage, failedStep] of cases) {
      const view = renderFileLog(detail.Id);
      const details = await findDetails(detail);
      expect(detailValue(details, 'Stage')).toBe(stage);
      expect(detailValue(details, 'Failed step')).toBe(failedStep);
      view.unmount();
    }
  });

  // AC-4
  it('always shows the alert for a Failed file: the exception note, or "Failed at the {step} step of {stage}." when there is none, then the guidance', async () => {
    const stagingFailed = createFailedFileDetail();
    const rateLoadFailed = createRateLoadFailedFileDetail();
    serverDetails = [stagingFailed, rateLoadFailed];

    const first = renderFileLog(stagingFailed.Id);
    const withNote = within(await findDetails(stagingFailed)).getByRole(
      'alert',
    );
    const noteText = withNote.textContent ?? '';
    expect(noteText).toContain('Row 12: invalid rate');
    expect(noteText).toContain(GUIDANCE);
    expect(noteText.indexOf('Row 12: invalid rate')).toBeLessThan(
      noteText.indexOf(GUIDANCE),
    );
    expect(noteText).not.toContain('Failed at the');
    first.unmount();

    renderFileLog(rateLoadFailed.Id);
    const withoutNote = within(await findDetails(rateLoadFailed)).getByRole(
      'alert',
    );
    const fallback = 'Failed at the Validate step of RateLoad.';
    expect(within(withoutNote).getByText(fallback)).toBeInTheDocument();
    const fallbackText = withoutNote.textContent ?? '';
    expect(fallbackText).toContain(GUIDANCE);
    expect(fallbackText.indexOf(fallback)).toBeLessThan(
      fallbackText.indexOf(GUIDANCE),
    );
  });

  // AC-5
  it('raises one notice when an in-progress file ends Imported or Failed, and none for in-progress moves or first sightings', async () => {
    vi.useFakeTimers();
    serverFiles = [
      createStagingFile(),
      createStagedFile(),
      createImportingFile(),
      createFile(),
      createFailedFile(),
    ];
    renderFileLog();
    await advance(0);

    // First sighting of every status: no notices.
    const table = screen.getByRole('table');
    expect(within(rowFor(table, 104)).getByText('Staging')).toBeInTheDocument();
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();

    // Moves between Staging, Staged and Importing, plus a new Imported file: no notices.
    const newImported = createFile({
      Id: 97,
      FileName: 'GLC Inflation daily data previous month.xlsx',
      CurveFamily: 'Inflation',
      ReceivedAt: '2026-09-30 18:15:00',
      Woid: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
    });
    serverFiles = [
      newImported,
      createStagingFile({ Status: 'Staged' }),
      createStagedFile({ Status: 'Importing', Stage: 'RateLoad' }),
      createImportingFile(),
      createFile(),
      createFailedFile(),
    ];
    await advance(POLL_MS);
    expect(
      within(rowFor(screen.getByRole('table'), 105)).getByText('Importing'),
    ).toBeInTheDocument();
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();

    // 104 (last seen Staged) is Imported; 103 (Importing) Failed: one of each.
    serverFiles = [
      newImported,
      createStagingFile({
        Status: 'Imported',
        Stage: 'RateLoad',
        SizeBytes: '412300',
        RecordCount: 26,
        RecordsInserted: '26',
      }),
      createStagedFile({ Status: 'Importing', Stage: 'RateLoad' }),
      createImportingFile({ Status: 'Failed', FailedStep: 'Validate' }),
      createFile(),
      createFailedFile(),
    ];
    await advance(POLL_MS);

    const notifications = screen.getByRole('region', { name: 'Notifications' });
    expect(within(notifications).getAllByText(IMPORT_COMPLETE)).toHaveLength(1);
    expect(within(notifications).getAllByText(IMPORT_FAILED)).toHaveLength(1);

    // Once they leave, unchanged statuses never repeat them.
    await advance(3_000);
    await advance(POLL_MS * 2);
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();
  });

  // AC-6
  it('shows the Files received total with a breakdown of only the non-zero statuses', async () => {
    serverOverview = createOverview({ FileCounts: createLiveFileCounts() });
    const live = renderOverview();

    const liveCard = await screen.findByRole('group', {
      name: 'Files received',
    });
    expect(within(liveCard).getByText('31')).toBeInTheDocument();
    expect(
      within(liveCard).getByText('2 imported, 19 importing, 10 failed'),
    ).toBeInTheDocument();
    expect(liveCard).not.toHaveTextContent(/staging|staged/i);
    live.unmount();

    serverOverview = createOverview({ FileCounts: createFileCounts() });
    renderOverview();

    const allCard = await screen.findByRole('group', {
      name: 'Files received',
    });
    expect(within(allCard).getByText('9')).toBeInTheDocument();
    expect(
      within(allCard).getByText(
        '3 imported, 1 importing, 1 staged, 1 staging, 3 failed',
      ),
    ).toBeInTheDocument();
  });
});
