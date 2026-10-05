/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic file-log, Story 2: filter and sort the file log (vitest-tagged ACs: 2, 4, 5).
 *
 * Production contracts these tests define (implement to them):
 * - The File log page loads ALL matching files once through `get('/v1/files', params)`
 *   (user decision: whole-list sorting), then sorts and pages them in the browser.
 *   Filters are sent as the Status / CurveFamily / ReceivedFrom / ReceivedTo query
 *   parameters (BR1).
 * - "Received from" / "Received to" are text inputs labelled exactly so. An entry not
 *   in YYYY-MM-DD form shows "Enter the date as YYYY-MM-DD." inline and does NOT send a
 *   request (R3) — the fake service below rejects a malformed date, so a leaked request
 *   would surface as a service error and break the list.
 * - Each sortable column header is a `columnheader` containing a button. First choice
 *   sorts ascending, second descending; the active column carries `aria-sort`
 *   ("ascending" / "descending") and no other column does (R9).
 * - SizeBytes / RecordsInserted are parsed as numbers (not compared as text). Rows where
 *   the value is missing stay in the list and sort AFTER all rows that have a value, in
 *   both directions (BR4).
 *
 * Only the API client is mocked. These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  createFailedFile,
  createFile,
  createFiles,
  createStagingFile,
  createSupersededFile,
} from '@/mocks/data/file';
import { createFileList } from '@/mocks/data/file-list';
import type { FileRead, FileReadList } from '@/types/api-generated';
import type { QueryParams } from '@/types/api';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/file-log',
  useSearchParams: () => new URLSearchParams(),
}));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function paramAsString(
  params: QueryParams | undefined,
  key: string,
): string | undefined {
  const value = params?.[key];
  return value === undefined ? undefined : String(value);
}

/**
 * Behaves like GET /v1/files: filters by the query parameters, pages the result,
 * and rejects a malformed received date the way the service would.
 */
function serveFiles(files: FileRead[]) {
  return async (
    endpoint: string,
    params?: QueryParams,
  ): Promise<FileReadList> => {
    if (endpoint !== '/v1/files') {
      throw new Error(`Unexpected endpoint in test: ${endpoint}`);
    }
    const status = paramAsString(params, 'Status');
    const family = paramAsString(params, 'CurveFamily');
    const from = paramAsString(params, 'ReceivedFrom');
    const to = paramAsString(params, 'ReceivedTo');

    for (const date of [from, to]) {
      if (date !== undefined && date !== '' && !ISO_DATE.test(date)) {
        throw {
          status: 400,
          description:
            'The data service could not complete the request (400 Bad Request).',
          retryable: true,
          kind: 'service-error' as const,
        };
      }
    }

    const matching = files.filter(
      (file) =>
        (!status || file.Status === status) &&
        (!family || file.CurveFamily === family) &&
        (!from || (file.ReceivedAt ?? '').slice(0, 10) >= from) &&
        (!to || (file.ReceivedAt ?? '').slice(0, 10) <= to),
    );

    const page = Number(paramAsString(params, 'Page') ?? 1);
    const size = Number(paramAsString(params, 'Size') ?? 50);
    const start = (page - 1) * size;
    return createFileList({
      Files: matching.slice(start, start + size),
      TotalItems: matching.length,
      Page: page,
      Size: size,
    });
  };
}

function renderFileLog() {
  return render(
    <ToastProvider>
      <FileLogPage />
    </ToastProvider>,
  );
}

/** The ID column (the first column per R1) of each data row, top to bottom. */
function listedIds(): string[] {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
    .map((row) =>
      (within(row).getAllByRole('cell')[0].textContent ?? '').trim(),
    );
}

async function waitForIds(count: number): Promise<void> {
  await waitFor(() => {
    expect(listedIds()).toHaveLength(count);
  });
}

function sortButton(columnName: RegExp): HTMLElement {
  return within(
    screen.getByRole('columnheader', { name: columnName }),
  ).getByRole('button');
}

describe('Epic file-log, Story 2: filter and sort the file log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-2
  it('shows the date-format message for a received date not in YYYY-MM-DD form and leaves the list as it was', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveFiles(createFiles()));

    renderFileLog();
    await waitForIds(9);
    const idsBefore = listedIds();

    const receivedFrom = screen.getByRole('textbox', { name: 'Received from' });
    await user.type(receivedFrom, '04/10/2026');
    await user.tab();

    expect(
      await screen.findByText('Enter the date as YYYY-MM-DD.'),
    ).toBeInTheDocument();

    // Give any (wrongly) dispatched request time to settle before checking the list.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(listedIds()).toEqual(idsBefore);
    expect(
      screen.queryByText(/could not complete the request/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
  });

  // AC-4
  it('sorts by a chosen column ascending, then descending on the second choice, and marks the active column and direction', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveFiles(createFiles()));

    renderFileLog();
    await waitForIds(9);

    await user.click(sortButton(/^ID/));

    expect(listedIds()).toEqual([
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
    expect(screen.getByRole('columnheader', { name: /^ID/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    const receivedHeader = screen.getByRole('columnheader', {
      name: /^Received/,
    });
    expect(receivedHeader).not.toHaveAttribute('aria-sort', 'ascending');
    expect(receivedHeader).not.toHaveAttribute('aria-sort', 'descending');

    await user.click(sortButton(/^ID/));

    expect(listedIds()).toEqual([
      '106',
      '105',
      '104',
      '103',
      '102',
      '101',
      '98',
      '97',
      '95',
    ]);
    expect(screen.getByRole('columnheader', { name: /^ID/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  // AC-5
  it('keeps files with a missing size or records inserted in the list, after the files that have a value, without breaking the numeric order of the others', async () => {
    const user = userEvent.setup();
    const files: FileRead[] = [
      createStagingFile(), // Id 104: size and records inserted missing
      createFailedFile(), // Id 102: size 201337, records inserted missing
      createFile(), // Id 101: size 350925, records inserted 26
      createSupersededFile(), // Id 98: size 298114, records inserted 25
      createFile({
        Id: 97,
        FileName: 'GLC Inflation daily data current month.xlsx',
        CurveFamily: 'Inflation',
        ReceivedAt: '2026-09-29 18:00:12',
        SizeBytes: '98304', // fewer digits: text comparison would misplace it
        RecordCount: 4,
        RecordsInserted: '4', // text comparison would put "4" after "26"
        Woid: '5e6f7a8b9c0d41e2f3a4b5c6d7e8f901',
        IsCurrent: false,
      }),
    ];
    mockGet.mockImplementation(serveFiles(files));

    renderFileLog();
    await waitForIds(5);

    await user.click(sortButton(/^Size/));
    expect(listedIds()).toEqual(['97', '102', '98', '101', '104']);

    await user.click(sortButton(/^Size/));
    expect(listedIds()).toEqual(['101', '98', '102', '97', '104']);

    await user.click(sortButton(/^Records inserted/));
    const byRecordsInserted = listedIds();
    expect(byRecordsInserted.slice(0, 3)).toEqual(['97', '98', '101']);
    expect([...byRecordsInserted.slice(3)].sort()).toEqual(['102', '104']);
  });
});
