/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic file-log, Story 5: import finished / failed notices (R19, R20, NFR-2, NFR-5).
 *
 * Production contract these tests define (implement to it):
 * - While the File log is visible and at least one loaded file is Processing, the
 *   list re-reads GET /v1/files (same query) every 10 s. It stops when no file is
 *   Processing, pauses while the tab is hidden (`document.visibilityState`
 *   'hidden' + a `visibilitychange` event) and resumes when visible again.
 * - Each file's Status is compared with the previously seen one. Processing→Failed
 *   raises a transient toast whose title is exactly
 *   "Import failed. See the file log for details." (Processing→Imported raises
 *   "Import complete." — covered by the Playwright spec). No notice on first load
 *   or on polls where nothing changed.
 * - Background re-reads never show the DataState loading skeleton
 *   (role="status", name "Loading") — the rows stay on screen (silent refresh on
 *   useDataState).
 *
 * Timers: the 10 s poll is driven with Vitest fake timers (orchestrator decision:
 * component-local interval; the visible end-to-end flow is the Playwright spec).
 * Only `@/lib/api/client` is mocked; the "server" is a mutable file list composed
 * from the shared factories in web/src/mocks/data/.
 *
 * Data-contract: full client → service chain verified during manual checklist.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  createFailedFile,
  createFile,
  createProcessingFile,
} from '@/mocks/data/file';
import { createFileList } from '@/mocks/data/file-list';
import type { FileRead, FileReadList } from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({ get: vi.fn() }));
const mockGet = get as ReturnType<typeof vi.fn>;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/file-log',
  useSearchParams: () => new URLSearchParams(),
}));

const POLL_MS = 10_000;
const IMPORT_FAILED = 'Import failed. See the file log for details.';
const IMPORT_COMPLETE = 'Import complete.';

/** File names from the shared factories (each distinct within a scenario). */
const PROCESSING_NAME = 'OIS daily data current month.xlsx'; // createProcessingFile, Id 103
const IMPORTED_NAME = 'GLC Nominal daily data current month.xlsx'; // createFile, Id 101
const FAILED_NAME = 'GLC Inflation daily data current month.xlsx'; // createFailedFile, Id 102

/** What GET /v1/files currently returns; tests change it between polls. */
let serverFiles: FileRead[] = [];
/** When set, the next GET /v1/files returns this (e.g. a still-pending read). */
let heldResponse: Promise<FileReadList> | null = null;

function serveFiles(path: string): Promise<FileReadList> {
  if (!/^\/v1\/files(\?|$)/.test(path)) {
    return Promise.reject(new Error(`Unexpected request ${path}`));
  }
  if (heldResponse) {
    const response = heldResponse;
    heldResponse = null;
    return response;
  }
  return Promise.resolve(createFileList({ Files: serverFiles }));
}

function setVisibility(state: 'visible' | 'hidden', notify: boolean): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => state === 'hidden',
  });
  if (notify) {
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
}

