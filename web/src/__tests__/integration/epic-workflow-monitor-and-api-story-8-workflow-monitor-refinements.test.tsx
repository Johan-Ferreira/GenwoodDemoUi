/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/workflow-monitor/WorkflowMonitorView.tsx
 * - Page Action: modify_existing
 * - Role: Demo presenter
 *
 * Epic workflow-monitor-and-api, Story 8: Workflow monitor refinements
 * (vitest-tagged ACs: 1, 2, 3, 5). AC-4 is in the Playwright spec.
 *
 * Production contracts these tests define (implement to them):
 * - Step tiles (`<ol aria-label="Steps">`, one `listitem` per shown step; first
 *   child "{n} · {State}" (CSS may upper-case it), second child the step name;
 *   `data-tone` on the tile). "{n}" is the displayed position.
 *   - ImportFile: a Pending step whose name starts with "Hold" or "Clear" is NOT
 *     shown. A Hold…/Clear… step that is not Pending (the run stopped on it, e.g.
 *     HoldValidateDuplidate Running) is shown in its own state. Every other
 *     Pending step still shows as "Pending". Service order is kept.
 *   - LoadYieldCurves run that is Finished with LastExecutedActivityName "Error":
 *     tiles in Register, Validate, Transform, Import, Complete order; the last
 *     step that ran (Validate for the seeded runs) is a red tile —
 *     `data-tone="danger"` with state label "ERROR" (text "Error"/"ERROR") instead
 *     of "Completed" — and the trailing Pending steps after it are NOT shown.
 *     A LoadYieldCurves run that did not end on Error is unchanged (five
 *     Completed tiles, success tone).
 * - Status filter (Shadcn Select combobox "Status"): options, in order,
 *   "All statuses", "Idle", "Running", "Suspended", "Finished", "Cancelled",
 *   "Finished (Error)" — the existing statuses with "Faulted" replaced by
 *   "Finished (Error)" in the same (last) position. Choosing "Finished (Error)"
 *   asks the service for `Status=Finished` (the service cannot filter on the last
 *   activity; this test's `get` mock answers with `queryProcessInstances`, so any
 *   other Status value returns nothing) and filters the result on the page to
 *   LastExecutedActivityName "Error" — paging for this option is done on the
 *   page. The active-filter chip reads "Status: Finished (Error)".
 * - Execution log (region "Execution log", table Timestamp / Activity / Event /
 *   Message): when an activity has an "Executing" row followed by an "Executed"
 *   row, only the "Executed" row is shown. A lone "Executing" row (no Executed
 *   after it — still running) is kept. Oldest first; non-paired events (e.g.
 *   Started / Faulted) and a failing activity's message are shown as before.
 *
 * Only the API boundary (`get` in @/lib/api/client) and next/navigation are mocked.
 * Payloads come from the project-wide factories in web/src/mocks/data/ — no
 * response bodies are authored here.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowMonitorView } from '@/components/workflow-monitor/WorkflowMonitorView';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createExecutionLogList,
  createFaultedExecutionLogs,
  createLoadYieldCurvesExecutionLogs,
  createPairedImportFileExecutionLogs,
  createPairedRateLoadErrorExecutionLogs,
  createPairedRunningExecutionLogs,
} from '@/mocks/data/execution-log';
import { createFailedImport } from '@/mocks/data/import';
import {
  createProcessInstance,
  createProcessInstances,
  isFinishedWithError,
  queryProcessInstances,
} from '@/mocks/data/process-instance';
import {
  createFaultedProcessInstanceDetail,
  createFinishedImportFileWithHoldStepsDetail,
  createHoldStoppedImportFileProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createOlderRateLoadErrorProcessInstanceDetail,
  createRateLoadErrorProcessInstanceDetail,
} from '@/mocks/data/process-instance-detail';
import type {
  ExecutionLogReadList,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';
import type { QueryParams } from '@/types/api';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, get: vi.fn() };
});
const mockGet = get as ReturnType<typeof vi.fn>;

let currentSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/workflow-monitor',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const instances = createProcessInstances();

interface RunScenario {
  detail: ProcessInstanceDetailRead;
  logs: ExecutionLogReadList;
  trace: ImportRead | ServiceError;
}

/** The service's answer for an id that matches no import. */
function importNotFound(): ServiceError {
  return new ServiceError({
    status: 404,
    description:
      'The data service could not complete the request (404 Not Found). The service said: Import not found',
    retryable: true,
    kind: 'service-error',
  });
}

function unexpected(endpoint: unknown): Promise<never> {
  return Promise.reject(
    new ServiceError({
      status: 500,
      description: `Unexpected request in test: ${String(endpoint)}`,
      retryable: true,
      kind: 'service-error',
    }),
  );
}

/** Behaves like the service's list endpoint: filters and pages by query params. */
function answerList(
  params: QueryParams | undefined,
  from: typeof instances = instances,
) {
  const text = (key: string): string | undefined => {
    const value = params?.[key];
    return value === undefined || value === '' ? undefined : String(value);
  };
  const page = text('Page');
  const size = text('Size');
  return queryProcessInstances(from, {
    Status: text('Status'),
    ProcessName: text('ProcessName'),
    Page: page === undefined ? undefined : Number(page),
    Size: size === undefined ? undefined : Number(size),
  });
}

function renderMonitor() {
  return render(
    <ToastProvider>
      <WorkflowMonitorView />
    </ToastProvider>,
  );
}

/** Serves the list plus the selected run, its log and its import lookup. */
function renderSelectedRun({ detail, logs, trace }: RunScenario) {
  const id = detail.ProcessInstanceId ?? '';
  mockGet.mockImplementation((endpoint: unknown, params?: QueryParams) => {
    if (endpoint === '/v1/process-instances') {
      return Promise.resolve(answerList(params));
    }
    if (endpoint === `/v1/process-instances/${id}`) {
      return Promise.resolve(detail);
    }
    if (endpoint === `/v1/process-instances/${id}/execution-logs`) {
      return Promise.resolve(logs);
    }
    if (endpoint === `/v1/imports/${id}`) {
      return trace instanceof ServiceError
        ? Promise.reject(trace)
        : Promise.resolve(trace);
    }
    return unexpected(endpoint);
  });
  currentSearch = `instance=${id}`;
  return renderMonitor();
}

/** Step tiles as [name, state-label, tone], left to right. */
async function shownSteps(): Promise<Array<[string, string, string]>> {
  const list = await screen.findByRole('list', { name: 'Steps' });
  return within(list)
    .getAllByRole('listitem')
    .map((tile) => {
      const [label, name] = Array.from(tile.children).map(
        (child) => child.textContent?.trim() ?? '',
      );
      return [name, label.toLowerCase(), tile.getAttribute('data-tone') ?? ''];
    });
}

/** Execution log rows as [activity, event, message], top to bottom. */
async function shownLogRows(): Promise<Array<[string, string, string]>> {
  const region = await screen.findByRole('region', { name: /execution log/i });
  const table = await within(region).findByRole('table');
  return within(table)
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
    .map((row) => {
      const cells = within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.trim() ?? '');
      return [cells[1], cells[2], cells[3]];
    });
}

/** The Process instances table (the one with the Instance ID column). */
function processTable(): HTMLElement {
  const table = screen.getAllByRole('table').find(
    (candidate) =>
      within(candidate).queryByRole('columnheader', {
        name: /^Instance ID/,
      }) !== null,
  );
  if (table === undefined) throw new Error('Process instances table not shown');
  return table;
}

/** The Instance ID cell (first column) of each data row, top to bottom. */
function listedIds(): string[] {
  return within(processTable())
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
    .map((row) =>
      (within(row).getAllByRole('cell')[0].textContent ?? '').trim(),
    );
}

function shortId(id: string | undefined): string {
  return `${(id ?? '').slice(0, 12)}…`;
}

