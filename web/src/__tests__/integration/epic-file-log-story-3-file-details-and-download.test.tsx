/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic file-log, Story 3: file details and original download.
 *
 * Production contracts these tests define (implement to them):
 * - The File log page default export renders synchronously in jsdom (a server
 *   page that renders a client component is fine; do not make it async or read
 *   the `searchParams` page prop). The selected file is read from
 *   `useSearchParams().get('file')` (`?file=<Id>`), so the details card loads
 *   `GET /v1/files/{Id}` via `get` (through DataState) for that file.
 * - Details subtitle is a single element whose text is exactly
 *   "File log entry {Id} · {Status}" plus " · current" only when `IsCurrent`
 *   is true (BR3).
 * - Failed files show the `ExceptionNote` and the guidance line
 *   "Fix the source file or re-import once the Bank of England republishes it.";
 *   files whose Status is not Failed show neither, even if a note is present (BR5).
 * - "Download original" is a button that calls `downloadFile` from
 *   `@/lib/api/download` (`/v1/files/{Id}/original`). The live service sends NO
 *   Content-Disposition header on that endpoint (only application/octet-stream),
 *   so the file must be saved under the file's own `FileName` (e.g.
 *   "OIS daily data current month.xlsx") — never the endpoint's last segment
 *   ("original"). The service's own Content-Disposition name still wins when sent.
 *   Success shows the toast "Original file downloaded from the Backup folder."
 *   via `useToast()`.
 *   A 404 ServiceError shows "File not found" (not the generic description);
 *   any other failure shows a persistent `role="alert"` message carrying the
 *   error description and a "Retry" button that re-runs the download (BR6).
 *
 * Mocks: only the API boundary (`@/lib/api/client` `get` and `requestFromService`)
 * and Next navigation hooks. The real `downloadFile` runs; the saved filename is
 * observed where the browser saves it (the download anchor's `download` name).
 * Payloads come from the shared project-wide factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FileLogPage from '@/app/(app)/file-log/page';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider } from '@/contexts/ToastContext';
import { get, requestFromService } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createFailedFileDetail,
  createFileDetail,
  createSupersededFileDetail,
} from '@/mocks/data/file-detail';
import { createFileList } from '@/mocks/data/file-list';
import type { FileDetailRead } from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

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

const mockGet = get as ReturnType<typeof vi.fn>;
const mockRequestFromService = requestFromService as ReturnType<typeof vi.fn>;

/**
 * The original file exactly as the live service sends it: binary body,
 * application/octet-stream, and NO Content-Disposition header.
 */
function originalWithoutFilenameHeader(): Response {
  return new Response(new Blob(['xlsx-bytes']), {
    status: 200,
    headers: { 'content-type': 'application/octet-stream' },
  });
}

/** Names the browser was asked to save files under, in order. */
let savedNames: string[] = [];

const GUIDANCE =
  'Fix the source file or re-import once the Bank of England republishes it.';
const DOWNLOADED = 'Original file downloaded from the Backup folder.';

/** Matches the single element whose full text content equals `expected`. */
function elementWithText(expected: string) {
  return (_content: string, element: Element | null): boolean => {
    if (!element) return false;
    const own = element.textContent?.replace(/\s+/g, ' ').trim() === expected;
    const childMatches = Array.from(element.children).some(
      (child) => child.textContent?.replace(/\s+/g, ' ').trim() === expected,
    );
    return own && !childMatches;
  };
}

/** Serves the file list and the selected file's detail from the shared factories. */
function serveFile(detail: FileDetailRead) {
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    if (endpoint === '/v1/files') return Promise.resolve(createFileList());
    return Promise.reject(
      new ServiceError({
        status: 404,
        description: `Unexpected request in test: ${endpoint}`,
        retryable: true,
        kind: 'service-error',
      }),
    );
  });
}

function renderFileLog(fileId: number | undefined) {
  currentSearch = fileId === undefined ? '' : `file=${fileId}`;
  return render(
    <ToastProvider>
      <FileLogPage />
      <ToastContainer />
    </ToastProvider>,
  );
}

