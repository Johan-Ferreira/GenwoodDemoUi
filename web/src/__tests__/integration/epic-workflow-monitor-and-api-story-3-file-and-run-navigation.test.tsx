/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/file-log/FileDetailCard.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 3: move between a file and its run.
 *
 * Production contracts these tests define (implement to them). See the story's
 * "Contract correction": the live service returns NO ContextId; a file's Woid IS
 * the ProcessInstanceId of its ImportFile run; the file's WorkflowInstanceId
 * points at a later LoadYieldCurves run that has no link back to a file.
 * - `FileDetailCard` (File log file detail panel) offers an "Open workflow" link
 *   for EVERY file (Imported, Failed, Processing — with or without a
 *   WorkflowInstanceId). Its href is
 *   `/workflow-monitor?instance=<file.Woid>&view=single` (R7, BR3).
 * - The Workflow monitor page default export reads the selected run from
 *   `useSearchParams().get('instance')`. The selected run view offers an
 *   "Open file log entry" BUTTON that resolves the run's own ProcessInstanceId as
 *   the import WOID via `GET /v1/imports/{ProcessInstanceId}`, then navigates
 *   (`router.push`) to `/file-log?file=<File.Id>`. When that lookup is a 404 (for
 *   example a LoadYieldCurves run), it shows "Import not found" with exactly one
 *   "back" link into the Workflow monitor, never the raw service error (BR3).
 *
 * Mocks: only the API boundary (`@/lib/api/client` `get`) and Next navigation
 * hooks. Payloads come from the shared project-wide factories in `@/mocks/data/`.
 * Any request a test does not expect is answered with a 500, so a wrong lookup
 * key surfaces as a raw error rather than a false "not found".
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
import {
  createExecutionLogList,
  createLoadYieldCurvesExecutionLogs,
} from '@/mocks/data/execution-log';
import {
  createFailedFileDetail,
  createFileDetail,
} from '@/mocks/data/file-detail';
import { createImport } from '@/mocks/data/import';
import { IMPORT_NOT_FOUND } from '@/mocks/data/message';
import { createProcessInstanceList } from '@/mocks/data/process-instance';
import {
  createLoadYieldCurvesProcessInstanceDetail,
  createProcessInstanceDetail,
} from '@/mocks/data/process-instance-detail';
import type {
  ExecutionLogReadList,
  FileDetailRead,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  path: '/workflow-monitor',
  search: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: navigation.push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => navigation.path,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const mockGet = get as ReturnType<typeof vi.fn>;

const IMPORT_404_DESCRIPTION =
  'The data service could not complete the request (404 Not Found). The service said: Import not found';

function serviceError(status: number, description: string): ServiceError {
  return new ServiceError({
    status,
    description,
    retryable: true,
    kind: 'service-error',
  });
}

function unexpected(endpoint: string): Promise<never> {
  return Promise.reject(
    serviceError(500, `Unexpected request in test: ${endpoint}`),
  );
}

/** Serves one file's detail at `GET /v1/files/{Id}`. */
function serveFileDetail(detail: FileDetailRead) {
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === `/v1/files/${detail.Id}`) return Promise.resolve(detail);
    return unexpected(endpoint);
  });
}

function renderFileDetail(detail: FileDetailRead) {
  navigation.path = '/file-log';
  navigation.search = `file=${detail.Id}`;
  return render(
    <ToastProvider>
      <FileDetailCard fileId={detail.Id ?? 0} />
    </ToastProvider>,
  );
}

/**
 * Serves the Workflow monitor for one selected run. `imports` is the response for
 * `GET /v1/imports/{run.ProcessInstanceId}` — an import trace, or a 404.
 */
