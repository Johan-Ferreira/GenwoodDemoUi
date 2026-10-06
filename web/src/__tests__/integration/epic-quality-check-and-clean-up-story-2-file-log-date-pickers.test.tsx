/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic quality-check-and-clean-up, Story 2: date pickers on the File log
 * received-date filters (vitest-tagged ACs: 1, 3).
 *
 * Production contracts these tests define (implement to them):
 * - "Received from" / "Received to" stay typeable text inputs labelled exactly so,
 *   each with a calendar button named "Choose received-from date" /
 *   "Choose received-to date" (FileLogFilters.tsx DateFilter, same pattern as
 *   curve-data/ValuationDateField.tsx, no min/max bounds).
 * - The calendar is a dialog with an accessible name, built from the shadcn
 *   Popover + Calendar primitives. Its month grid is labelled "<Month> <YYYY>"
 *   (react-day-picker's default grid label).
 * - With no date chosen the calendar opens on today's month (BR3); with a date
 *   chosen it opens on that date's month.
 * - Typed entry, Enter/blur commit and the "Enter the date as YYYY-MM-DD." message
 *   are unchanged (NFR-4); an invalid entry sends no request.
 *
 * Only the API client is mocked. These tests WILL FAIL until implemented (TDD red).
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { createFiles } from '@/mocks/data/file';
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

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

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

/** The ID column (the first column) of each data row, top to bottom. */
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

/** Click a calendar button and return the calendar dialog that opens. */
async function openCalendar(
  user: ReturnType<typeof userEvent.setup>,
  buttonName: string,
): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: buttonName }));
  return screen.findByRole('dialog', { name: /calendar/i });
}

describe('Epic quality-check-and-clean-up, Story 2: File log date pickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it("opens the received-date calendar on the current month when empty, and on the chosen date's month once a date is set", async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveFiles(createFiles()));

    renderFileLog();
    await waitForIds(9);

    // Empty "Received from": opens on today's month (BR3).
    const fromCalendar = await openCalendar(user, 'Choose received-from date');
    expect(
      within(fromCalendar).getByRole('grid', {
        name: MONTH_LABEL.format(new Date()),
      }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // "Received to" with a date already chosen: opens on that date's month.
    const receivedTo = screen.getByRole('textbox', { name: 'Received to' });
    await user.type(receivedTo, '2025-03-14{Enter}');

    const toCalendar = await openCalendar(user, 'Choose received-to date');
    expect(
      within(toCalendar).getByRole('grid', { name: 'March 2025' }),
    ).toBeInTheDocument();
  });

  // AC-3
  it('still filters on a typed date committed with Enter, and an invalid typed date shows the date message without refiltering', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveFiles(createFiles()));

    renderFileLog();
    await waitForIds(9);

    // Typed "Received to" narrows to files received on or before 28 Sep 2026.
    await user.type(
      screen.getByRole('textbox', { name: 'Received to' }),
      '2026-09-28{Enter}',
    );
    await waitFor(() => {
      expect(listedIds()).toEqual(['95']);
    });

    // An invalid typed "Received from" shows the message and leaves the list as is.
    await user.type(
      screen.getByRole('textbox', { name: 'Received from' }),
      '28/09/2026{Enter}',
    );
    expect(
      await screen.findByText('Enter the date as YYYY-MM-DD.'),
    ).toBeInTheDocument();

    // Give any (wrongly) dispatched request time to settle before checking the list.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(listedIds()).toEqual(['95']);
    expect(
      screen.queryByText(/could not complete the request/i),
    ).not.toBeInTheDocument();
  });
});
