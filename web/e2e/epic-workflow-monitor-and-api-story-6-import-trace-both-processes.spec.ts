/**
 * Story Metadata:
 * - Route: /file-log/imports/[woid]
 * - Target File: web/src/components/file-log/ImportTrace.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (any path containing `/v1/`, i.e. anything sent
 *     through the same-origin `/curve-data` proxy) is dispatched by path, with every
 *     body taken from (or composed from) the project-wide factories in
 *     web/src/mocks/data/:
 *       GET /v1/files                               → createFileList()
 *       GET /v1/files/{Id}                          → file-detail factories by Id
 *                                                     (404 "File not found" otherwise)
 *       GET /v1/process-instances?Status&ProcessName&Page&Size
 *                                                   → queryProcessInstances(...)
 *       GET /v1/process-instances/{Id}              → process-instance-detail factories
 *                                                     (404 createProcessInstanceNotFound())
 *       GET /v1/process-instances/{Id}/execution-logs → execution-log factories
 *       GET /v1/imports/{Woid}                      → import factories keyed by the
 *                                                     file's Woid (the ImportFile run);
 *                                                     404 createImportNotFound() otherwise
 *       anything else                               → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button as the other specs do — no credentials.
 * - Implementation pattern this assumes (two-stage status model, 2026-10-05):
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - The Import trace renders two named regions (section with an h2 title): a
 *     staging one (title matching /staging/i, built from StagingProcessInstance —
 *     the ImportFile run, id = File.Woid) and a rate load one (title matching
 *     /rate ?load/i, built from RateLoadProcessInstance — the LoadYieldCurves run,
 *     id = File.WorkflowInstanceId). Each has an "Open workflow" LINK.
 *   - FileDetailCard shows an "Open staging run" LINK (to the file's Woid) and, once
 *     RateLoad has started, an "Open import run" LINK (to WorkflowInstanceId).
 *   - Every one of these links goes to
 *     /workflow-monitor?instance=<runId>&view=single&file=<File.Id>.
 *   - With view=single the "Process instances" region lists ONLY the selected run
 *     (row aria-selected="true"); the selected run's steps card is a region named by
 *     its process name (ImportFile / LoadYieldCurves) carrying the full run ID.
 *   - The demo session lives in browser storage and survives page.goto in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 6: Import trace shows both
 * processes, and Open workflow opens the right run.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import { createFiles } from '../src/mocks/data/file';
import { createFileList } from '../src/mocks/data/file-list';
import {
  createFailedFileDetail,
  createFileDetail,
  createImportingFileDetail,
  createRateLoadFailedFileDetail,
  createStagedFileDetail,
  createStagingFileDetail,
  createSupersededFileDetail,
} from '../src/mocks/data/file-detail';
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
  createExecutionLogList,
  createExecutionLogs,
  createFaultedExecutionLogs,
  createLoadYieldCurvesExecutionLogs,
  createRateLoadErrorExecutionLogs,
  createRunningExecutionLogs,
} from '../src/mocks/data/execution-log';
import {
  createImportNotFound,
  createMessage,
  createProcessInstanceNotFound,
} from '../src/mocks/data/message';

import type { Locator, Page } from '@playwright/test';
import type {
  ExecutionLogReadList,
  FileDetailRead,
  FileRead,
  ImportRead,
  ProcessInstanceDetailRead,
  ProcessInstanceRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

/** The named file-detail variants the mocked service knows. */
function namedFileDetails(): FileDetailRead[] {
  return [
    createFileDetail(),
    createSupersededFileDetail({ IsCurrent: true }),
    createStagingFileDetail(),
    createStagedFileDetail(),
    createImportingFileDetail(),
    createRateLoadFailedFileDetail(),
    createFailedFileDetail(),
  ];
}

/** The detail the service returns for a file-list row (named variants first). */
function detailForFile(file: FileRead): FileDetailRead {
  const named = namedFileDetails().find((detail) => detail.Id === file.Id);
  if (named) return named;
  if (file.Status === 'Failed') return createFailedFileDetail({ ...file });
  return createFileDetail({ ...file });
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
  const pairs: Array<[ProcessInstanceDetailRead, ExecutionLogReadList]> = [
    [
      createProcessInstanceDetail(),
      createExecutionLogList(createExecutionLogs()),
    ],
    [
      createFaultedProcessInstanceDetail(),
      createExecutionLogList(createFaultedExecutionLogs()),
    ],
    [
      createRunningProcessInstanceDetail(),
      createExecutionLogList(createRunningExecutionLogs()),
    ],
    [
      createLoadYieldCurvesProcessInstanceDetail(),
      createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
    ],
    [
      createRateLoadErrorProcessInstanceDetail(),
      createExecutionLogList(createRateLoadErrorExecutionLogs()),
    ],
  ];
  return new Map(
    pairs.map(([run, logs]) => [
      required(run.ProcessInstanceId, 'ProcessInstanceId'),
      logs,
    ]),
  );
}

