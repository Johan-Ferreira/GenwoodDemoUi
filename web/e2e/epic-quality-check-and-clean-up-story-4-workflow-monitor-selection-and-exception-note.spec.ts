/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/app/(app)/workflow-monitor/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (any path containing `/v1/`, i.e. anything sent
 *     through the same-origin `/curve-data` proxy) is dispatched by path, with every
 *     body taken from the project-wide factories in web/src/mocks/data/:
 *       GET /v1/process-instances?Status&ProcessName&Page&Size
 *                                                     → queryProcessInstances(...)
 *       GET /v1/process-instances/{Id}                → process-instance-detail factories
 *                                                       (404 createProcessInstanceNotFound())
 *       GET /v1/process-instances/{Id}/execution-logs → execution-log factories
 *       GET /v1/imports/{Woid}                        → the import factories, keyed by their
 *                                                       STAGING (ImportFile) run id only;
 *                                                       every other id → 404
 *                                                       createImportNotFound() (as live)
 *       anything else                                 → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button as the other specs do — no credentials.
 * - Implementation pattern this assumes:
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - Clicking a row in the "Process instances" region sets BOTH `instance=<Id>` and
 *     `view=single` in the URL (the same deep-linkable view "Open staging run" from
 *     the File log produces): the list narrows to that one run (row
 *     aria-selected="true") and a "Show all process instances" BUTTON appears.
 *   - "Show all process instances" drops `view` but keeps `instance`, so the full
 *     list returns with the run still selected; clicking that same (already
 *     selected) row narrows the list again — `select` must not early-return.
 *   - The selected run's steps card is a region named by the process name; the
 *     execution log is a region named "Execution log"; the audit history is a region
 *     named "Audit history".
 *   - The demo session lives in browser storage and survives page.reload in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic quality-check-and-clean-up, Story 4: Workflow monitor run
 * selection and exception note in Audit history. (The exception-note ACs are
 * Vitest-covered.) playwright.config.ts's webServer block boots the FRONTEND dev
 * server only; every backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import {
  createImport,
  createImportingImport,
  createRateLoadFailedImport,
  createStagedImport,
  createStagingFailedImport,
  createStagingImport,
} from '../src/mocks/data/import';
import {
  createCancelledProcessInstanceDetail,
  createFaultedProcessInstanceDetail,
  createIdleProcessInstanceDetail,
  createImportingStagingProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createProcessInstanceDetail,
  createRateLoadErrorProcessInstanceDetail,
  createRateLoadFailedStagingProcessInstanceDetail,
  createRunningProcessInstanceDetail,
  createStagedProcessInstanceDetail,
  createSuspendedProcessInstanceDetail,
  IMPORT_FILE,
} from '../src/mocks/data/process-instance-detail';
import {
  createProcessInstances,
  queryProcessInstances,
} from '../src/mocks/data/process-instance';
import {
  createEmptyExecutionLogList,
  createExecutionLog,
  createExecutionLogList,
  createExecutionLogs,
  createFaultedExecutionLogs,
  createLoadYieldCurvesExecutionLogs,
  createRateLoadErrorExecutionLogs,
  createRunningExecutionLogs,
} from '../src/mocks/data/execution-log';
import {
  createImportNotFound,
  createProcessInstanceNotFound,
} from '../src/mocks/data/message';

