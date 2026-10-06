/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/app/(app)/workflow-monitor/page.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 1: Process instance list
 * (vitest-tagged ACs: 1, 4, 5, 6, 7).
 *
 * Production contracts these tests define (implement to them):
 * - The Workflow monitor page loads process instances through `get`
 *   (GET /v1/process-instances, via `getProcessInstances` in
 *   web/src/lib/api/endpoints.ts) inside DataState, sending the Status /
 *   ProcessName / Page / Size query parameters (paging is service-driven).
 * - The "Process instances" table has the column headers Instance ID, Process,
 *   Context (WOID), Created, Last executed, Last activity, Status, and shows rows
 *   newest first by CreatedAt whatever order the service returns.
 * - Instance ID shows its first 12 characters followed by "…" (full ID not
 *   rendered as text); a missing timestamp or last activity renders the neutral
 *   placeholder "—". The live service returns NO ContextId.
 * - Status is a StatusChip (text label + `data-tone`): Finished=success,
 *   Faulted=danger, Running=info, Idle / Suspended / Cancelled=neutral (BR4).
 * - Each column header is a `columnheader` containing a button; first choice sorts
 *   ascending, second descending, and the active column carries `aria-sort`.
 * - Filters are Shadcn Select comboboxes: "Status" (first option "All statuses")
 *   and "Process name" — a DROPDOWN, not a text input — with exactly the
 *   hardcoded options "All processes", "ImportFile", "LoadYieldCurves".
 * - No matches -> a list named "Active filters" naming each active filter as
 *   "<label>: <value>" (e.g. "Status: Idle", "Process name: ImportFile") plus a
 *   "Clear all" button that resets both selects to their "All ..." option.
 * - No runs at all -> "No process instances found." and no table.
 * - Load failure -> DataState's persistent role="alert" message with Retry,
 *   which reloads the list.
 * - Single-run view: `useSearchParams` with `instance=<Id>&view=single` -> the
 *   Process instances table lists only that run, and a button
 *   "Show all process instances" navigates (router push/replace) to the same
 *   URL without `view=single`, after which the full list shows again.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation is
 * stubbed with a small in-memory URL store because the App Router is not mounted
 * under jsdom. Payloads come from the project-wide factories in @/mocks/data.
 *
 * Filtering (AC-2) and paging (AC-3) are covered by the Playwright spec.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkflowMonitorPage from '@/app/(app)/workflow-monitor/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createExecutionLogList } from '@/mocks/data/execution-log';
import { createImport } from '@/mocks/data/import';
import { createProcessInstanceDetail } from '@/mocks/data/process-instance-detail';
import {
  createEmptyProcessInstanceList,
  createProcessInstanceList,
  createProcessInstances,
  queryProcessInstances,
} from '@/mocks/data/process-instance';
import type { ProcessInstanceRead } from '@/types/api-generated';
import type { QueryParams } from '@/types/api';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, get: vi.fn() };
});
const mockGet = get as ReturnType<typeof vi.fn>;

/** In-memory URL search params, so navigation re-renders like the App Router. */
const nav = vi.hoisted(() => {
  let params = new URLSearchParams();
  const listeners = new Set<() => void>();
  return {
    read: () => params,
    navigate(url: string) {
      const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
      params = new URLSearchParams(query);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
});

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const router = {
    push: (url: string) => nav.navigate(url),
    replace: (url: string) => nav.navigate(url),
    refresh: () => undefined,
    back: () => undefined,
    prefetch: () => undefined,
  };
  return {
    useRouter: () => router,
    usePathname: () => '/workflow-monitor',
    useSearchParams: () =>
      useSyncExternalStore(nav.subscribe, nav.read, nav.read),
  };
});

/** The canonical Finished ImportFile run (file 101's Woid). */
const canonical = createProcessInstanceDetail();
const CANONICAL_ID = canonical.ProcessInstanceId ?? '';

/**
 * Behaves like the data service: the list endpoint filters and pages by the
 * query parameters; the canonical run's detail, log and import resolve.
 */
