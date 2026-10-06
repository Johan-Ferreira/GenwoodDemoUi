/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/app/(app)/file-log/page.tsx
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
 *                                                     file's Woid; 404 otherwise
 *       anything else                               → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button — no credentials.
 * - Implementation pattern this assumes:
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - The File log table has NO "WOID" column; a row is found by its "#" (Id) cell.
 *   - The file details card (a region named by the file name) lists
 *     "Staging instance ID" and "Rate load instance ID" in place of "WOID" and
 *     "Workflow instance"; the values are unchanged (BR2).
 *   - "Open staging run" still links to
 *     /workflow-monitor?instance=<File.Woid>&view=single&file=<File.Id>, and
 *     "Trace import" still links to /file-log/imports/<File.Woid> (BR1).
 *   - The Import trace's "File log entry" region has no "WOID" term, while the
 *     staging and rate load regions keep their "Instance ID" terms.
 *   - The demo session lives in browser storage and survives navigation in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic quality-check-and-clean-up, Story 1: Plain-language
 * identifiers on Overview, File log and Import trace.
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
  createRateLoadErrorExecutionLogs,
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

/** The detail the service returns for a file-list row (named variants first). */
function detailForFile(file: FileRead): FileDetailRead {
  const named = [
    createFileDetail(),
    createSupersededFileDetail({ IsCurrent: true }),
    createStagingFileDetail(),
    createStagedFileDetail(),
    createImportingFileDetail(),
    createRateLoadFailedFileDetail(),
    createFailedFileDetail(),
  ].find((detail) => detail.Id === file.Id);
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
  return new Map([
    [
      required(
        createRateLoadErrorProcessInstanceDetail().ProcessInstanceId,
        'ProcessInstanceId',
      ),
      createExecutionLogList(createRateLoadErrorExecutionLogs()),
    ],
  ]);
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

/** The File log table row for a file, found by its "#" (Id) cell. */
function fileRow(page: Page, detail: FileDetailRead): Locator {
  return page.getByRole('row').filter({
    has: page.getByRole('cell', {
      name: String(required(detail.Id, 'File.Id')),
      exact: true,
    }),
  });
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

/** A `<dt>` in a region whose text is exactly `label`. */
function term(scope: Locator, label: string): Locator {
  return scope.getByRole('term').filter({ hasText: new RegExp(`^${label}$`) });
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic quality-check-and-clean-up, Story 1: Plain-language identifiers', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
    await signIn(page);
  });

  // AC-4
  test('from a selected file, "Open staging run" and "Trace import" still open the same run and import trace', async ({
    page,
  }) => {
    // File 106: staged fine, then RateLoad failed — so it has both run IDs.
    const file = createRateLoadFailedFileDetail();
    const fileId = required(file.Id, 'File.Id');
    const fileName = required(file.FileName, 'FileName');
    const woid = required(file.Woid, 'File.Woid');
    const stagingRun = createRateLoadFailedStagingProcessInstanceDetail();
    const trace = createRateLoadFailedImport();
    const rateLoadRun = required(
      trace.RateLoadProcessInstance,
      'RateLoadProcessInstance',
    );

    await page.goto('/file-log');
    await expect(
      page.getByRole('columnheader', { name: 'WOID', exact: true }),
    ).toHaveCount(0);
    await fileRow(page, file).click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/file-log' &&
        url.searchParams.get('file') === String(fileId),
    );

    const details = page.getByRole('region', { name: fileName });
    await expect(term(details, 'Staging instance ID')).toBeVisible();
    await expect(term(details, 'Rate load instance ID')).toBeVisible();

    // The renamed details state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // "Open staging run" → the file's own ImportFile run (its Woid), on its own.
    await details.getByRole('link', { name: 'Open staging run' }).click();
    await expect(page).toHaveURL((url) => isSingleRunView(url, woid, fileId));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Workflow monitor' }),
    ).toBeVisible();
    await expect(processInstanceRows(page)).toHaveCount(1);
    const steps = page.getByRole('region', {
      name: required(stagingRun.ProcessName, 'ProcessName'),
      exact: true,
    });
    await expect(steps).toContainText(
      required(stagingRun.ProcessInstanceId, 'ProcessInstanceId'),
    );

    // Back to the file, then "Trace import" → that file's import trace.
    await page.goBack();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/file-log' &&
        url.searchParams.get('file') === String(fileId),
    );
    await details.getByRole('link', { name: 'Trace import' }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/file-log/imports/${woid}`,
    );

    const main = page.getByRole('main');
    const entry = main.getByRole('region', { name: 'File log entry' });
    await expect(entry).toContainText(fileName);
    await expect(term(entry, 'WOID')).toHaveCount(0);

    const stagingSection = main.getByRole('region', { name: 'Staging run' });
    const rateLoadSection = main.getByRole('region', { name: 'Rate load run' });
    await expect(term(stagingSection, 'Instance ID')).toBeVisible();
    await expect(stagingSection).toContainText(woid);
    await expect(term(rateLoadSection, 'Instance ID')).toBeVisible();
    await expect(rateLoadSection).toContainText(
      required(rateLoadRun.ProcessInstanceId, 'ProcessInstanceId'),
    );

    // The trace without its WOID row passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });
});
