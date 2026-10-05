/**
 * Story Metadata:
 * - Route: /file-log/imports/[woid]
 * - Target File: web/src/components/file-log/ImportTrace.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 6: the Import trace shows both processes,
 * and "Open workflow" opens the right run.
 *
 * Production contracts these tests define (implement to them):
 * - `ImportTrace` (web/src/components/file-log/ImportTrace.tsx) replaces the single
 *   "Workflow instance" section with TWO labelled sections (`<section
 *   aria-labelledby>` + heading, so each is role="region"), with exactly these names:
 *     "Staging run"   — built from `ImportRead.StagingProcessInstance` (the ImportPro
 *                       `ImportFile` run). Falls back to the legacy
 *                       `ImportRead.ProcessInstance` when the new field is absent.
 *     "Rate load run" — built from `ImportRead.RateLoadProcessInstance` (the
 *                       RateLoad `LoadYieldCurves` run). When that field is absent the
 *                       section reads exactly "Not started yet" and shows no run
 *                       fields and no "Open workflow" link.
 *   Each run section keeps the existing field rows (label in `<dt>`, value in the
 *   following `<dd>`): "Process", "Instance ID", "Status" (StatusChip), "Created",
 *   "Last executed", "Finished at" / "Faulted at" / "Cancelled at" (only when the
 *   service sends them), "Last activity".
 *   Each run section with a run has a link named "Open workflow" whose href is
 *   `/workflow-monitor?instance=<that run's ProcessInstanceId>&view=single&file=<File.Id>`
 *   (workflowMonitorSelectionPath(id, { single: true, fileId }) — the carried file
 *   id query param is named exactly `file`). Covered end-to-end by the Playwright spec.
 * - The "File log entry" section adds a "Stage" row (File.Stage) and, for Failed
 *   files only, a "Failed step" row (File.FailedStep), alongside the Status chip.
 * - `FileDetailCard` (web/src/components/file-log/FileDetailCard.tsx) replaces its
 *   single "Open workflow" link with two links styled as buttons (Shadcn
 *   `Button asChild` + `Link`, so role="link"):
 *     "Open staging run" — always offered; href
 *       `/workflow-monitor?instance=<file.Woid>&view=single&file=<file.Id>`
 *     "Open import run"  — offered ONLY when the file has a `WorkflowInstanceId`
 *       (RateLoad has started); href
 *       `/workflow-monitor?instance=<file.WorkflowInstanceId>&view=single&file=<file.Id>`
 *   The old "Open workflow" link is no longer offered in the file details.
 *
 * Mocks: only the API boundary (`@/lib/api/client` `get`) and Next navigation
 * hooks. Payloads come from the shared project-wide factories in `@/mocks/data/`.
 * Any request a test does not expect is answered with a 500.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FileDetailCard } from '@/components/file-log/FileDetailCard';
import { ImportTrace } from '@/components/file-log/ImportTrace';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createFailedFileDetail,
  createRateLoadFailedFileDetail,
} from '@/mocks/data/file-detail';
import {
  createImport,
  createRateLoadFailedImport,
  createStagingFailedImport,
} from '@/mocks/data/import';
import type { FileDetailRead, ImportRead } from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

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

const mockGet = get as ReturnType<typeof vi.fn>;

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

/** Serves one import trace at `GET /v1/imports/{File.Woid}` and renders it. */
function renderTrace(trace: ImportRead) {
  const woid = trace.File?.Woid ?? '';
  mockGet.mockImplementation((endpoint: string) =>
    endpoint === `/v1/imports/${woid}`
      ? Promise.resolve(trace)
      : unexpected(endpoint),
  );
  navigation.path = `/file-log/imports/${woid}`;
  return render(<ImportTrace woid={woid} />);
}