/** Advance the fake clock and flush the resulting reads and renders. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function renderFileLog(): Promise<void> {
  render(
    <ToastProvider>
      <FileLogPage />
      <ToastContainer />
    </ToastProvider>,
  );
  await advance(0);
}

function fileRow(fileName: string): HTMLElement {
  return within(screen.getByRole('table')).getByRole('row', {
    name: new RegExp(fileName.replace(/\./g, '\\.')),
  });
}

describe('Epic file-log, Story 5: import finished and failed notices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setVisibility('visible', false);
    heldResponse = null;
    mockGet.mockImplementation(serveFiles);
  });

  afterEach(() => {
    vi.useRealTimers();
    setVisibility('visible', false);
  });

  // AC-2
  it('updates the badge and shows "Import failed. See the file log for details." once when a Processing file fails', async () => {
    serverFiles = [createProcessingFile(), createFile(), createFailedFile()];
    await renderFileLog();

    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Processing'),
    ).toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();

    serverFiles = [
      createProcessingFile({ Status: 'Failed' }),
      createFile(),
      createFailedFile(),
    ];
    await advance(POLL_MS);

    const row = fileRow(PROCESSING_NAME);
    expect(within(row).getByText('Failed')).toBeInTheDocument();
    expect(within(row).queryByText('Processing')).not.toBeInTheDocument();

    const notifications = screen.getByRole('region', { name: 'Notifications' });
    expect(within(notifications).getAllByText(IMPORT_FAILED)).toHaveLength(1);
    expect(
      within(notifications).queryByText(IMPORT_COMPLETE),
    ).not.toBeInTheDocument();
    expect(
      within(notifications).getByText(IMPORT_FAILED).textContent,
    ).not.toMatch(/!/);

    // Transient: it leaves on its own, and later time passing never repeats it.
    await advance(3_000);
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();
    await advance(POLL_MS * 3);
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Failed'),
    ).toBeInTheDocument();
  });

  // AC-3
  it('shows no notice on first load or on unchanged polls, and never repeats a notice for an unchanged status', async () => {
    const SECOND_PROCESSING_NAME = 'GLC Real daily data current month.xlsx';
    const secondProcessing = createProcessingFile({
      Id: 104,
      FileName: SECOND_PROCESSING_NAME,
      CurveFamily: 'Real',
      ReceivedAt: '2026-09-30 18:11:45',
      Woid: '4b5c6d7e8f9041a2b3c4d5e6f7a8b9c0',
    });
    serverFiles = [
      secondProcessing,
      createProcessingFile(),
      createFile(),
      createFailedFile(),
    ];
    await renderFileLog();

    // First load with Imported, Failed and Processing files: no notices.
    expect(
      within(fileRow(IMPORTED_NAME)).getByText('Imported'),
    ).toBeInTheDocument();
    expect(
      within(fileRow(FAILED_NAME)).getByText('Failed'),
    ).toBeInTheDocument();
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();

    // A poll with nothing changed: still no notices.
    await advance(POLL_MS);
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();

    // One file fails: exactly one notice.
    serverFiles = [
      secondProcessing,
      createProcessingFile({ Status: 'Failed' }),
      createFile(),
      createFailedFile(),
    ];
    await advance(POLL_MS);
    expect(
      within(
        screen.getByRole('region', { name: 'Notifications' }),
      ).getAllByText(IMPORT_FAILED),
    ).toHaveLength(1);

    // Let it leave; polling continues (another file is still Processing) but the
    // already-Failed file never raises the notice again.
    await advance(3_000);
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();
    await advance(POLL_MS * 2);
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Failed'),
    ).toBeInTheDocument();
    expect(
      within(fileRow(SECOND_PROCESSING_NAME)).getByText('Processing'),
    ).toBeInTheDocument();
    expect(screen.queryByText(IMPORT_FAILED)).not.toBeInTheDocument();
    expect(screen.queryByText(IMPORT_COMPLETE)).not.toBeInTheDocument();
  });

  // AC-4
  it('checks in the background without a skeleton, pauses while the tab is hidden, and stops when nothing is Processing', async () => {
    serverFiles = [createProcessingFile(), createFile()];
    await renderFileLog();
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Processing'),
    ).toBeInTheDocument();

    // Background check that takes a while: no loading skeleton, rows stay.
    let resolveHeld: (value: FileReadList) => void = () => undefined;
    heldResponse = new Promise<FileReadList>((resolve) => {
      resolveHeld = resolve;
    });
    await advance(POLL_MS + 3_500);
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/taking longer than usual/i),
    ).not.toBeInTheDocument();
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Processing'),
    ).toBeInTheDocument();
    expect(fileRow(IMPORTED_NAME)).toBeInTheDocument();
    await act(async () => {
      resolveHeld(createFileList({ Files: serverFiles }));
    });
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument();

    // Tab hidden: the file finishes on the service, but the list does not check.
    setVisibility('hidden', true);
    serverFiles = [createProcessingFile({ Status: 'Imported' }), createFile()];
    await advance(POLL_MS * 3);
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Processing'),
    ).toBeInTheDocument();

    // Tab visible again: checking resumes and picks up the change.
    setVisibility('visible', true);
    await advance(POLL_MS);
    expect(
      within(fileRow(PROCESSING_NAME)).getByText('Imported'),
    ).toBeInTheDocument();

    // Nothing is Processing now: a newly arrived file is not picked up by polling.
    const newArrival = createProcessingFile({
      Id: 105,
      FileName: 'GLC Nominal daily data previous month.xlsx',
      CurveFamily: 'Nominal',
      ReceivedAt: '2026-09-30 18:20:05',
      Woid: '6c7d8e9f0a1b42c3d4e5f6a7b8c9d0e1',
    });
    serverFiles = [
      newArrival,
      createProcessingFile({ Status: 'Imported' }),
      createFile(),
    ];
    await advance(POLL_MS * 3);
    expect(
      within(screen.getByRole('table')).queryByRole('row', {
        name: /GLC Nominal daily data previous month\.xlsx/,
      }),
    ).not.toBeInTheDocument();
  });
});
