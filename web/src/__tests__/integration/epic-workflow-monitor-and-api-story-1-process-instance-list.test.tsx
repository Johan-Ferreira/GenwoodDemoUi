/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/app/(app)/workflow-monitor/page.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 1: Process instance list
 * (vitest-tagged ACs: 1, 4, 5, 6).
 *
 * Production contracts these tests define (implement to them):
 * - The Workflow monitor page loads process instances through `get`
 *   (GET /v1/process-instances, via `getProcessInstances` in
 *   web/src/lib/api/endpoints.ts) inside DataState, sending the Status /
 *   ProcessName / Page / Size query parameters (paging is service-driven).
 * - The "Process instances" table has the column headers Instance ID, Process,
 *   Context (WOID), Created, Last executed, Last activity, Status, and shows rows
 *   newest first by CreatedAt whatever order the service returns.
 * - Instance ID shows its first 12 characters followed by "…"; the WOID
 *   (ContextId) is shown in its own column; a missing timestamp or last activity
 *   renders the neutral placeholder "—".
 * - Status is a StatusChip (text label + `data-tone`): Finished=success,
 *   Faulted=danger, Running=info, Idle / Suspended / Cancelled=neutral (BR4).
 * - Each column header is a `columnheader` containing a button; first choice sorts
 *   ascending, second descending, and the active column carries `aria-sort`.
 * - The process-name filter is a free-text input labelled "Process name",
 *   applied when committed (blur / Enter). No matches -> an "Active filters" list
 *   naming each active filter as "<label>: <value>" plus a "Clear all" button.
 * - No runs at all -> "No process instances found." and no table.
 * - Load failure -> DataState's persistent role="alert" message with Retry,
 *   which reloads the list.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation is
 * stubbed because the App Router is not mounted under jsdom. Payloads come from
 * the project-wide factories in @/mocks/data.
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/workflow-monitor',
  useSearchParams: () => new URLSearchParams(),
}));

/** Behaves like GET /v1/process-instances: filters and pages by the query parameters. */
function serveProcessInstances(instances: ProcessInstanceRead[]) {
  return async (endpoint: string, params?: QueryParams) => {
    if (endpoint !== '/v1/process-instances') {
      throw new Error(`Unexpected endpoint in test: ${endpoint}`);
    }
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

/** The table row for an instance, found by its leading shortened ID. */
function rowForInstance(id: string | undefined): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(`^${shortId(id)}`) });
}

/** The Instance ID cell (first column) of each data row, top to bottom. */
function listedIds(): string[] {
  const table = screen.getByRole('table');
  return within(table)
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

const instances = createProcessInstances();
const newestFirstIds = instances.map((p) => shortId(p.ProcessInstanceId));

describe('Epic workflow-monitor-and-api, Story 1: Process instance list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('lists process instances newest first with the brief columns, a shortened ID, the WOID, placeholders for missing values and labelled status chips', async () => {
    // Service order deliberately oldest first: the page must show newest first.
    mockGet.mockResolvedValue(
      createProcessInstanceList({ ProcessInstances: [...instances].reverse() }),
    );

    renderWorkflowMonitor();

    const table = await screen.findByRole('table');
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

    // Canonical Finished instance.
    const finished = rowForInstance('6645057045ca4ce59a9827c6f5138246');
    expect(within(finished).getByText('6645057045ca…')).toBeInTheDocument();
    expect(
      within(finished).queryByText('6645057045ca4ce59a9827c6f5138246'),
    ).not.toBeInTheDocument();
    expect(within(finished).getByText('ImportCurveFile')).toBeInTheDocument();
    expect(within(finished).getByText(/^0d41a444/)).toBeInTheDocument();
    expect(
      within(finished).getByText('2026-09-30 18:02:11'),
    ).toBeInTheDocument();
    expect(
      within(finished).getByText('2026-09-30 18:02:19'),
    ).toBeInTheDocument();
    expect(within(finished).getByText('PublishCurves')).toBeInTheDocument();

    // Idle instance never executed: Last executed and Last activity both absent.
    const idle = rowForInstance('f6a7b8c9d0e14f2a3b4c5d6e7f8091a2');
    expect(within(idle).getAllByText('—')).toHaveLength(2);

    // Status chips carry their text label, toned by intent (others neutral).
    const expectations: Array<[string, string, string]> = [
      ['6645057045ca4ce59a9827c6f5138246', 'Finished', 'success'],
      ['b7c8d9e0f1a24b3c8d9e0f1a2b3c4d5e', 'Faulted', 'danger'],
      ['c1d2e3f4a5b64c7d8e9f0a1b2c3d4e5f', 'Running', 'info'],
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
    mockGet.mockImplementation(serveProcessInstances(instances));

    renderWorkflowMonitor();
    await screen.findByRole('table');
    await waitFor(() => {
      expect(listedIds()).toHaveLength(instances.length);
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
  it('names the active filter with Clear all when nothing matches, and says no process instances were found when there are none', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveProcessInstances(instances));

    const { unmount } = renderWorkflowMonitor();
    await screen.findByRole('table');

    const processName = screen.getByRole('textbox', { name: 'Process name' });
    await user.type(processName, 'NoSuchProcess');
    await user.tab();

    const activeFilters = await screen.findByRole('list', {
      name: 'Active filters',
    });
    expect(
      within(activeFilters).getByText('Process name: NoSuchProcess'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await screen.findByRole('table');
    await waitFor(() => {
      expect(listedIds()).toEqual(newestFirstIds);
    });
    expect(screen.getByRole('textbox', { name: 'Process name' })).toHaveValue(
      '',
    );

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

    mockGet.mockImplementation(serveProcessInstances(instances));
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    const table = await screen.findByRole('table');
    expect(within(table).getByText('6645057045ca…')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