describe('Epic file-log, Story 3: file details and original download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
    savedNames = [];
    // jsdom has no object-URL support — supply inert stand-ins.
    URL.createObjectURL = () => 'blob:mock-download';
    URL.revokeObjectURL = () => undefined;
    // Record the name each file is saved under instead of navigating.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      if (this.download) savedNames.push(this.download);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC-2
  it('reads "File log entry {id} · {status}" and adds " · current" only when the service marks the file current', async () => {
    const current = createFileDetail();
    serveFile(current);
    const first = renderFileLog(current.Id);

    expect(
      await screen.findByText(
        elementWithText('File log entry 101 · Imported · current'),
      ),
    ).toBeInTheDocument();

    first.unmount();

    const superseded = createSupersededFileDetail();
    serveFile(superseded);
    renderFileLog(superseded.Id);

    expect(
      await screen.findByText(elementWithText('File log entry 98 · Imported')),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        elementWithText('File log entry 98 · Imported · current'),
      ),
    ).not.toBeInTheDocument();
  });

  // AC-3
  it('shows the exception note then the guidance line for a failed file, and neither for a file that did not fail', async () => {
    const failed = createFailedFileDetail();
    serveFile(failed);
    const first = renderFileLog(failed.Id);

    const note = await screen.findByText(/Row 12: invalid rate/);
    const guidance = screen.getByText(GUIDANCE);
    // The note comes before the guidance line.
    expect(
      note.compareDocumentPosition(guidance) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    first.unmount();

    // Status decides (BR5): an Imported file shows neither, even if a note is present.
    const imported = createFileDetail({
      ExceptionNote: 'Row 4: late delivery',
    });
    serveFile(imported);
    renderFileLog(imported.Id);

    expect(
      await screen.findByText(
        elementWithText('File log entry 101 · Imported · current'),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Row 4: late delivery/)).not.toBeInTheDocument();
    expect(screen.queryByText(GUIDANCE)).not.toBeInTheDocument();
  });

  // AC-6
  it('shows "File not found" when the original is missing, and a persistent error with Retry that then saves the file under its own name', async () => {
    const user = userEvent.setup();
    const detail = createFileDetail({
      FileName: 'OIS daily data current month.xlsx',
    });
    serveFile(detail);

    mockRequestFromService.mockRejectedValueOnce(
      new ServiceError({
        status: 404,
        description:
          'The data service could not complete the request (404 Not Found). The service said: File not found',
        retryable: true,
        kind: 'service-error',
      }),
    );

    const first = renderFileLog(detail.Id);

    await user.click(
      await screen.findByRole('button', { name: 'Download original' }),
    );

    expect(await screen.findByText(/^File not found\.?$/)).toBeInTheDocument();
    expect(
      screen.queryByText(/could not complete the request \(404 Not Found\)/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(DOWNLOADED)).not.toBeInTheDocument();
    expect(savedNames).toEqual([]);

    first.unmount();

    const serverFailure =
      'The data service could not complete the request (500 Internal Server Error).';
    mockRequestFromService
      .mockRejectedValueOnce(
        new ServiceError({
          status: 500,
          description: serverFailure,
          retryable: true,
          kind: 'service-error',
        }),
      )
      // The retry succeeds, but — like the live service — names no file.
      .mockResolvedValueOnce(originalWithoutFilenameHeader());

    renderFileLog(detail.Id);

    await user.click(
      await screen.findByRole('button', { name: 'Download original' }),
    );

    const retry = await screen.findByRole('button', { name: 'Retry' });
    const alert = retry.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert).toHaveTextContent(serverFailure);
    expect(screen.queryByText(/^File not found\.?$/)).not.toBeInTheDocument();

    await user.click(retry);

    const notifications = screen.getByRole('region', { name: 'Notifications' });
    expect(
      await within(notifications).findByText(DOWNLOADED),
    ).toBeInTheDocument();

    // With no filename header, the original is saved under the file's own name
    // (not the endpoint's last path segment, "original").
    expect(savedNames).toEqual(['OIS daily data current month.xlsx']);
  });
});