import type { Locator, Page } from '@playwright/test';
import type {
  ExecutionLogRead,
  ExecutionLogReadList,
  ImportRead,
  ProcessInstanceDetailRead,
  ProcessInstanceRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const SHOW_ALL = 'Show all process instances';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

/** The detail (with steps) the service returns for a process-instance row. */
function detailForRun(row: ProcessInstanceRead): ProcessInstanceDetailRead {
  const named = [
    createProcessInstanceDetail(),
    createFaultedProcessInstanceDetail(),
    createRunningProcessInstanceDetail(),
    createStagedProcessInstanceDetail(),
    createImportingStagingProcessInstanceDetail(),
    createRateLoadFailedStagingProcessInstanceDetail(),
    createLoadYieldCurvesProcessInstanceDetail(),
    createRateLoadErrorProcessInstanceDetail(),
    createSuspendedProcessInstanceDetail(),
    createCancelledProcessInstanceDetail(),
    createIdleProcessInstanceDetail(),
  ].find((detail) => detail.ProcessInstanceId === row.ProcessInstanceId);
  if (named) return named;
  if (row.ProcessName === IMPORT_FILE) {
    return row.CurrentStatus === 'Faulted'
      ? createFaultedProcessInstanceDetail({ ...row })
      : createProcessInstanceDetail({ ...row });
  }
  return createLoadYieldCurvesProcessInstanceDetail({ ...row });
}

/** Execution logs the mocked service knows, by run ID (others have none). */
function knownLogs(): Map<string, ExecutionLogReadList> {
  const pairs: Array<[ProcessInstanceDetailRead, ExecutionLogRead[]]> = [
    [createProcessInstanceDetail(), createExecutionLogs()],
    [createFaultedProcessInstanceDetail(), createFaultedExecutionLogs()],
    [createRunningProcessInstanceDetail(), createRunningExecutionLogs()],
    [
      createLoadYieldCurvesProcessInstanceDetail(),
      createLoadYieldCurvesExecutionLogs(),
    ],
    [
      createRateLoadErrorProcessInstanceDetail(),
      createRateLoadErrorExecutionLogs(),
    ],
  ];
  return new Map(
    pairs.map(([run, logs]) => [
      required(run.ProcessInstanceId, 'ProcessInstanceId'),
      createExecutionLogList(logs),
    ]),
  );
}

/** Import traces by WOID — keyed ONLY by each trace's staging (ImportFile) run id. */
function knownImports(): Map<string, ImportRead> {
  return new Map(
    [
      createImport(),
      createImportingImport(),
      createRateLoadFailedImport(),
      createStagingFailedImport(),
      createStagedImport(),
      createStagingImport(),
    ].map((trace) => [
      required(
        trace.StagingProcessInstance?.ProcessInstanceId,
        'StagingProcessInstance.ProcessInstanceId',
      ),
      trace,
    ]),
  );
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockDataService(page: Page): Promise<void> {
  const instances = createProcessInstances();
  const runs = new Map(
    instances.map((row) => [
      required(row.ProcessInstanceId, 'ProcessInstanceId'),
      detailForRun(row),
    ]),
  );
  const logs = knownLogs();
  const imports = knownImports();

  await page.route(
    (url) => url.pathname.includes('/v1/'),
    (route) => {
      const { pathname, searchParams } = new URL(route.request().url());

      if (/\/v1\/process-instances$/.test(pathname)) {
        const pageParam = searchParams.get('Page');
        const sizeParam = searchParams.get('Size');
        return route.fulfill({
          status: 200,
          json: queryProcessInstances(instances, {
            Status: searchParams.get('Status') ?? undefined,
            ProcessName: searchParams.get('ProcessName') ?? undefined,
            Page: pageParam ? Number(pageParam) : undefined,
            Size: sizeParam ? Number(sizeParam) : undefined,
          }),
        });
      }

      const runLogs = /\/v1\/process-instances\/([^/]+)\/execution-logs$/.exec(
        pathname,
      );
      if (runLogs) {
        if (!runs.has(runLogs[1])) {
          return route.fulfill({
            status: 404,
            json: createProcessInstanceNotFound(),
          });
        }
        return route.fulfill({
          status: 200,
          json: logs.get(runLogs[1]) ?? createEmptyExecutionLogList(),
        });
      }

      const instance = /\/v1\/process-instances\/([^/]+)$/.exec(pathname);
      if (instance) {
        const run = runs.get(instance[1]);
        return run
          ? route.fulfill({ status: 200, json: run })
          : route.fulfill({
              status: 404,
              json: createProcessInstanceNotFound(),
            });
      }

      const trace = /\/v1\/imports\/([^/]+)$/.exec(pathname);
      if (trace) {
        const found = imports.get(trace[1]);
        return found
          ? route.fulfill({ status: 200, json: found })
          : route.fulfill({ status: 404, json: createImportNotFound() });
      }

      return route.abort();
    },
  );
}

/** Sign in through the demo session and wait for Overview inside the frame. */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

/** True when the URL is the Workflow monitor showing only this run. */
function isSingleRunView(url: URL, instanceId: string): boolean {
  return (
    url.pathname === '/workflow-monitor' &&
    url.searchParams.get('instance') === instanceId &&
    url.searchParams.get('view') === 'single'
  );
}

/** The data rows of the Process instances table. */
function processInstanceRows(page: Page): Locator {
  return page
    .getByRole('region', { name: 'Process instances' })
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** The Process instances table row for a run, by its 12-character shortened Id. */
function runRow(page: Page, runId: string): Locator {
  return processInstanceRows(page).filter({ hasText: runId.slice(0, 12) });
}

/** The selected run's steps card, named by the process name. */
function stepsCard(page: Page, run: ProcessInstanceDetailRead): Locator {
  return page.getByRole('region', {
    name: required(run.ProcessName, 'ProcessName'),
    exact: true,
  });
}

/** Open the Workflow monitor and wait for the full, unnarrowed list. */
async function openFullList(page: Page): Promise<void> {
  await page.goto('/workflow-monitor');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Workflow monitor' }),
  ).toBeVisible();
  await expect(processInstanceRows(page)).toHaveCount(
    createProcessInstances().length,
  );
}

/** The run is the only row, selected, with its steps, log and audit history below. */
async function expectSingleRunShown(
  page: Page,
  run: ProcessInstanceDetailRead,
): Promise<void> {
  const runId = required(run.ProcessInstanceId, 'ProcessInstanceId');
  await expect(processInstanceRows(page)).toHaveCount(1);
  await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: SHOW_ALL })).toBeVisible();

  const card = stepsCard(page, run);
  await expect(card).toBeVisible();
  await expect(card).toContainText(runId);

  const logMessage = required(createExecutionLog().Message, 'Message');
  await expect(
    page
      .getByRole('region', { name: 'Execution log' })
      .getByRole('row')
      .filter({ hasText: logMessage }),
  ).toBeVisible();

  await expect(
    page.getByRole('region', { name: 'Audit history' }),
  ).toContainText(
    required(run.LastExecutedActivityName, 'LastExecutedActivityName'),
  );
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic quality-check-and-clean-up, Story 4: Workflow monitor run selection', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
    await signIn(page);
  });

  // AC-1
  test('clicking a run narrows the list to it, shows its details and "Show all process instances", and survives a reload', async ({
    page,
  }) => {
    const run = createProcessInstanceDetail();
    const runId = required(run.ProcessInstanceId, 'ProcessInstanceId');

    await openFullList(page);
    await runRow(page, runId).click();

    // Same deep-linkable single-run view as "Open staging run" from the File log.
    await expect(page).toHaveURL((url) => isSingleRunView(url, runId));
    await expectSingleRunShown(page, run);

    // The narrowed, selected state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // Reloading keeps the same single-run view.
    await page.reload();
    await expect(page).toHaveURL((url) => isSingleRunView(url, runId));
    await expectSingleRunShown(page, run);
  });

  // AC-2
  test('"Show all process instances" restores the full list with the run selected, and clicking it again narrows once more', async ({
    page,
  }) => {
    const run = createProcessInstanceDetail();
    const runId = required(run.ProcessInstanceId, 'ProcessInstanceId');

    await openFullList(page);
    await runRow(page, runId).click();
    await expect(processInstanceRows(page)).toHaveCount(1);

    await page.getByRole('button', { name: SHOW_ALL }).click();

    // Full list back, `view` dropped, the run still selected.
    await expect(processInstanceRows(page)).toHaveCount(
      createProcessInstances().length,
    );
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('view') === null &&
        url.searchParams.get('instance') === runId,
    );
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: SHOW_ALL })).toHaveCount(0);

    // Clicking the already-selected run narrows the list again.
    await runRow(page, runId).click();
    await expect(page).toHaveURL((url) => isSingleRunView(url, runId));
    await expectSingleRunShown(page, run);
  });
});