/** Import traces by WOID (the file's ImportFile run); any other WOID is a 404. */
function knownImports(): Map<string, ImportRead> {
  const traces = [
    createImport(),
    createImportingImport(),
    createRateLoadFailedImport(),
    createStagingFailedImport(),
    createStagedImport(),
    createStagingImport(),
  ];
  return new Map(
    traces.map((trace) => [required(trace.File?.Woid, 'File.Woid'), trace]),
  );
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockDataService(page: Page): Promise<void> {
  const fileList = createFileList();
  const filesById = new Map(
    createFiles()
      .map(detailForFile)
      .map((detail) => [required(detail.Id, 'File.Id'), detail]),
  );
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

      if (/\/v1\/files$/.test(pathname)) {
        return route.fulfill({ status: 200, json: fileList });
      }

      const file = /\/v1\/files\/(\d+)$/.exec(pathname);
      if (file) {
        const detail = filesById.get(Number(file[1]));
        return detail
          ? route.fulfill({ status: 200, json: detail })
          : route.fulfill({
              status: 404,
              json: createMessage('File not found'),
            });
      }

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

/** True when the URL is the Workflow monitor showing only this run, carrying the file. */
function isSingleRunView(url: URL, runId: string, fileId: number): boolean {
  return (
    url.pathname === '/workflow-monitor' &&
    url.searchParams.get('instance') === runId &&
    url.searchParams.get('view') === 'single' &&
    url.searchParams.get('file') === String(fileId)
  );
}

/** The data rows of the Process instances table. */
function processInstanceRows(page: Page): Locator {
  return page
    .getByRole('region', { name: 'Process instances' })
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** Assert the monitor lists only this run, selected, with its steps card open. */
async function expectOnlyRunSelected(
  page: Page,
  run: ProcessInstanceDetailRead,
): Promise<void> {
  const runId = required(run.ProcessInstanceId, 'ProcessInstanceId');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Workflow monitor' }),
  ).toBeVisible();
  await expect(processInstanceRows(page)).toHaveCount(1);
  await expect(
    processInstanceRows(page).filter({ hasText: runId.slice(0, 12) }),
  ).toHaveAttribute('aria-selected', 'true');
  const steps = page.getByRole('region', {
    name: required(run.ProcessName, 'ProcessName'),
    exact: true,
  });
  await expect(steps).toBeVisible();
  await expect(steps).toContainText(runId);
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic workflow-monitor-and-api, Story 6: Import trace shows both processes', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
    await signIn(page);
  });

  // AC-3
  test('each trace section\'s "Open workflow" opens the Workflow monitor with only that run, selected', async ({
    page,
  }) => {
    // File 106: staged fine, then RateLoad failed — so the trace has both runs.
    const trace = createRateLoadFailedImport();
    const file = required(trace.File, 'File');
    const fileId = required(file.Id, 'File.Id');
    const stagingRun = required(
      trace.StagingProcessInstance,
      'StagingProcessInstance',
    );
    const rateLoadRun = required(
      trace.RateLoadProcessInstance,
      'RateLoadProcessInstance',
    );
    const tracePath = `/file-log/imports/${required(file.Woid, 'File.Woid')}`;

    await page.goto(tracePath);
    const main = page.getByRole('main');
    const stagingSection = main.getByRole('region', { name: /staging/i });
    const rateLoadSection = main.getByRole('region', { name: /rate ?load/i });
    await expect(stagingSection).toContainText(
      required(stagingRun.ProcessInstanceId, 'ProcessInstanceId'),
    );
    await expect(rateLoadSection).toContainText(
      required(rateLoadRun.ProcessInstanceId, 'ProcessInstanceId'),
    );

    // The two-section trace passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // Staging section → the ImportFile run (the file's Woid), on its own.
    await stagingSection.getByRole('link', { name: 'Open workflow' }).click();
    await expect(page).toHaveURL((url) =>
      isSingleRunView(
        url,
        required(stagingRun.ProcessInstanceId, 'ProcessInstanceId'),
        fileId,
      ),
    );
    await expectOnlyRunSelected(page, stagingRun);

    // Back to the trace, then the rate load section → the LoadYieldCurves run.
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === tracePath);
    await rateLoadSection.getByRole('link', { name: 'Open workflow' }).click();
    await expect(page).toHaveURL((url) =>
      isSingleRunView(
        url,
        required(rateLoadRun.ProcessInstanceId, 'ProcessInstanceId'),
        fileId,
      ),
    );
    await expectOnlyRunSelected(page, rateLoadRun);
  });

  // AC-4
  test('"Open staging run" and "Open import run" in a file\'s details open its ImportPro and RateLoad runs, each on its own', async ({
    page,
  }) => {
    const file = createRateLoadFailedFileDetail();
    const fileId = required(file.Id, 'File.Id');
    const stagingRun = createRateLoadFailedStagingProcessInstanceDetail();
    const rateLoadRun = createRateLoadErrorProcessInstanceDetail();

    await page.goto(`/file-log?file=${fileId}`);
    const details = page.getByRole('region', {
      name: required(file.FileName, 'FileName'),
    });
    await expect(
      details.getByRole('link', { name: 'Open import run' }),
    ).toBeVisible();

    // The details card with both run links passes the accessibility scan.
    await expectNoA11yViolations(page);

    // "Open staging run" → the file's ImportFile run (its Woid).
    await details.getByRole('link', { name: 'Open staging run' }).click();
    await expect(page).toHaveURL((url) =>
      isSingleRunView(url, required(file.Woid, 'File.Woid'), fileId),
    );
    await expectOnlyRunSelected(page, stagingRun);

    // Back to the file, then "Open import run" → its RateLoad run (WorkflowInstanceId).
    await page.goBack();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/file-log' &&
        url.searchParams.get('file') === String(fileId),
    );
    await details.getByRole('link', { name: 'Open import run' }).click();
    await expect(page).toHaveURL((url) =>
      isSingleRunView(
        url,
        required(file.WorkflowInstanceId, 'WorkflowInstanceId'),
        fileId,
      ),
    );
    await expectOnlyRunSelected(page, rateLoadRun);
  });
});
