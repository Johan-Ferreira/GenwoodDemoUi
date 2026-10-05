/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/workflow-monitor/WorkflowMonitorView.tsx
 * - Page Action: modify_existing
 * - Role: Demo presenter
 *
 * Epic workflow-monitor-and-api, Story 7: the Workflow monitor understands the
 * two processes (vitest-tagged ACs: 1, 2). AC-3 and AC-4 are in the Playwright spec.
 *
 * Service contract (verified against the live service):
 * - Two process names: "ImportFile" (ImportPro staging) and "LoadYieldCurves"
 *   (the RateLoad run). A RateLoad run that failed is CurrentStatus "Finished"
 *   with LastExecutedActivityName "Error" (the service never reports Faulted).
 * - The service sends RateLoad steps out of order (Register, Validate, Complete,
 *   Import, Transform — RATE_LOAD_SERVICE_STEP_ORDER in the shared factory).
 *
 * Production contracts these tests define (implement to them):
 * - Status chip (StatusChip: text label + `data-tone`): a LoadYieldCurves run
 *   that is "Finished" with LastExecutedActivityName "Error" reads exactly
 *   "Finished (Error)" with data-tone="danger" — in the Process instances table
 *   row's Status cell AND in the step card header (the steps card is the region
 *   named by the process name, e.g. "LoadYieldCurves", that holds the "Steps"
 *   list; the header chip is its own element inside that region). A RateLoad run
 *   finished on any other activity stays "Finished" with data-tone="success".
 *   The Status filter keeps the service values (unchanged).
 * - Step tiles (`<ol aria-label="Steps">`, one `listitem` per step, "{n} · {State}"
 *   plus the step name, `data-tone` by state): LoadYieldCurves tiles are ordered
 *   Register, Validate, Transform, Import, Complete whatever order the service
 *   sends; step names outside that set follow them in service order. Each tile
 *   keeps its own step's State, and "{n}" is the displayed position. ImportFile
 *   steps keep the service order exactly (no reordering).
 *
 * Only the API boundary (`get` in @/lib/api/client) and next/navigation are mocked.
 * Payloads come from the project-wide factories in web/src/mocks/data/
 * (process-instance*, execution-log, import) — no response bodies are authored here.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkflowMonitorView } from '@/components/workflow-monitor/WorkflowMonitorView';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createExecutionLogList,
  createFaultedExecutionLogs,
  createLoadYieldCurvesExecutionLogs,
  createRateLoadErrorExecutionLogs,
} from '@/mocks/data/execution-log';
import { createFailedImport } from '@/mocks/data/import';
import { createProcessInstanceList } from '@/mocks/data/process-instance';
import {
  createFaultedProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createRateLoadErrorProcessInstanceDetail,
  RATE_LOAD_STEPS,
} from '@/mocks/data/process-instance-detail';
import type {
  ExecutionLogReadList,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

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

/** RateLoad run b8c9d0e1… (file 106): Finished, last activity 'Error'. */
const RATE_LOAD_ERROR_ID = 'b8c9d0e1f2a34b4c9d5e6f7a8b9c0d1e';
/** RateLoad run 66450570… (file 101): Finished normally, last activity 'Complete'. */
const RATE_LOAD_COMPLETE_ID = '6645057045ca4ce59a9827c6f5138246';

interface RunScenario {
  detail: ProcessInstanceDetailRead;
  logs: ExecutionLogReadList;
  trace: ImportRead | ServiceError;
}

/** The service's answer for an id that matches no import (any RateLoad run id). */
function importNotFound(): ServiceError {
  return new ServiceError({
    status: 404,
    description:
      'The data service could not complete the request (404 Not Found). The service said: Import not found',
    retryable: true,
    kind: 'service-error',
  });
}

/** Serves the full list plus the selected run, its log and its import lookup. */
function renderSelectedRun({ detail, logs, trace }: RunScenario) {
  const id = detail.ProcessInstanceId ?? '';
  mockGet.mockImplementation((endpoint: unknown) => {
    if (endpoint === '/v1/process-instances') {
      return Promise.resolve(createProcessInstanceList());
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
    return Promise.reject(
      new ServiceError({
        status: 500,
        description: `Unexpected request in test: ${String(endpoint)}`,
        retryable: true,
        kind: 'service-error',
      }),
    );
  });
  currentSearch = `instance=${id}`;
  return render(
    <ToastProvider>
      <WorkflowMonitorView />
    </ToastProvider>,
  );
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

/** The table row for an instance, found by its leading shortened ID. */
function rowForInstance(id: string): HTMLElement {
  return within(processTable()).getByRole('row', {
    name: new RegExp(`^${id.slice(0, 12)}…`),
  });
}

/** The Status cell of a table row. */
function statusCell(row: HTMLElement): HTMLElement {
  const headers = within(processTable()).getAllByRole('columnheader');
  const column = headers.findIndex((h) => /^Status/.test(h.textContent ?? ''));
  if (column < 0) throw new Error('No Status column');
  return within(row).getAllByRole('cell')[column];
}

/** Step tiles as [name, state-label] pairs, left to right. */
async function shownSteps(): Promise<Array<[string, string]>> {
  const list = await screen.findByRole('list', { name: 'Steps' });
  return within(list)
    .getAllByRole('listitem')
    .map((tile) => {
      const [label, name] = Array.from(tile.children).map(
        (child) => child.textContent?.trim() ?? '',
      );
      return [name, label.toLowerCase()];
    });
}

describe('Epic workflow-monitor-and-api, Story 7: the two processes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  // AC-1
  it('marks a RateLoad run that finished on Error as "Finished (Error)" in danger in the table and step card header, while a normal RateLoad run stays Finished (success)', async () => {
    const first = renderSelectedRun({
      detail: createRateLoadErrorProcessInstanceDetail(),
      logs: createExecutionLogList(createRateLoadErrorExecutionLogs()),
      trace: importNotFound(),
    });

    // Step card header of the selected (Error) run.
    const card = await screen.findByRole('region', { name: 'LoadYieldCurves' });
    await within(card).findByRole('list', { name: 'Steps' });
    expect(within(card).getByText('Finished (Error)')).toHaveAttribute(
      'data-tone',
      'danger',
    );

    // Process instances table: the Error run and a normally finished RateLoad run.
    const errorChip = within(
      statusCell(rowForInstance(RATE_LOAD_ERROR_ID)),
    ).getByText('Finished (Error)');
    expect(errorChip).toHaveAttribute('data-tone', 'danger');

    const completeCell = statusCell(rowForInstance(RATE_LOAD_COMPLETE_ID));
    expect(within(completeCell).getByText('Finished')).toHaveAttribute(
      'data-tone',
      'success',
    );
    expect(
      within(completeCell).queryByText('Finished (Error)'),
    ).not.toBeInTheDocument();

    first.unmount();

    // A normally finished RateLoad run's step card header stays Finished (success).
    renderSelectedRun({
      detail: createLoadYieldCurvesProcessInstanceDetail(),
      logs: createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
      trace: importNotFound(),
    });

    const normalCard = await screen.findByRole('region', {
      name: 'LoadYieldCurves',
    });
    await within(normalCard).findByRole('list', { name: 'Steps' });
    expect(within(normalCard).getByText('Finished')).toHaveAttribute(
      'data-tone',
      'success',
    );
    expect(
      within(normalCard).queryByText('Finished (Error)'),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('orders RateLoad step tiles Register, Validate, Transform, Import, Complete whatever the service order, but keeps ImportFile steps in service order', async () => {
    // The factory sends the Error run's steps in the live service's order
    // (Register, Validate, Complete, Import, Transform).
    const first = renderSelectedRun({
      detail: createRateLoadErrorProcessInstanceDetail(),
      logs: createExecutionLogList(createRateLoadErrorExecutionLogs()),
      trace: importNotFound(),
    });

    // Each tile keeps its own step's state; "{n}" is the displayed position.
    expect(await shownSteps()).toEqual([
      ['Register', '1 · completed'],
      ['Validate', '2 · completed'],
      ['Transform', '3 · pending'],
      ['Import', '4 · pending'],
      ['Complete', '5 · pending'],
    ]);

    first.unmount();

    // A step name outside the known set follows the known steps, in service order.
    const withUnknown = createLoadYieldCurvesProcessInstanceDetail();
    const second = renderSelectedRun({
      detail: {
        ...withUnknown,
        Steps: [
          { Name: 'Notify', State: 'Completed' },
          ...(withUnknown.Steps ?? []),
        ],
      },
      logs: createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
      trace: importNotFound(),
    });

    expect((await shownSteps()).map(([name]) => name)).toEqual([
      ...RATE_LOAD_STEPS,
      'Notify',
    ]);

    second.unmount();

    // ImportFile steps are never reordered: shown exactly as the service sends them.
    const faulted = createFaultedProcessInstanceDetail();
    const serviceOrder = [...(faulted.Steps ?? [])].reverse();
    renderSelectedRun({
      detail: { ...faulted, Steps: serviceOrder },
      logs: createExecutionLogList(createFaultedExecutionLogs()),
      trace: createFailedImport(),
    });

    expect((await shownSteps()).map(([name]) => name)).toEqual(
      serviceOrder.map((step) => step.Name),
    );
  });
});
