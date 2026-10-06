/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
 * - Page Action: modify_existing
 *
 * Epic quality-check-and-clean-up, Story 1: Plain-language identifiers on
 * Overview, File log and Import trace.
 * Role: Demo presenter (single role; no role-gating here).
 *
 * Production contracts these tests define (implement to them):
 * - The shared FileTable (web/src/components/files/FileTable.tsx), used by the
 *   File log and the Overview "Recent loads" card, has exactly these column
 *   headers, in order: "#", "File", "Curve family", "Received",
 *   "Records inserted", "Status". There is no "WOID" column and no shortened
 *   WOID value in any row (R1, R3).
 * - The file detail card (FileDetailCard.tsx `detailFields()`) labels the file's
 *   Woid "Staging instance ID" and its WorkflowInstanceId "Rate load instance ID",
 *   with unchanged (full) values. The labels "WOID" and "Workflow instance" are
 *   no longer shown (R4, BR2).
 * - The Import trace (ImportTrace.tsx `fileFields()`) "File log entry" section
 *   has no "WOID" row; the "Staging run" and "Rate load run" sections keep their
 *   "Instance ID" rows (R10).
 * - The Import trace page subtitle reads "The file log entry, workflow instance
 *   and published data for {file name}." once the trace loads, and ends at
 *   "...published data." when no file name is known (manual-test fix).
 *
 * AC-4 (links keep their targets) is covered by this story's Playwright spec;
 * AC-5 (column spacing, no sideways scroll) is a manual visual check.
 *
 * Only the API boundary (`@/lib/api/client`) and the Next navigation hooks are
 * mocked. Payloads come only from the project-wide factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ImportTracePage from '@/app/(app)/file-log/imports/[woid]/page';
import FileLogPage from '@/app/(app)/file-log/page';
import OverviewPage from '@/app/(app)/overview/page';
import { ImportTrace } from '@/components/file-log/ImportTrace';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createFiles } from '@/mocks/data/file';
import { createFileDetail } from '@/mocks/data/file-detail';
import { createFileList } from '@/mocks/data/file-list';
import { createImport } from '@/mocks/data/import';
import { createOverview } from '@/mocks/data/overview';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

const navigation = vi.hoisted(() => ({
  path: '/file-log',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => navigation.path,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const TABLE_COLUMNS = [
  '#',
  'File',
  'Curve family',
  'Received',
  'Records inserted',
  'Status',
];

/** Canonical file 101: its ImportFile (staging) run id and its RateLoad run id. */
const STAGING_INSTANCE_ID = '0d41a44498814111bcce69d60f7a823a';
const RATE_LOAD_INSTANCE_ID = '6645057045ca4ce59a9827c6f5138246';
const SHORT_WOID = '0d41a444';

function unexpected(endpoint: string): Promise<never> {
  return Promise.reject(
    new ServiceError({
      status: 500,
      description: `Unexpected request in test: ${endpoint}`,
      retryable: true,
      kind: 'service-error',
    }),
  );
}

/** Serves the file list and the canonical file 101 detail. */
function serveFileLog() {
  const detail = createFileDetail();
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === '/v1/files') {
      return Promise.resolve(createFileList({ Files: createFiles() }));
    }
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    return unexpected(endpoint);
  });
  return detail;
}

function renderFileLog(fileId?: number) {
  navigation.path = '/file-log';
  navigation.search = fileId === undefined ? '' : `file=${fileId}`;
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

/** The `<dd>` value shown next to the `<dt>` labelled `label` inside `region`. */
function fieldValue(region: HTMLElement, label: string): HTMLElement {
  const term = within(region).getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`No value shown next to "${label}"`);
  }
  return value;
}

