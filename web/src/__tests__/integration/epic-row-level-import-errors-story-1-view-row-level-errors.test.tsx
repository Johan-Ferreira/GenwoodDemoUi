/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic row-level-import-errors, Story 1: view a failed file's row-level errors.
 *
 * Production contracts these tests define (implement to them):
 * - The File log page reads the selected file from `useSearchParams().get('file')`
 *   (`?file=<Id>`); the details card loads `GET /v1/files/{Id}` (existing).
 * - A Failed file's details show a "View row-level errors" button in the same
 *   action group as "Download original" and "Trace import". It is absent for every
 *   other status, even when the file has a Woid (BR5).
 * - Choosing it opens, inline in the details card, a section exposed as
 *   role="region" whose accessible name matches /row-level errors/i (e.g.
 *   `<section aria-labelledby>` with a "Row-level errors" heading). Everything
 *   below — loading skeleton, grid, empty state, not-found and error — renders
 *   inside that region.
 * - The rows load from `GET /v1/imports/{Woid}/messages` via `getImportMessages`
 *   (endpoints.ts → `get`) using the file's FULL Woid (BR3), through
 *   `DataState` + `lookUp`.
 * - The grid is a table with sortable column headers (`SortableTableHead`): Row
 *   number, Observation date, Message. The active column carries `aria-sort`
 *   (direction not conveyed by colour alone). First choice sorts ascending, the
 *   second descending. Default order is row number ascending.
 * - Empty list → "No failed rows." replaces the grid. 404 → "Import not found"
 *   with a "Back to the file list" link to /file-log. Other failures → DataState's
 *   persistent role="alert" with the error description and a Retry button.
 * - Choosing a file in the list scrolls its loaded details into view
 *   (`scrollIntoView` on the details region) once; deep links and later
 *   re-renders do not scroll. Opening row-level errors scrolls its region into
 *   view; closing it does not.
 *
 * Mocks: only the API boundary (`@/lib/api/client`) and Next navigation hooks.
 * Payloads come from the shared project-wide factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createFailedFileDetail,
  createFileDetail,
} from '@/mocks/data/file-detail';
import { createFileList } from '@/mocks/data/file-list';
import {
  createImportMessage,
  createImportMessageList,
} from '@/mocks/data/import-message';
import type {
  FileDetailRead,
  ImportMessageReadList,
} from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

let currentSearch = '';
/** Selecting a row pushes `?file=<Id>`; mirror it so a re-render sees it. */
const pushUrl = vi.fn((url: string) => {
  currentSearch = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushUrl,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/file-log',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const mockGet = get as ReturnType<typeof vi.fn>;

const VIEW_ACTION = 'View row-level errors';

type MessagesResponse =
  | { kind: 'ok'; body: ImportMessageReadList }
  | { kind: 'pending' }
  | { kind: 'error'; error: ServiceError };

function serviceError(status: number, description: string): ServiceError {
  return new ServiceError({
    status,
    description,
    retryable: true,
    kind: 'service-error',
  });
}

/**
 * Serves the file list, the selected file's detail and — only at the file's full
 * Woid — its import messages. `messages` is consumed one response per call; the
 * last entry repeats.
 */
function serve(detail: FileDetailRead, messages: MessagesResponse[] = []) {
  let call = 0;
  const messagesPath = `/v1/imports/${detail.Woid}/messages`;
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    if (endpoint === '/v1/files') return Promise.resolve(createFileList());
    if (endpoint === messagesPath && messages.length > 0) {
      const response = messages[Math.min(call, messages.length - 1)];
      call += 1;
      if (response.kind === 'ok') return Promise.resolve(response.body);
      if (response.kind === 'error') return Promise.reject(response.error);
      return new Promise<never>(() => undefined);
    }
    return Promise.reject(
      serviceError(404, `Unexpected request in test: ${endpoint}`),
    );
  });
}

