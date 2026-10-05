/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/file-log/FileDetailCard.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 3: move between a file and its run.
 *
 * Production contracts these tests define (implement to them):
 * - `FileDetailCard` (File log file detail panel) gains an "Open workflow" link
 *   (secondary button rendered as a link, workflow icon) whose href is
 *   `/workflow-monitor?instance=<WorkflowInstanceId>`. It is NOT offered when the
 *   file has no `WorkflowInstanceId` (absent or blank) (R7, BR3).
 * - The Workflow monitor page default export renders synchronously in jsdom and
 *   reads the selected run from `useSearchParams().get('instance')`. The selected
 *   run view offers an "Open file log entry" button that resolves the run's
 *   `ContextId` (the WOID) via `getImport` (`GET /v1/imports/{Woid}`) to the
 *   file's Id and navigates to `/file-log?file=<Id>`. When that lookup is a 404,
 *   choosing it shows "Import not found" with a link back into the Workflow
 *   monitor (`/workflow-monitor...`), never the raw service error (BR3).
 *
 * Mocks: only the API boundary (`@/lib/api/client` `get`) and Next navigation
 * hooks. Payloads come from the shared project-wide factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkflowMonitorPage from '@/app/(app)/workflow-monitor/page';
import { FileDetailCard } from '@/components/file-log/FileDetailCard';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createExecutionLogList } from '@/mocks/data/execution-log';
import { createFailedFileDetail } from '@/mocks/data/file-detail';
import { IMPORT_NOT_FOUND } from '@/mocks/data/message';
import { createProcessInstanceList } from '@/mocks/data/process-instance';
import { createCancelledProcessInstanceDetail } from '@/mocks/data/process-instance-detail';
import type { FileDetailRead } from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

let currentPath = '/workflow-monitor';
let currentSearch = '';
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

const mockGet = get as ReturnType<typeof vi.fn>;

const IMPORT_404_DESCRIPTION =
  'The data service could not complete the request (404 Not Found). The service said: Import not found';

function notFound(description: string): ServiceError {
  return new ServiceError({
    status: 404,
    description,
    retryable: true,
    kind: 'service-error',
  });
}

/** Serves one file's detail at `GET /v1/files/{Id}`. */
function serveFileDetail(detail: FileDetailRead) {
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    return Promise.reject(notFound(`Unexpected request in test: ${endpoint}`));
  });
}

function renderFileDetail(detail: FileDetailRead) {
  currentPath = '/file-log';
  currentSearch = `file=${detail.Id}`;
  return render(
    <ToastProvider>
      <FileDetailCard fileId={detail.Id ?? 0} />
    </ToastProvider>,
  );
}

describe('Epic workflow-monitor-and-api, Story 3: move between a file and its run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPath = '/workflow-monitor';
    currentSearch = '';
  });

  // AC-4
  it('offers "Open workflow" only for a file that has a workflow instance', async () => {
    // A file with a run links straight to that run in the Workflow monitor.
    const linked = createFailedFileDetail();
    serveFileDetail(linked);
    const first = renderFileDetail(linked);

    const openWorkflow = await screen.findByRole('link', {
      name: 'Open workflow',
    });
    expect(openWorkflow).toHaveAttribute(
      'href',
      '/workflow-monitor?instance=b7c8d9e0f1a24b3c8d9e0f1a2b3c4d5e',
    );

    first.unmount();

    // The same file with no workflow instance offers no such link.
    const unlinked = createFailedFileDetail();
    delete unlinked.WorkflowInstanceId;
    serveFileDetail(unlinked);
    renderFileDetail(unlinked);

    expect(
      await screen.findByRole('link', { name: 'Trace import' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Open workflow' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open workflow' }),
    ).not.toBeInTheDocument();
  });

  // AC-5
  it('shows "Import not found" with a route back when the run\'s file cannot be found', async () => {
    const user = userEvent.setup();
    // The Cancelled run's WOID matches no import.
    const run = createCancelledProcessInstanceDetail();
    const runId = run.ProcessInstanceId ?? '';

    mockGet.mockImplementation((endpoint: string) => {
      if (endpoint === '/v1/process-instances') {
        return Promise.resolve(createProcessInstanceList());
      }
      if (endpoint === `/v1/process-instances/${runId}`) {
        return Promise.resolve(run);
      }
      if (endpoint === `/v1/process-instances/${runId}/execution-logs`) {
        return Promise.resolve(createExecutionLogList());
      }
      if (endpoint.startsWith('/v1/imports/')) {
        return Promise.reject(notFound(IMPORT_404_DESCRIPTION));
      }
      return Promise.reject(
        notFound(`Unexpected request in test: ${endpoint}`),
      );
    });

    currentPath = '/workflow-monitor';
    currentSearch = `instance=${runId}`;
    render(
      <ToastProvider>
        <WorkflowMonitorPage />
      </ToastProvider>,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Open file log entry' }),
    );

    const message = await screen.findByText(IMPORT_NOT_FOUND);
    expect(message).toBeInTheDocument();

    const routeBack = screen.getByRole('link', { name: /back/i });
    expect(routeBack.getAttribute('href')).toMatch(/^\/workflow-monitor/);

    // Never the raw service error.
    expect(
      screen.queryByText(/could not complete the request \(404 Not Found\)/),
    ).not.toBeInTheDocument();
  });
});