function serveService(instances: ProcessInstanceRead[]) {
  return async (endpoint: string, params?: QueryParams) => {
    if (endpoint === '/v1/process-instances') {
      const text = (key: string): string | undefined => {
        const value = params?.[key];
        return value === undefined || value === '' ? undefined : String(value);
      };
      const page = text('Page');
      const size = text('Size');
      return queryProcessInstances(instances, {
        Status: text('Status'),
        ProcessName: text('ProcessName'),
        Page: page === undefined ? undefined : Number(page),
        Size: size === undefined ? undefined : Number(size),
      });
    }
    if (endpoint === `/v1/process-instances/${CANONICAL_ID}`) return canonical;
    if (endpoint === `/v1/process-instances/${CANONICAL_ID}/execution-logs`) {
      return createExecutionLogList();
    }
    if (endpoint === `/v1/imports/${CANONICAL_ID}`) return createImport();
    throw new Error(`Unexpected endpoint in test: ${endpoint}`);
  };
}

function renderWorkflowMonitor() {
  return render(
    <ToastProvider>
      <WorkflowMonitorPage />
    </ToastProvider>,
  );
}

/** The displayed (shortened) form of an instance ID. */
function shortId(id: string | undefined): string {
  return `${(id ?? '').slice(0, 12)}…`;
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
function rowForInstance(id: string | undefined): HTMLElement {
  return within(processTable()).getByRole('row', {
    name: new RegExp(`^${shortId(id)}`),
  });
}

/** The cell of a row under the named column header. */
function cellUnder(row: HTMLElement, header: RegExp): HTMLElement {
  const headers = within(processTable()).getAllByRole('columnheader');
  const column = headers.findIndex((h) => header.test(h.textContent ?? ''));
  if (column < 0) throw new Error(`No column ${header}`);
  return within(row).getAllByRole('cell')[column];
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

function sortButton(columnName: RegExp): HTMLElement {
  return within(
    screen.getByRole('columnheader', { name: columnName }),
  ).getByRole('button');
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: string,
  optionName: string,
) {
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

const instances = createProcessInstances();
const newestFirstIds = instances.map((p) => shortId(p.ProcessInstanceId));

describe('Epic workflow-monitor-and-api, Story 1: Process instance list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.navigate('/workflow-monitor');
  });

  // AC-1
  it('lists process instances newest first with the brief columns, a shortened ID, placeholders for missing values and labelled status chips', async () => {
    // Service order deliberately oldest first: the page must show newest first.
    mockGet.mockResolvedValue(
      createProcessInstanceList({ ProcessInstances: [...instances].reverse() }),
    );

    renderWorkflowMonitor();

    await screen.findByRole('table');
    const table = processTable();
    for (const header of [
      /^Instance ID/,
      /^Process$/,
      /^Context \(WOID\)/,
      /^Created/,
      /^Last executed/,
      /^Last activity/,
      /^Status/,
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }

    expect(listedIds()).toEqual(newestFirstIds);

    // Canonical Finished ImportFile run.
    const finished = rowForInstance(CANONICAL_ID);
    expect(within(finished).getByText('0d41a4449881…')).toBeInTheDocument();
    expect(
      within(finished).queryByText('0d41a44498814111bcce69d60f7a823a'),
    ).not.toBeInTheDocument();
    expect(cellUnder(finished, /^Process$/)).toHaveTextContent('ImportFile');
    expect(cellUnder(finished, /^Created/)).toHaveTextContent(
      '2026-09-30 18:02:11',
    );
    expect(cellUnder(finished, /^Last executed/)).toHaveTextContent(
      '2026-09-30 18:02:19',
    );
    expect(cellUnder(finished, /^Last activity/)).toHaveTextContent(
      'PublishCurves',
    );

    // A LoadYieldCurves run shows its own process name.
    const loadCurves = rowForInstance('6645057045ca4ce59a9827c6f5138246');
    expect(cellUnder(loadCurves, /^Process$/)).toHaveTextContent(
      'LoadYieldCurves',
    );

    // Idle run never executed: Last executed and Last activity both absent.
    const idle = rowForInstance('f6a7b8c9d0e14f2a3b4c5d6e7f8091a2');
    expect(cellUnder(idle, /^Last executed/)).toHaveTextContent(/^—$/);
    expect(cellUnder(idle, /^Last activity/)).toHaveTextContent(/^—$/);

    // Status chips carry their text label, toned by intent (others neutral).
    const expectations: Array<[string, string, string]> = [
      ['0d41a44498814111bcce69d60f7a823a', 'Finished', 'success'],
      ['3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f', 'Faulted', 'danger'],
      ['b4c5d6e7f8a94b0c9d1e2f3a4b5c6d7e', 'Running', 'info'],
      ['d4e5f6a7b8c94d0e1f2a3b4c5d6e7f80', 'Cancelled', 'neutral'],
      ['e5f6a7b8c9d04e1f2a3b4c5d6e7f8091', 'Suspended', 'neutral'],
      ['f6a7b8c9d0e14f2a3b4c5d6e7f8091a2', 'Idle', 'neutral'],
    ];
    for (const [id, label, tone] of expectations) {
      expect(within(rowForInstance(id)).getByText(label)).toHaveAttribute(
        'data-tone',
        tone,
      );
    }
  });

  // AC-4
  it('sorts by a column ascending, then descending on the second click, and marks the active column and direction', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveService(instances));

    renderWorkflowMonitor();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(listedIds()).toEqual(newestFirstIds);
    });

    const ascendingIds = instances
      .map((p) => p.ProcessInstanceId ?? '')
      .sort((a, b) => a.localeCompare(b))
      .map(shortId);

    await user.click(sortButton(/^Instance ID/));

    expect(listedIds()).toEqual(ascendingIds);
    expect(
      screen.getByRole('columnheader', { name: /^Instance ID/ }),
    ).toHaveAttribute('aria-sort', 'ascending');
    const lastActivityHeader = screen.getByRole('columnheader', {
      name: /^Last activity/,
    });
    expect(lastActivityHeader).not.toHaveAttribute('aria-sort', 'ascending');
    expect(lastActivityHeader).not.toHaveAttribute('aria-sort', 'descending');

    await user.click(sortButton(/^Instance ID/));

    expect(listedIds()).toEqual([...ascendingIds].reverse());
    expect(
      screen.getByRole('columnheader', { name: /^Instance ID/ }),
    ).toHaveAttribute('aria-sort', 'descending');
  });

  // AC-5
  it('names the active filters with Clear all when nothing matches, and says no process instances were found when there are none', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveService(instances));

    const { unmount } = renderWorkflowMonitor();
    await screen.findByRole('table');

    // The Process name filter is a dropdown with the three hardcoded choices.
    await user.click(screen.getByRole('combobox', { name: 'Process name' }));
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent?.trim()),
    ).toEqual(['All processes', 'ImportFile', 'LoadYieldCurves']);
    await user.keyboard('{Escape}');

    // No ImportFile run is Idle: the combination matches nothing.
    await chooseOption(user, 'Status', 'Idle');
    await chooseOption(user, 'Process name', 'ImportFile');

    const activeFilters = await screen.findByRole('list', {
      name: 'Active filters',
    });
    expect(within(activeFilters).getByText('Status: Idle')).toBeInTheDocument();
    expect(
      within(activeFilters).getByText('Process name: ImportFile'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await screen.findByRole('table');
    await waitFor(() => {
      expect(listedIds()).toEqual(newestFirstIds);
    });
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent(
      'All statuses',
    );
    expect(
      screen.getByRole('combobox', { name: 'Process name' }),
    ).toHaveTextContent('All processes');

    unmount();

    // No runs at all: the empty state names the entity.
    mockGet.mockReset();
    mockGet.mockResolvedValue(createEmptyProcessInstanceList());
    renderWorkflowMonitor();

    expect(
      await screen.findByText('No process instances found.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // AC-6
  it('shows a persistent error with Retry when the list cannot load, and Retry reloads it', async () => {
    const user = userEvent.setup();
    mockGet.mockRejectedValue(
      new ServiceError({
        status: 500,
        description: 'The data service could not complete the request.',
        retryable: true,
        kind: 'service-error',
      }),
    );

    renderWorkflowMonitor();

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(
        'The data service could not complete the request.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    mockGet.mockImplementation(serveService(instances));
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    await screen.findByRole('table');
    expect(
      within(rowForInstance(CANONICAL_ID)).getByText('0d41a4449881…'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // AC-7
  it('shows only the selected run with view=single, and "Show all process instances" restores the full list', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveService(instances));
    nav.navigate(`/workflow-monitor?instance=${CANONICAL_ID}&view=single`);

    renderWorkflowMonitor();

    await waitFor(() => {
      expect(listedIds()).toEqual([shortId(CANONICAL_ID)]);
    });

    await user.click(
      screen.getByRole('button', { name: 'Show all process instances' }),
    );

    await waitFor(() => {
      expect(listedIds()).toEqual(newestFirstIds);
    });
    expect(
      screen.queryByRole('button', { name: 'Show all process instances' }),
    ).not.toBeInTheDocument();
  });
});