function fileLogTree() {
  return (
    <ToastProvider>
      <FileLogPage />
      <ToastContainer />
    </ToastProvider>
  );
}

function renderFileLog(fileId: number | undefined) {
  currentSearch = fileId === undefined ? '' : `file=${fileId}`;
  return render(fileLogTree());
}

/** Opens the row-level errors of the rendered Failed file and returns the region. */
async function openRowLevelErrors(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: VIEW_ACTION }));
  return screen.findByRole('region', { name: /row-level errors/i });
}

/** The messages of the grid's body rows, top to bottom. */
function messageOrder(region: HTMLElement, messages: string[]): string[] {
  const table = within(region).getByRole('table');
  return within(table)
    .getAllByRole('row')
    .map((row) =>
      messages.find((message) => row.textContent?.includes(message)),
    )
    .filter((message): message is string => message !== undefined);
}

const failedFile = createFailedFileDetail();

describe('Epic row-level-import-errors, Story 1: view row-level errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  // AC-1
  it('offers "View row-level errors" beside Download original and Trace import for a Failed file, and not for an Imported file with a Woid', async () => {
    serve(failedFile);
    const first = renderFileLog(failedFile.Id);

    const view = await screen.findByRole('button', { name: VIEW_ACTION });
    const actions = view.parentElement;
    expect(actions).not.toBeNull();
    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Download original' }),
    );
    expect(actions).toContainElement(
      screen.getByRole('link', { name: 'Trace import' }),
    );

    first.unmount();

    const imported = createFileDetail();
    expect(imported.Woid).toBeTruthy();
    serve(imported);
    renderFileLog(imported.Id);

    expect(
      await screen.findByRole('button', { name: 'Download original' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Trace import' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: VIEW_ACTION }),
    ).not.toBeInTheDocument();
  });

  // AC-3
  it('sorts a column ascending then descending, marks the active column with aria-sort, and keeps rows without a date when sorting by date', async () => {
    const user = userEvent.setup();
    const early = 'Tenor "13X" is not a recognised tenor';
    const late = 'Rate value is not a valid number';
    const undated = 'Observation date is missing';
    const messages = [early, late, undated];
    serve(failedFile, [
      {
        kind: 'ok',
        body: createImportMessageList([
          createImportMessage({
            SourceRowNumber: 3,
            ObservationDate: '2026-09-30',
            Message: early,
          }),
          createImportMessage({
            SourceRowNumber: 7,
            ObservationDate: '2026-09-28',
            Message: late,
          }),
          { SourceRowNumber: 12, Message: undated },
        ]),
      },
    ]);
    renderFileLog(failedFile.Id);

    const region = await openRowLevelErrors(user);
    await within(region).findByRole('table');

    const messageHeader = within(region).getByRole('columnheader', {
      name: /^message/i,
    });
    await user.click(
      within(messageHeader).getByRole('button', { name: /^message/i }),
    );
    expect(messageHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(messageOrder(region, messages)).toEqual([undated, late, early]);

    await user.click(
      within(messageHeader).getByRole('button', { name: /^message/i }),
    );
    expect(messageHeader).toHaveAttribute('aria-sort', 'descending');
    expect(messageOrder(region, messages)).toEqual([early, late, undated]);

    const dateHeader = within(region).getByRole('columnheader', {
      name: /observation date/i,
    });
    await user.click(
      within(dateHeader).getByRole('button', { name: /observation date/i }),
    );
    expect(dateHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(messageHeader).not.toHaveAttribute('aria-sort');

    const byDate = messageOrder(region, messages);
    // The undated row stays in the grid; the dated rows are in date order.
    expect([...byDate].sort()).toEqual([...messages].sort());
    expect(byDate.filter((message) => message !== undated)).toEqual([
      late,
      early,
    ]);
  });

  // AC-4
  it('shows a skeleton while the failed rows load, and "No failed rows." instead of the grid for an empty list', async () => {
    const user = userEvent.setup();
    serve(failedFile, [{ kind: 'pending' }]);
    const first = renderFileLog(failedFile.Id);

    const loadingRegion = await openRowLevelErrors(user);
    expect(
      await within(loadingRegion).findByRole('status', { name: 'Loading' }),
    ).toBeInTheDocument();
    expect(within(loadingRegion).queryByRole('table')).not.toBeInTheDocument();

    first.unmount();

    serve(failedFile, [{ kind: 'ok', body: createImportMessageList([]) }]);
    renderFileLog(failedFile.Id);

    const emptyRegion = await openRowLevelErrors(user);
    expect(
      await within(emptyRegion).findByText('No failed rows.'),
    ).toBeInTheDocument();
    expect(within(emptyRegion).queryByRole('table')).not.toBeInTheDocument();
  });

  // AC-5
  it('shows "Import not found" with a link back to the file list on a 404, and a persistent error with Retry that reloads the rows on any other failure', async () => {
    const user = userEvent.setup();
    serve(failedFile, [
      { kind: 'error', error: serviceError(404, 'Import not found') },
    ]);
    const first = renderFileLog(failedFile.Id);

    const notFoundRegion = await openRowLevelErrors(user);
    expect(
      await within(notFoundRegion).findByText('Import not found'),
    ).toBeInTheDocument();
    expect(
      within(notFoundRegion).getByRole('link', {
        name: 'Back to the file list',
      }),
    ).toHaveAttribute('href', '/file-log');
    expect(within(notFoundRegion).queryByRole('alert')).not.toBeInTheDocument();

    first.unmount();

    const failure =
      'The data service could not complete the request (500 Internal Server Error).';
    const rowMessage = 'Tenor "13X" is not a recognised tenor';
    serve(failedFile, [
      { kind: 'error', error: serviceError(500, failure) },
      { kind: 'ok', body: createImportMessageList() },
    ]);
    renderFileLog(failedFile.Id);

    const errorRegion = await openRowLevelErrors(user);
    const alert = await within(errorRegion).findByRole('alert');
    expect(alert).toHaveTextContent(failure);
    expect(
      within(errorRegion).queryByText('Import not found'),
    ).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    const table = await within(errorRegion).findByRole('table');
    expect(within(table).getByText(rowMessage)).toBeInTheDocument();
    expect(within(errorRegion).queryByRole('alert')).not.toBeInTheDocument();
  });

  // Manual-test change request: what opens below scrolls into view.
  describe('scrolling what opens into view', () => {
    // jsdom has no scrollIntoView; record which element asked to be shown.
    const scrollIntoView = vi.fn();
    beforeAll(() => {
      Element.prototype.scrollIntoView = scrollIntoView;
    });
    afterAll(() => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });

    it('scrolls a chosen file’s details into view, then the row-level errors when opened, but not on a re-render, on closing, or for a deep link', async () => {
      const user = userEvent.setup();
      serve(failedFile, [{ kind: 'ok', body: createImportMessageList() }]);
      const view = renderFileLog(undefined);

      await user.click(
        await screen.findByRole('row', {
          name: new RegExp(`^${failedFile.Id}\\b`),
        }),
      );
      view.rerender(fileLogTree());

      const details = await screen.findByRole('region', {
        name: failedFile.FileName ?? '',
      });
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
      expect(scrollIntoView.mock.contexts[0]).toBe(details);

      // A later render of the same selection (e.g. a background re-read) stays put.
      view.rerender(fileLogTree());
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      const region = await openRowLevelErrors(user);
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
      expect(scrollIntoView.mock.contexts[1]).toBe(region);

      await user.click(
        screen.getByRole('button', { name: 'Hide row-level errors' }),
      );
      expect(scrollIntoView).toHaveBeenCalledTimes(2);

      view.unmount();
      scrollIntoView.mockClear();
      renderFileLog(failedFile.Id);
      expect(
        await screen.findByRole('region', { name: failedFile.FileName ?? '' }),
      ).toBeInTheDocument();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