describe('Epic workflow-monitor-and-api, Story 8: Workflow monitor refinements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  // AC-1
  it('hides Pending Hold… and Clear… step tiles of an ImportFile run, but shows the Hold step it stopped on and other Pending steps', async () => {
    // Finished ImportFile run d1e2f3a4…: LogNewImport..ImportData Completed,
    // every Hold…/Clear… step Pending.
    const first = renderSelectedRun({
      detail: createFinishedImportFileWithHoldStepsDetail(),
      logs: createExecutionLogList(createPairedImportFileExecutionLogs()),
      trace: importNotFound(),
    });

    expect(await shownSteps()).toEqual([
      ['LogNewImport', '1 · completed', 'success'],
      ['LogImportDetails', '2 · completed', 'success'],
      ['ValidateDuplicate', '3 · completed', 'success'],
      ['ValidateFormat', '4 · completed', 'success'],
      ['ImportData', '5 · completed', 'success'],
    ]);

    first.unmount();

    // ImportFile run e2f3a4b5… stopped on HoldValidateDuplidate (Running).
    renderSelectedRun({
      detail: createHoldStoppedImportFileProcessInstanceDetail(),
      logs: createExecutionLogList(createPairedRunningExecutionLogs()),
      trace: importNotFound(),
    });

    expect(await shownSteps()).toEqual([
      ['LogNewImport', '1 · completed', 'success'],
      ['LogImportDetails', '2 · completed', 'success'],
      ['ValidateDuplicate', '3 · completed', 'success'],
      ['ValidateFormat', '4 · pending', 'neutral'],
      ['ImportData', '5 · pending', 'neutral'],
      ['HoldValidateDuplidate', '6 · running', 'info'],
    ]);
  });

  // AC-2
  it('ends a LoadYieldCurves run that finished on Error at a red "ERROR" tile for the failed step, with no Pending tiles after it, and leaves a normal run unchanged', async () => {
    // RateLoad run b8c9d0e1… (file 106): Register + Validate ran, then Error.
    const first = renderSelectedRun({
      detail: createRateLoadErrorProcessInstanceDetail(),
      logs: createExecutionLogList(createPairedRateLoadErrorExecutionLogs()),
      trace: importNotFound(),
    });

    expect(await shownSteps()).toEqual([
      ['Register', '1 · completed', 'success'],
      ['Validate', '2 · error', 'danger'],
    ]);

    first.unmount();

    // A RateLoad run that finished normally keeps all five Completed tiles.
    renderSelectedRun({
      detail: createLoadYieldCurvesProcessInstanceDetail(),
      logs: createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
      trace: importNotFound(),
    });

    expect(await shownSteps()).toEqual([
      ['Register', '1 · completed', 'success'],
      ['Validate', '2 · completed', 'success'],
      ['Transform', '3 · completed', 'success'],
      ['Import', '4 · completed', 'success'],
      ['Complete', '5 · completed', 'success'],
    ]);
  });

  // AC-3
  it('offers "Finished (Error)" in place of "Faulted" and, when chosen, lists only runs that finished with last activity Error', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation((endpoint: unknown, params?: QueryParams) =>
      endpoint === '/v1/process-instances'
        ? Promise.resolve(answerList(params))
        : unexpected(endpoint),
    );

    renderMonitor();
    await screen.findByRole('table');

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent?.trim()),
    ).toEqual([
      'All statuses',
      'Idle',
      'Running',
      'Suspended',
      'Finished',
      'Cancelled',
      'Finished (Error)',
    ]);

    await user.click(
      within(listbox).getByRole('option', { name: 'Finished (Error)' }),
    );

    // The service is asked for Finished runs; the page keeps only those ending on Error.
    const expectedIds = instances
      .filter(isFinishedWithError)
      .map((p) => shortId(p.ProcessInstanceId));
    expect(expectedIds).toEqual([
      shortId(createRateLoadErrorProcessInstanceDetail().ProcessInstanceId),
      shortId(
        createOlderRateLoadErrorProcessInstanceDetail().ProcessInstanceId,
      ),
    ]);
    await waitFor(() => {
      expect(listedIds()).toEqual(expectedIds);
    });

    const activeFilters = screen.getByRole('list', { name: 'Active filters' });
    expect(
      within(activeFilters).getByText('Status: Finished (Error)'),
    ).toBeInTheDocument();
  });

  it('lists a run under "Finished (Error)" only when its status reads "Finished (Error)" — an ImportFile run ending on an Error activity stays a plain "Finished"', async () => {
    const user = userEvent.setup();
    // An ImportFile run whose last activity happens to be named Error.
    const importFileOnError = createProcessInstance({
      ProcessInstanceId: 'f9e8d7c6b5a44f3e9d8c7b6a5f4e3d2c',
      ProcessName: 'ImportFile',
      CurrentStatus: 'Finished',
      LastExecutedActivityName: 'Error',
      CreatedAt: '2026-10-01 08:00:00',
    });
    const served = [importFileOnError, ...instances];
    mockGet.mockImplementation((endpoint: unknown, params?: QueryParams) =>
      endpoint === '/v1/process-instances'
        ? Promise.resolve(answerList(params, served))
        : unexpected(endpoint),
    );

    renderMonitor();
    await screen.findByRole('table');

    // Unfiltered, its chip reads "Finished", not "Finished (Error)".
    const importFileRow = await waitFor(() => {
      const row = within(processTable())
        .getAllByRole('row')
        .find((candidate) =>
          candidate.textContent?.includes(
            shortId(importFileOnError.ProcessInstanceId),
          ),
        );
      if (row === undefined) throw new Error('ImportFile run not listed');
      return row;
    });
    expect(within(importFileRow).getByText('Finished')).toBeInTheDocument();
    expect(
      within(importFileRow).queryByText('Finished (Error)'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Status' }));
    await user.click(
      within(await screen.findByRole('listbox')).getByRole('option', {
        name: 'Finished (Error)',
      }),
    );

    // Only the RateLoad runs whose chip reads "Finished (Error)" are listed.
    await waitFor(() => {
      expect(listedIds()).toEqual([
        shortId(createRateLoadErrorProcessInstanceDetail().ProcessInstanceId),
        shortId(
          createOlderRateLoadErrorProcessInstanceDetail().ProcessInstanceId,
        ),
      ]);
    });
    for (const row of within(processTable())
      .getAllByRole('row')
      .filter((candidate) => within(candidate).queryAllByRole('cell').length)) {
      expect(within(row).getByText('Finished (Error)')).toBeInTheDocument();
    }
  });

  // AC-5
  it('shows only the "Executed" row for a paired activity, keeps a lone "Executing" row, oldest first, and still shows a failing message', async () => {
    // Hold-stopped run e2f3a4b5…: four Executing/Executed pairs, then a lone
    // HoldValidateDuplidate Executing row (still running).
    const first = renderSelectedRun({
      detail: createHoldStoppedImportFileProcessInstanceDetail(),
      logs: createExecutionLogList(createPairedRunningExecutionLogs()),
      trace: importNotFound(),
    });

    expect(
      (await shownLogRows()).map(([activity, event]) => [activity, event]),
    ).toEqual([
      ['Start', 'Executed'],
      ['LogNewImport', 'Executed'],
      ['LogImportDetails', 'Executed'],
      ['ValidateDuplicate', 'Executed'],
      ['HoldValidateDuplidate', 'Executing'],
    ]);

    first.unmount();

    // A failing activity's message still shows (non-paired events are untouched).
    renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      logs: createExecutionLogList(createFaultedExecutionLogs()),
      trace: createFailedImport(),
    });

    const rows = await shownLogRows();
    expect(rows.map(([activity, event]) => [activity, event])).toEqual(
      createFaultedExecutionLogs().map((log) => [
        log.ActivityName,
        log.EventName,
      ]),
    );
    expect(
      rows.find(([, , message]) => message === 'Row 12: invalid rate'),
    ).toEqual(['ParseRates', 'Faulted', 'Row 12: invalid rate']);
  });
});
