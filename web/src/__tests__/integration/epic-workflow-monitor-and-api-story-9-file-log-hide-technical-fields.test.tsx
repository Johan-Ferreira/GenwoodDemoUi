/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/components/files/FileTable.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 9: File log hides technical fields.
 * Role: Demo presenter (the app has a single role; no role-gating here).
 *
 * Production contracts these tests define (implement to them):
 * - The shared FileTable (used by the File log and Overview "Recent loads") has
 *   exactly these column headers, in order: "#", "File", "Curve family",
 *   "Received", "Records inserted", "Status" (WOID removed by epic
 *   quality-check-and-clean-up story 1). There is no "Size" column
 *   (no size value such as "342.7 KB" in any row) and the first column is
 *   headed "#" — not "ID". It still holds the file's Id and still sorts.
 * - The file details card (FileDetailCard.tsx `detailFields()`) shows these
 *   rows, in order, for an Imported file: Staging instance ID, Rate load
 *   instance ID (renamed by epic quality-check-and-clean-up story 1), Stage,
 *   Received, Inbox location, Record count, Records inserted, Created by.
 *   There are no "Size", "Backup file" or "SHA-256" rows (their values are
 *   not shown either). "Download original" stays — it still uses the backup
 *   file name behind the scenes.
 *
 * The shared factories still carry SizeBytes / BackupFileName / Sha256 — the
 * UI must hide them. Only the API boundary (`@/lib/api/client`) and the Next
 * navigation hooks are mocked. Payloads come only from the project-wide
 * factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import OverviewPage from '@/app/(app)/overview/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createFiles } from '@/mocks/data/file';
import { createFileDetail } from '@/mocks/data/file-detail';
import { createFileList } from '@/mocks/data/file-list';
import { createOverview } from '@/mocks/data/overview';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

let currentSearch = '';
let currentPath = '/file-log';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => currentPath,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const TABLE_COLUMNS = [
  '#',
  'File',
  'Curve family',
  'Received',
  'Records inserted',
  'Status',
];

/** A size as the table used to show it ("342.7 KB", "196.6 KB", "512 B"). */
const SIZE_TEXT = /^\d+(\.\d)? (B|KB|MB)$/;

/** Serves the file list and the canonical file 101 detail from the shared factories. */
function serveFileLog() {
  const detail = createFileDetail();
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === '/v1/files') {
      return Promise.resolve(createFileList({ Files: createFiles() }));
    }
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    return Promise.reject(
      new ServiceError({
        status: 404,
        description: `Unexpected request in test: ${endpoint}`,
        retryable: true,
        kind: 'service-error',
      }),
    );
  });
  return detail;
}

function renderFileLog(fileId?: number) {
  currentPath = '/file-log';
  currentSearch = fileId === undefined ? '' : `file=${fileId}`;
  return render(
    <ToastProvider>
      <FileLogPage />
    </ToastProvider>,
  );
}

/** Visible header labels of a table, left to right. */
function headerLabels(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole('columnheader')
    .map((header) => (header.textContent ?? '').trim());
}

/** The first-column value of each data row, top to bottom. */
function leadingCells(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
    .map((row) =>
      (within(row).getAllByRole('cell')[0].textContent ?? '').trim(),
    );
}

describe('Epic workflow-monitor-and-api, Story 9: File log hides technical fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
    currentPath = '/file-log';
  });

  // AC-1
  it('heads the first File log column "#", has no Size column, and still sorts by the remaining columns', async () => {
    const user = userEvent.setup();
    serveFileLog();

    renderFileLog();

    const table = await screen.findByRole('table');
    expect(headerLabels(table)).toEqual(TABLE_COLUMNS);
    expect(
      within(table).queryByRole('columnheader', { name: /^Size/ }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole('columnheader', { name: /^ID/ }),
    ).not.toBeInTheDocument();

    // File 101 (350925 bytes) no longer shows its size anywhere in the table.
    expect(within(table).queryByText(SIZE_TEXT)).not.toBeInTheDocument();

    // The "#" column still holds the file Id and sorts it.
    const idHeader = within(table).getByRole('columnheader', { name: /^#/ });
    await user.click(within(idHeader).getByRole('button'));
    expect(leadingCells(table)).toEqual([
      '95',
      '97',
      '98',
      '101',
      '102',
      '103',
      '104',
      '105',
      '106',
    ]);
    expect(idHeader).toHaveAttribute('aria-sort', 'ascending');

    // Every remaining column is still a sort button.
    for (const label of TABLE_COLUMNS) {
      const header = within(table).getByRole('columnheader', {
        name: new RegExp(`^${label}`),
      });
      expect(within(header).getByRole('button')).toBeInTheDocument();
    }
  });

  // AC-2
  it("shows no Size, Backup file or SHA-256 in a file's details, but keeps the other details and Download original", async () => {
    const detail = serveFileLog();

    renderFileLog(detail.Id);

    const card = await screen.findByRole('region', {
      name: 'GLC Nominal daily data current month.xlsx',
    });

    const labels = within(card)
      .getAllByRole('term')
      .map((term) => (term.textContent ?? '').trim());
    expect(labels).toEqual([
      'Staging instance ID',
      'Rate load instance ID',
      'Stage',
      'Received',
      'Inbox location',
      'Record count',
      'Records inserted',
      'Created by',
    ]);

    // The hidden values are not shown either (the factory still carries them).
    expect(within(card).queryByText('350,925 bytes')).not.toBeInTheDocument();
    expect(
      within(card).queryByText(
        '0d41a44498814111bcce69d60f7a823a_GLC Nominal daily data current month.xlsx',
      ),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByText(
        'd141ba24a0612efa459ec3e824d0d57eecc422cff2f722e312bb7995a4841906',
      ),
    ).not.toBeInTheDocument();

    // Other details keep their values.
    expect(
      within(card).getByText(
        'C:/DigiataFiles/DigiataApps/ImportPro/Inbox/BankOfEngland/',
      ),
    ).toBeInTheDocument();
    expect(within(card).getByText('John Doe')).toBeInTheDocument();

    expect(
      within(card).getByRole('button', { name: 'Download original' }),
    ).toBeEnabled();
  });

  // AC-3
  it('shows no Size column in the Overview Recent loads table', async () => {
    currentPath = '/overview';
    mockGet.mockResolvedValue(createOverview({ RecentFiles: createFiles() }));

    render(
      <ToastProvider>
        <OverviewPage />
      </ToastProvider>,
    );

    const recent = await screen.findByRole('region', { name: 'Recent loads' });
    const table = within(recent).getByRole('table');

    expect(headerLabels(table)).toEqual(TABLE_COLUMNS);
    expect(
      within(table).queryByRole('columnheader', { name: /^Size/ }),
    ).not.toBeInTheDocument();
    expect(within(table).queryByText(SIZE_TEXT)).not.toBeInTheDocument();
    expect(leadingCells(table)).toHaveLength(5);
  });
});