function serveRun(
  run: ProcessInstanceDetailRead,
  logs: ExecutionLogReadList,
  imports: ImportRead | ServiceError,
) {
  const runId = run.ProcessInstanceId ?? '';
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === '/v1/process-instances') {
      return Promise.resolve(createProcessInstanceList());
    }
    if (endpoint === `/v1/process-instances/${runId}`) {
      return Promise.resolve(run);
    }
    if (endpoint === `/v1/process-instances/${runId}/execution-logs`) {
      return Promise.resolve(logs);
    }
    if (endpoint === `/v1/imports/${runId}`) {
      return imports instanceof ServiceError
        ? Promise.reject(imports)
        : Promise.resolve(imports);
    }
    return unexpected(endpoint);
  });
}

function renderWorkflowMonitor(runId: string) {
  navigation.path = '/workflow-monitor';
  navigation.search = `instance=${runId}`;
  return render(
    <ToastProvider>
      <WorkflowMonitorPage />
    </ToastProvider>,
  );
}

function parseHref(link: HTMLElement): URL {
  return new URL(link.getAttribute('href') ?? '', 'http://localhost');
}

describe('Epic workflow-monitor-and-api, Story 3: move between a file and its run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.path = '/workflow-monitor';
    navigation.search = '';
  });

  // AC-4
  it('offers "Open workflow" for every file, opening the file\'s own import run on its own', async () => {
    // Imported file: its WorkflowInstanceId is the later LoadYieldCurves run, but
    // the link must open its own ImportFile run (the run id is the file's Woid).
    const imported = createFileDetail();
    serveFileDetail(imported);
    const first = renderFileDetail(imported);

    const importedLink = parseHref(
      await screen.findByRole('link', { name: 'Open workflow' }),
    );
    expect(importedLink.pathname).toBe('/workflow-monitor');
    expect(importedLink.searchParams.get('instance')).toBe(
      '0d41a44498814111bcce69d60f7a823a',
    );
    expect(importedLink.searchParams.get('view')).toBe('single');

    first.unmount();

    // Failed file: no WorkflowInstanceId at all, yet "Open workflow" is still
    // offered and opens its ImportFile run at its Woid.
    const failed = createFailedFileDetail();
    serveFileDetail(failed);
    renderFileDetail(failed);

    const failedLink = parseHref(
      await screen.findByRole('link', { name: 'Open workflow' }),
    );
    expect(failedLink.pathname).toBe('/workflow-monitor');
    expect(failedLink.searchParams.get('instance')).toBe(
      '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
    );
    expect(failedLink.searchParams.get('view')).toBe('single');
  });

  // AC-5
  it('"Open file log entry" resolves the run\'s own id as the import, or shows "Import not found" with a route back', async () => {
    const user = userEvent.setup();

    // ImportFile run: its ProcessInstanceId is the file's Woid, so the import
    // resolves and the File log opens on that file (101).
    const importRun = createProcessInstanceDetail();
    serveRun(importRun, createExecutionLogList(), createImport());
    const first = renderWorkflowMonitor(importRun.ProcessInstanceId ?? '');

    await user.click(
      await screen.findByRole('button', { name: 'Open file log entry' }),
    );
    await vi.waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith('/file-log?file=101');
    });

    first.unmount();

    // LoadYieldCurves run: no import exists for its id (404).
    const curvesRun = createLoadYieldCurvesProcessInstanceDetail();
    serveRun(
      curvesRun,
      createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
      serviceError(404, IMPORT_404_DESCRIPTION),
    );
    renderWorkflowMonitor(curvesRun.ProcessInstanceId ?? '');

    await user.click(
      await screen.findByRole('button', { name: 'Open file log entry' }),
    );

    expect(await screen.findByText(IMPORT_NOT_FOUND)).toBeInTheDocument();

    const backLinks = screen.getAllByRole('link', { name: /back/i });
    expect(backLinks).toHaveLength(1);
    expect(backLinks[0].getAttribute('href')).toMatch(/^\/workflow-monitor/);

    // Never the raw service error.
    expect(
      screen.queryByText(/could not complete the request/),
    ).not.toBeInTheDocument();
  });
});