/** Serves one file's detail at `GET /v1/files/{Id}` and renders the detail card. */
function renderFileDetail(detail: FileDetailRead) {
  mockGet.mockImplementation((endpoint: string) =>
    endpoint === `/v1/files/${detail.Id}`
      ? Promise.resolve(detail)
      : unexpected(endpoint),
  );
  navigation.path = '/file-log';
  navigation.search = `file=${detail.Id}`;
  return render(
    <ToastProvider>
      <FileDetailCard fileId={detail.Id ?? 0} />
    </ToastProvider>,
  );
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

function parseHref(link: HTMLElement): URL {
  return new URL(link.getAttribute('href') ?? '', 'http://localhost');
}

describe('Epic workflow-monitor-and-api, Story 6: import trace shows both processes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.path = '/file-log';
    navigation.search = '';
  });

  // AC-1
  it('shows a staging run section and a rate load run section, or "Not started yet" when RateLoad has not run', async () => {
    // Imported file 101: both runs present.
    const first = renderTrace(createImport());

    const staging = await screen.findByRole('region', { name: 'Staging run' });
    expect(fieldValue(staging, 'Process')).toHaveTextContent('ImportFile');
    expect(fieldValue(staging, 'Instance ID')).toHaveTextContent(
      '0d41a44498814111bcce69d60f7a823a',
    );
    expect(fieldValue(staging, 'Status')).toHaveTextContent('Finished');
    expect(fieldValue(staging, 'Created')).toHaveTextContent(
      '2026-09-30 18:02:11',
    );
    expect(fieldValue(staging, 'Last executed')).toHaveTextContent(
      '2026-09-30 18:02:19',
    );
    expect(fieldValue(staging, 'Finished at')).toHaveTextContent(
      '2026-09-30 18:02:19',
    );
    expect(fieldValue(staging, 'Last activity')).toHaveTextContent(
      'PublishCurves',
    );

    const rateLoad = screen.getByRole('region', { name: 'Rate load run' });
    expect(fieldValue(rateLoad, 'Process')).toHaveTextContent(
      'LoadYieldCurves',
    );
    expect(fieldValue(rateLoad, 'Instance ID')).toHaveTextContent(
      '6645057045ca4ce59a9827c6f5138246',
    );
    expect(fieldValue(rateLoad, 'Status')).toHaveTextContent('Finished');
    expect(fieldValue(rateLoad, 'Created')).toHaveTextContent(
      '2026-09-30 18:02:20',
    );
    expect(fieldValue(rateLoad, 'Last executed')).toHaveTextContent(
      '2026-09-30 18:02:31',
    );
    expect(fieldValue(rateLoad, 'Finished at')).toHaveTextContent(
      '2026-09-30 18:02:31',
    );
    expect(fieldValue(rateLoad, 'Last activity')).toHaveTextContent('Complete');
    expect(
      within(rateLoad).queryByText('Not started yet'),
    ).not.toBeInTheDocument();

    // The single legacy section is gone.
    expect(
      screen.queryByRole('region', { name: /workflow instance/i }),
    ).not.toBeInTheDocument();

    first.unmount();

    // ImportPro-failed file 102: staging run Faulted, RateLoad never started.
    renderTrace(createStagingFailedImport());

    const failedStaging = await screen.findByRole('region', {
      name: 'Staging run',
    });
    expect(fieldValue(failedStaging, 'Instance ID')).toHaveTextContent(
      '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    );
    expect(fieldValue(failedStaging, 'Status')).toHaveTextContent('Faulted');
    expect(fieldValue(failedStaging, 'Faulted at')).toHaveTextContent(
      '2026-09-30 18:05:44',
    );
    expect(
      within(failedStaging).queryByText('Finished at', { selector: 'dt' }),
    ).not.toBeInTheDocument();

    const notStarted = screen.getByRole('region', { name: 'Rate load run' });
    expect(within(notStarted).getByText('Not started yet')).toBeInTheDocument();
    expect(
      within(notStarted).queryByText('Instance ID', { selector: 'dt' }),
    ).not.toBeInTheDocument();
    expect(
      within(notStarted).queryByRole('link', { name: 'Open workflow' }),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('shows the file status, Stage and, for a Failed file, the failed step in the File log entry section', async () => {
    // RateLoad-failed file 106: Failed, Stage RateLoad, failed at Validate.
    const first = renderTrace(createRateLoadFailedImport());

    const failedEntry = await screen.findByRole('region', {
      name: /file log entry/i,
    });
    expect(fieldValue(failedEntry, 'Status')).toHaveTextContent('Failed');
    expect(fieldValue(failedEntry, 'Stage')).toHaveTextContent('RateLoad');
    expect(fieldValue(failedEntry, 'Failed step')).toHaveTextContent(
      'Validate',
    );

    first.unmount();

    // Imported file 101: Stage shown, no failed step.
    renderTrace(createImport());

    const importedEntry = await screen.findByRole('region', {
      name: /file log entry/i,
    });
    expect(fieldValue(importedEntry, 'Status')).toHaveTextContent('Imported');
    expect(fieldValue(importedEntry, 'Stage')).toHaveTextContent('RateLoad');
    expect(
      within(importedEntry).queryByText('Failed step', { selector: 'dt' }),
    ).not.toBeInTheDocument();
  });

  // AC-5
  it('offers "Open staging run" for every file and "Open import run" only once RateLoad has started', async () => {
    // RateLoad-failed file 106: has a WorkflowInstanceId, so both are offered.
    const first = renderFileDetail(createRateLoadFailedFileDetail());

    const stagingLink = parseHref(
      await screen.findByRole('link', { name: 'Open staging run' }),
    );
    expect(stagingLink.pathname).toBe('/workflow-monitor');
    expect(stagingLink.searchParams.get('instance')).toBe(
      'a7b8c9d0e1f24a3b8c4d5e6f7a8b9c0d',
    );
    expect(stagingLink.searchParams.get('view')).toBe('single');
    expect(stagingLink.searchParams.get('file')).toBe('106');

    const importLink = parseHref(
      screen.getByRole('link', { name: 'Open import run' }),
    );
    expect(importLink.pathname).toBe('/workflow-monitor');
    expect(importLink.searchParams.get('instance')).toBe(
      'b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e',
    );
    expect(importLink.searchParams.get('view')).toBe('single');
    expect(importLink.searchParams.get('file')).toBe('106');

    expect(
      screen.queryByRole('link', { name: 'Open workflow' }),
    ).not.toBeInTheDocument();

    first.unmount();

    // ImportPro-failed file 102: no WorkflowInstanceId, so only the staging run.
    renderFileDetail(createFailedFileDetail());

    const failedStagingLink = parseHref(
      await screen.findByRole('link', { name: 'Open staging run' }),
    );
    expect(failedStagingLink.searchParams.get('instance')).toBe(
      '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    );
    expect(failedStagingLink.searchParams.get('view')).toBe('single');
    expect(failedStagingLink.searchParams.get('file')).toBe('102');
    expect(
      screen.queryByRole('link', { name: 'Open import run' }),
    ).not.toBeInTheDocument();
  });
});
