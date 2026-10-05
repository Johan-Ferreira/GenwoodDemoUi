/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/app/(app)/workflow-monitor/page.tsx
 * - Page Action: modify_existing
 * - Role: Demo presenter
 *
 * Epic workflow-monitor-and-api, Story 2: run detail — step pipeline, audit
 * history and execution log.
 *
 * Service contract (verified against the live service):
 * - Process instances carry NO ContextId. Two process names exist: "ImportFile"
 *   and "LoadYieldCurves".
 * - An ImportFile run's ProcessInstanceId IS its file's Woid, so the run's file is
 *   resolved with `GET /v1/imports/{ProcessInstanceId}`. A LoadYieldCurves run
 *   matches no import (the lookup answers 404 "Import not found").
 *
 * Production contracts these tests define (implement to them):
 * - The Workflow monitor page default export renders synchronously in jsdom (a
 *   server page rendering a client component is fine; do not make it async or
 *   read the `searchParams` page prop). The selected run is read from
 *   `useSearchParams().get('instance')` (`?instance=<ProcessInstanceId>`), the
 *   same URL-selection pattern as `useSelectedFile`. With a run selected the page
 *   loads `GET /v1/process-instances/{Id}` (getProcessInstance),
 *   `GET /v1/process-instances/{Id}/execution-logs`
 *   (getProcessInstanceExecutionLogs) and `GET /v1/imports/{ProcessInstanceId}`
 *   (getImport via lookUp, for the file name and the file's Id) via `get`,
 *   through DataState.
 * - Step pipeline: a list with accessible name "Steps" (e.g. `<ol aria-label="Steps">`)
 *   holding one `listitem` tile per entry of the service's `Steps[]`, in service
 *   order (never a hard-coded set). Each tile shows "{n} · {State}" as one element
 *   (State may be visually upper-cased via CSS; its text is the service value) and
 *   the raw step name, and carries `data-tone`: Completed=success, Faulted=danger,
 *   Running=info, otherwise neutral.
 * - Audit history: a region named "Audit history" (`<section aria-labelledby>`)
 *   containing a `<dl>` whose `<dt>` labels are exactly "Status", "Created",
 *   "Last executed", "Finished", "Cancelled", "Faulted", "Last executed activity",
 *   each followed by its `<dd>` value. A timestamp the run does not have shows
 *   "—" (NO_VALUE from lib/files/file-format).
 * - Execution log: a region named "Execution log" containing a table with columns
 *   Timestamp, Activity, Event, Message; rows always oldest first (sorted by
 *   Timestamp, BR2) whatever order the service sends. Timestamps are shown as the
 *   service's text. The event shows the plain name with any "Activity" prefix
 *   removed ("ActivityCompleted" → "Completed").
 * - Empty log: inside the Execution log region, "No log entries exist" and a link
 *   (name mentioning "file") to the run's file details at `/file-log?file=<File.Id>`,
 *   resolved ProcessInstanceId → `/v1/imports/{ProcessInstanceId}` → `File.Id`
 *   (BR3). When the run has no import (404, e.g. a LoadYieldCurves run) or the
 *   import cannot be read, the link falls back to the general file log `/file-log`.
 *
 * Only the API boundary (`@/lib/api/client`) and Next navigation hooks are mocked.
 * Payloads come from the project-wide factories in web/src/mocks/data/.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkflowMonitorPage from '@/app/(app)/workflow-monitor/page';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createEmptyExecutionLogList,
  createExecutionLogList,
  createFaultedExecutionLogs,
  createPrefixedExecutionLogs,
  createRunningExecutionLogs,
} from '@/mocks/data/execution-log';
import {
  createFailedImport,
  createImport,
  createProcessingImport,
} from '@/mocks/data/import';
import { createProcessInstanceList } from '@/mocks/data/process-instance';
import {
  createFaultedProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createProcessInstanceDetail,
  createRunningProcessInstanceDetail,
} from '@/mocks/data/process-instance-detail';
import type {
  ExecutionLogReadList,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

let currentSearch = '';
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/workflow-monitor',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const mockGet = get as ReturnType<typeof vi.fn>;

const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

interface RunScenario {
  detail: ProcessInstanceDetailRead;
  logs: ExecutionLogReadList | ServiceError;
  trace: ImportRead | ServiceError;
}

function serverError(description: string): ServiceError {
  return new ServiceError({
    status: 500,
    description,
    retryable: true,
    kind: 'service-error',
  });
}

/** The service's answer for an id that matches no import (e.g. a LoadYieldCurves run). */
function importNotFound(): ServiceError {
  return new ServiceError({
    status: 404,
    description:
      'The data service could not complete the request (404 Not Found). The service said: Import not found',
    retryable: true,
    kind: 'service-error',
  });
}

/** Resolves a payload, or rejects when the scenario says the read fails. */
function answer<T>(payload: T | ServiceError): Promise<T> {
  return payload instanceof ServiceError
    ? Promise.reject(payload)
    : Promise.resolve(payload);
}

/**
 * Serves the list, the selected run, its log and its import from the shared
 * factories. The import is looked up by the run's own ProcessInstanceId (= Woid).
 */
function serveRun({ detail, logs, trace }: RunScenario) {
  const id = detail.ProcessInstanceId ?? '';
  mockGet.mockImplementation((endpoint: unknown) => {
    if (endpoint === '/v1/process-instances') {
      return Promise.resolve(createProcessInstanceList());
    }
    if (endpoint === `/v1/process-instances/${id}`) {
      return Promise.resolve(detail);
    }
    if (endpoint === `/v1/process-instances/${id}/execution-logs`) {
      return answer(logs);
    }
    if (endpoint === `/v1/imports/${id}`) {
      return answer(trace);
    }
    return Promise.reject(
      new ServiceError({
        status: 500,
        description: `Unexpected request in test: ${String(endpoint)}`,
        retryable: true,
        kind: 'service-error',
      }),
    );
  });
}

function renderSelectedRun(scenario: RunScenario) {
  serveRun(scenario);
  currentSearch = `instance=${scenario.detail.ProcessInstanceId ?? ''}`;
  return render(<WorkflowMonitorPage />);
}

/** The `<dd>` value that follows the audit-history `<dt>` with exactly `label`. */
function auditValue(region: HTMLElement, label: string): string {
  const term = within(region).getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent?.trim() ?? '';
}

describe('Epic workflow-monitor-and-api, Story 2: run detail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  // AC-1
  it('shows one step tile per service step, in order, with position, state, name and a state-following tint; unrun steps read "Pending"', async () => {
    // Faulted ImportFile run 3c9d5e7f… (file 102): ParseRates faults.
    const first = renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      logs: createExecutionLogList(createFaultedExecutionLogs()),
      trace: createFailedImport(),
    });

    const steps = await screen.findByRole('list', { name: 'Steps' });
    const tiles = within(steps).getAllByRole('listitem');
    const expected: Array<[RegExp, string, string]> = [
      [/^1 · completed$/i, 'ReceiveFile', 'success'],
      [/^2 · completed$/i, 'BackupFile', 'success'],
      [/^3 · faulted$/i, 'ParseRates', 'danger'],
      [/^4 · pending$/i, 'PublishCurves', 'neutral'],
    ];
    expect(tiles).toHaveLength(expected.length);
    expected.forEach(([label, name, tone], position) => {
      const tile = tiles[position];
      expect(within(tile).getByText(label)).toBeInTheDocument();
      expect(within(tile).getByText(name)).toBeInTheDocument();
      expect(tile).toHaveAttribute('data-tone', tone);
    });

    first.unmount();

    // Running ImportFile run 9a8b7c6d… (file 103): a running step is tinted info.
    renderSelectedRun({
      detail: createRunningProcessInstanceDetail(),
      logs: createExecutionLogList(createRunningExecutionLogs()),
      trace: createProcessingImport(),
    });

    const runningSteps = await screen.findByRole('list', { name: 'Steps' });
    const runningTile = within(runningSteps)
      .getByText(/^2 · running$/i)
      .closest('li');
    expect(runningTile).not.toBeNull();
    expect(runningTile).toHaveTextContent('BackupFile');
    expect(runningTile).toHaveAttribute('data-tone', 'info');
  });

  // AC-2
  it('shows the run status, every audit timestamp and the last executed activity, with missing times shown as absent', async () => {
    renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      logs: createExecutionLogList(createFaultedExecutionLogs()),
      trace: createFailedImport(),
    });

    const history = await screen.findByRole('region', {
      name: /audit history/i,
    });
    expect(auditValue(history, 'Status')).toBe('Faulted');
    expect(auditValue(history, 'Created')).toBe('2026-09-30 18:05:40');
    expect(auditValue(history, 'Last executed')).toBe('2026-09-30 18:05:44');
    expect(auditValue(history, 'Faulted')).toBe('2026-09-30 18:05:44');
    expect(auditValue(history, 'Last executed activity')).toBe('ParseRates');
    // A faulted run was never finished or cancelled: both are shown as absent.
    expect(auditValue(history, 'Finished')).toBe('—');
    expect(auditValue(history, 'Cancelled')).toBe('—');
  });

  // AC-3
  it("lists time, activity, event and message per log entry oldest first, showing the faulted activity's message", async () => {
    const faultedLogs = createFaultedExecutionLogs();
    const first = renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      // The service order must not matter: the log is always oldest first (BR2).
      logs: createExecutionLogList([...faultedLogs].reverse()),
      trace: createFailedImport(),
    });

    const logRegion = await screen.findByRole('region', {
      name: /execution log/i,
    });
    const table = await within(logRegion).findByRole('table');
    for (const column of ['Timestamp', 'Activity', 'Event', 'Message']) {
      expect(
        within(table).getByRole('columnheader', { name: column }),
      ).toBeInTheDocument();
    }

    const shownTimes = within(table)
      .getAllByText(TIMESTAMP)
      .map((cell) => cell.textContent?.trim());
    expect(shownTimes).toEqual(faultedLogs.map((log) => log.Timestamp));

    const faultedRow = within(table)
      .getByText('Row 12: invalid rate')
      .closest('tr');
    expect(faultedRow).not.toBeNull();
    const row = within(faultedRow as HTMLElement);
    expect(row.getByText('2026-09-30 18:05:44')).toBeInTheDocument();
    expect(row.getByText('ParseRates')).toBeInTheDocument();
    expect(row.getByText('Faulted')).toBeInTheDocument();

    first.unmount();

    // Event names arriving with an "Activity" prefix read as the plain event.
    renderSelectedRun({
      detail: createProcessInstanceDetail(),
      logs: createExecutionLogList(createPrefixedExecutionLogs()),
      trace: createImport(),
    });

    const prefixedRegion = await screen.findByRole('region', {
      name: /execution log/i,
    });
    const prefixedTable = await within(prefixedRegion).findByRole('table');
    const publishedRow = within(prefixedTable)
      .getByText('Published 26 rates for 1 curve')
      .closest('tr');
    expect(publishedRow).not.toBeNull();
    expect(
      within(publishedRow as HTMLElement).getByText('Completed'),
    ).toBeInTheDocument();
    expect(
      within(prefixedTable).queryByText(/^Activity(Started|Completed)$/),
    ).not.toBeInTheDocument();
  });

  // AC-6
  it('shows "No log entries exist" with a link back to the run\'s file details when the log is empty', async () => {
    // Finished ImportFile run 0d41a444… is file 101's Woid: its import resolves.
    const first = renderSelectedRun({
      detail: createProcessInstanceDetail(),
      logs: createEmptyExecutionLogList(),
      trace: createImport(),
    });

    const logRegion = await screen.findByRole('region', {
      name: /execution log/i,
    });
    expect(
      await within(logRegion).findByText('No log entries exist'),
    ).toBeInTheDocument();
    expect(within(logRegion).queryByRole('table')).not.toBeInTheDocument();

    // ProcessInstanceId → /v1/imports/{ProcessInstanceId} → File.Id 101 (BR3).
    await waitFor(() => {
      expect(
        within(logRegion).getByRole('link', { name: /file/i }),
      ).toHaveAttribute('href', '/file-log?file=101');
    });

    first.unmount();

    // A LoadYieldCurves run matches no import (404): the link falls back to the file log.
    renderSelectedRun({
      detail: createLoadYieldCurvesProcessInstanceDetail(),
      logs: createEmptyExecutionLogList(),
      trace: importNotFound(),
    });

    const curvesRegion = await screen.findByRole('region', {
      name: /execution log/i,
    });
    expect(
      await within(curvesRegion).findByText('No log entries exist'),
    ).toBeInTheDocument();
    expect(
      await within(curvesRegion).findByRole('link', { name: /file/i }),
    ).toHaveAttribute('href', '/file-log');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("still shows the run when its import cannot be read, without the file's details", async () => {
    renderSelectedRun({
      detail: createProcessInstanceDetail(),
      logs: createEmptyExecutionLogList(),
      trace: serverError('The import service is unavailable.'),
    });

    expect(
      await screen.findByRole('list', { name: 'Steps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: /audit history/i }),
    ).toBeVisible();
    expect(
      screen.queryByText('The import service is unavailable.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Without the import the run's file is unknown: the link falls back to the file log.
    const logRegion = screen.getByRole('region', { name: /execution log/i });
    expect(
      within(logRegion).getByRole('link', { name: /file/i }),
    ).toHaveAttribute('href', '/file-log');
  });

  it('shows the persistent error with Retry when the run log cannot be read', async () => {
    renderSelectedRun({
      detail: createProcessInstanceDetail(),
      logs: serverError('The execution log could not be read.'),
      trace: createImport(),
    });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('The execution log could not be read.'),
    ).toBeInTheDocument();
    expect(
      within(alert).getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Steps' }),
    ).not.toBeInTheDocument();
  });

  it('does not navigate again when the already-selected run is chosen, but does for another run', async () => {
    const user = userEvent.setup();
    renderSelectedRun({
      detail: createProcessInstanceDetail(),
      logs: createExecutionLogList(),
      trace: createImport(),
    });

    await screen.findByRole('list', { name: 'Steps' });
    const selectedRow = screen.getByRole('row', { name: /^0d41a4449881…/ });
    expect(selectedRow).toHaveAttribute('aria-selected', 'true');

    await user.click(selectedRow);
    expect(mockPush).not.toHaveBeenCalled();

    await user.click(screen.getByRole('row', { name: /^3c9d5e7f1a2b…/ }));
    expect(mockPush).toHaveBeenCalledWith(
      '/workflow-monitor?instance=3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f',
      { scroll: false },
    );
  });
});