describe('Epic quality-check-and-clean-up, Story 1: plain-language identifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.path = '/file-log';
    navigation.search = '';
  });

  // AC-1
  it('shows #, File, Curve family, Received, Records inserted and Status with no WOID column on the File log and the Overview Recent loads', async () => {
    serveFileLog();
    const fileLog = renderFileLog();

    const fileTable = await screen.findByRole('table');
    expect(headerLabels(fileTable)).toEqual(TABLE_COLUMNS);
    const importedRow = within(fileTable).getByRole('row', {
      name: /^101\b/,
    });
    expect(
      within(importedRow).getByText(
        'GLC Nominal daily data current month.xlsx',
      ),
    ).toBeInTheDocument();
    expect(within(importedRow).queryByText(SHORT_WOID)).not.toBeInTheDocument();

    fileLog.unmount();

    navigation.path = '/overview';
    mockGet.mockResolvedValue(createOverview({ RecentFiles: createFiles() }));
    render(
      <ToastProvider>
        <OverviewPage />
      </ToastProvider>,
    );

    const recent = await screen.findByRole('region', { name: 'Recent loads' });
    const recentTable = within(recent).getByRole('table');
    expect(headerLabels(recentTable)).toEqual(TABLE_COLUMNS);
    expect(
      within(recentTable).queryByRole('columnheader', { name: /WOID/ }),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('labels the file\'s identifiers "Staging instance ID" and "Rate load instance ID" with unchanged values, and no longer shows "WOID" or "Workflow instance"', async () => {
    const detail = serveFileLog();

    renderFileLog(detail.Id);

    const card = await screen.findByRole('region', {
      name: 'GLC Nominal daily data current month.xlsx',
    });

    expect(fieldValue(card, 'Staging instance ID')).toHaveTextContent(
      STAGING_INSTANCE_ID,
    );
    expect(fieldValue(card, 'Rate load instance ID')).toHaveTextContent(
      RATE_LOAD_INSTANCE_ID,
    );
    expect(
      within(card).queryByText('WOID', { selector: 'dt' }),
    ).not.toBeInTheDocument();
    expect(
      within(card).queryByText('Workflow instance', { selector: 'dt' }),
    ).not.toBeInTheDocument();
  });

  // AC-3
  it('drops the WOID row from the Import trace File log entry while the Staging run and Rate load run keep their Instance IDs', async () => {
    const trace = createImport();
    const woid = trace.File?.Woid ?? '';
    mockGet.mockImplementation((endpoint: string) =>
      endpoint === `/v1/imports/${woid}`
        ? Promise.resolve(trace)
        : unexpected(endpoint),
    );
    navigation.path = `/file-log/imports/${woid}`;

    render(<ImportTrace woid={woid} />);

    const fileEntry = await screen.findByRole('region', {
      name: 'File log entry',
    });
    expect(fieldValue(fileEntry, 'File name')).toHaveTextContent(
      'GLC Nominal daily data current month.xlsx',
    );
    expect(
      within(fileEntry).queryByText('WOID', { selector: 'dt' }),
    ).not.toBeInTheDocument();
    expect(
      within(fileEntry).queryByText(STAGING_INSTANCE_ID),
    ).not.toBeInTheDocument();

    const staging = screen.getByRole('region', { name: 'Staging run' });
    expect(fieldValue(staging, 'Instance ID')).toHaveTextContent(
      STAGING_INSTANCE_ID,
    );
    const rateLoad = screen.getByRole('region', { name: 'Rate load run' });
    expect(fieldValue(rateLoad, 'Instance ID')).toHaveTextContent(
      RATE_LOAD_INSTANCE_ID,
    );
  });

  // Manual-test fix: the Import trace subtitle names the file, not the WOID.
  it('names the file in the Import trace subtitle instead of the WOID', async () => {
    const trace = createImport();
    const woid = trace.File?.Woid ?? '';
    mockGet.mockImplementation((endpoint: string) =>
      endpoint === `/v1/imports/${woid}`
        ? Promise.resolve(trace)
        : unexpected(endpoint),
    );
    navigation.path = `/file-log/imports/${woid}`;

    render(await ImportTracePage({ params: Promise.resolve({ woid }) }));

    const subtitle = await screen.findByText(
      'The file log entry, workflow instance and published data for GLC Nominal daily data current month.xlsx.',
    );
    expect(subtitle).not.toHaveTextContent(woid);
  });

  it('ends the Import trace subtitle without a file name when the import is not found', async () => {
    const woid = 'no-such-import';
    mockGet.mockImplementation(() =>
      Promise.reject(
        new ServiceError({
          status: 404,
          description: 'Not found.',
          retryable: false,
          kind: 'service-error',
        }),
      ),
    );
    navigation.path = `/file-log/imports/${woid}`;

    render(await ImportTracePage({ params: Promise.resolve({ woid }) }));

    expect(await screen.findByText('Import not found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The file log entry, workflow instance and published data.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/ for /)).not.toBeInTheDocument();
  });
});
