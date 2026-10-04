/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic file-log, Story 1: File log table with paging.
 *
 * Production contracts these tests define (implement to them):
 * - The File log page loads every file through `get` (GET /v1/files, typed
 *   endpoint in web/src/lib/api/files.ts) inside DataState, then renders a
 *   `<table>` with column headers ID, File, Curve family, Received, Size,
 *   Records inserted, WOID, Status — rows newest first by ReceivedAt (the
 *   service's order is not trusted; the app sorts in the browser).
 * - Size is human-readable in KB with one decimal, 1024-based like the
 *   prototype (350925 bytes -> "342.7 KB"; 244531 -> "238.8 KB").
 * - WOID shows only its first 8 characters.
 * - Missing/null SizeBytes or RecordsInserted render the neutral placeholder
 *   "—" (em dash) and never break the row.
 * - Status is a StatusChip (text label + `data-tone`): Imported=success,
 *   Failed=danger, Processing=info.
 * - No files -> "No files have been received yet." and no table.
 * - Load failure -> DataState's persistent role="alert" message with Retry,
 *   which reloads the list.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data.
 *
 * Paging (AC-3) and the accessibility scan (AC-6) are covered by the
 * Playwright spec for this story.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createFailedFile,
  createFile,
  createFiles,
  createProcessingFile,
} from '@/mocks/data/file';
import { createEmptyFileList, createFileList } from '@/mocks/data/file-list';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, get: vi.fn() };
});
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

/** The page inside the app's ToastProvider (mounted by the root layout). */
function renderFileLog() {
  return render(
    <ToastProvider>
      <FileLogPage />
    </ToastProvider>,
  );
}

/** The table row for a file, found by its leading ID cell. */
function rowForFile(id: number): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(`^${id}\\b`) });
}

/** Body rows only (rows that contain data cells, not header cells). */
function bodyRows(): HTMLElement[] {
  return screen
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0);
}

describe('Epic file-log, Story 1: File log table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('lists files newest first with the brief columns, readable size, short WOID and placeholders for missing values', async () => {
    // Service order deliberately oldest-first: the page must show newest first.
    mockGet.mockResolvedValue(
      createFileList({ Files: [...createFiles()].reverse() }),
    );

    renderFileLog();

    const table = await screen.findByRole('table');
    for (const header of [
      /^ID/,
      /^File/,
      /^Curve family/,
      /^Received/,
      /^Size/,
      /^Records inserted/,
      /^WOID/,
      /^Status/,
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }

    // Newest first by ReceivedAt (103 at 18:09:02 ... 95 on 2026-09-28).
    const leadingIds = bodyRows().map((row) =>
      within(row).getAllByRole('cell')[0].textContent?.trim(),
    );
    expect(leadingIds).toEqual(['103', '102', '101', '98', '97', '95']);

    // Canonical Imported file 101: size 350925 bytes, 26 inserted, WOID cut to 8.
    const imported = rowForFile(101);
    expect(
      within(imported).getByText('GLC Nominal daily data current month.xlsx'),
    ).toBeInTheDocument();
    expect(within(imported).getByText('Nominal')).toBeInTheDocument();
    expect(
      within(imported).getByText('2026-09-30 18:02:11'),
    ).toBeInTheDocument();
    expect(within(imported).getByText('342.7 KB')).toBeInTheDocument();
    expect(within(imported).getByText('26')).toBeInTheDocument();
    expect(within(imported).getByText('0d41a444')).toBeInTheDocument();
    expect(
      within(imported).queryByText('0d41a44498814111bcce69d60f7a823a'),
    ).not.toBeInTheDocument();

    // Processing file 103: size and records inserted both absent -> two placeholders.
    expect(within(rowForFile(103)).getAllByText('—')).toHaveLength(2);
  });

  // AC-2
  it('shows exactly one labelled status badge per file, toned by meaning', async () => {
    mockGet.mockResolvedValue(
      createFileList({
        Files: [createProcessingFile(), createFailedFile(), createFile()],
      }),
    );

    renderFileLog();
    await screen.findByRole('table');

    const expectations: Array<[number, string, string]> = [
      [101, 'Imported', 'success'],
      [102, 'Failed', 'danger'],
      [103, 'Processing', 'info'],
    ];
    const statusLabels = ['Imported', 'Failed', 'Processing'];

    for (const [id, label, tone] of expectations) {
      const row = rowForFile(id);
      const badge = within(row).getByText(label);
      expect(badge).toHaveAttribute('data-tone', tone);
      for (const other of statusLabels.filter((l) => l !== label)) {
        expect(within(row).queryByText(other)).not.toBeInTheDocument();
      }
    }
  });

  // AC-4
  it('says no files have been received instead of showing an empty table', async () => {
    mockGet.mockResolvedValue(createEmptyFileList());

    renderFileLog();

    expect(
      await screen.findByText('No files have been received yet.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // AC-5
  it('shows a persistent error with Retry when the list cannot load, and Retry reloads it', async () => {
    const user = userEvent.setup();
    mockGet.mockRejectedValue(
      new ServiceError({
        status: 500,
        description: 'The data service could not complete the request.',
        retryable: true,
        kind: 'service-error',
      }),
    );

    renderFileLog();

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(
        'The data service could not complete the request.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    mockGet.mockResolvedValue(createFileList());
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    const table = await screen.findByRole('table');
    expect(
      within(table).getByText('GLC Nominal daily data current month.xlsx'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
