/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/file-log/FileDetailCard.tsx
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
 *       GET /v1/imports/{Woid}                      → import factories, ONLY for
 *                                                     ImportFile run IDs (= file Woid);
 *                                                     404 createImportNotFound() otherwise
 *                                                     (e.g. every LoadYieldCurves run)
 *       anything else                               → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button as the other specs do — no credentials.
 * - Implementation pattern this assumes (contract correction, 2026-10-05):
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - The live service returns no ContextId. A file's Woid IS the ProcessInstanceId
 *     of its ImportFile run; the file's WorkflowInstanceId points at the later
 *     LoadYieldCurves run and is NOT used for navigation.
 *   - FileDetailCard shows an "Open workflow" LINK (Button asChild + next/link) to
 *     /workflow-monitor?instance=<file.Woid>&view=single — for every file, failed
 *     ones included.
 *   - With view=single the "Process instances" region (a card named by its
 *     "Process instances" heading) lists ONLY the selected run; its row carries
 *     aria-selected="true". A "Show all process instances" BUTTON removes view=single
 *     and the full list comes back.
 *   - The selected run's steps card is a region named by the process name
 *     (ImportFile), listing each step's raw name and state label; the subtitle
 *     carries the full run ID.
 *   - The selected run view offers an "Open file log entry" BUTTON that resolves the
 *     run's own ProcessInstanceId as the WOID via GET /v1/imports/{Woid} and
 *     navigates to /file-log?file=<File.Id>; the File log then shows that file's row
 *     selected (aria-selected="true") and its details card (region named by the file
 *     name).
 *   - The execution log is a table whose rows show time, activity, event and message.
 *   - The demo session lives in browser storage and survives page.goto in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 3: Move between a file and its run.
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
  createProcessingFileDetail,
  createSupersededFileDetail,
} from '../src/mocks/data/file-detail';
import {
  createFailedImport,
  createImport,
  createProcessingImport,
} from '../src/mocks/data/import';
import {
  createCancelledProcessInstanceDetail,
  createFaultedProcessInstanceDetail,
  createIdleProcessInstanceDetail,
  createLoadYieldCurvesProcessInstanceDetail,
  createProcessInstanceDetail,
  createRunningProcessInstanceDetail,
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

/** The detail the service returns for a file-list row (named variants first). */
function detailForFile(file: FileRead): FileDetailRead {
  const named = [
    createFileDetail(),
    createSupersededFileDetail(),
    createFailedFileDetail(),
    createProcessingFileDetail(),
  ].find((detail) => detail.Id === file.Id);
  if (named) return named;
  if (file.Status === 'Failed') return createFailedFileDetail({ ...file });
  if (file.Status === 'Processing') {
    return createProcessingFileDetail({ ...file });
  }
  return createFileDetail({ ...file });
}

/** The detail (with steps) the service returns for a process-instance row. */
function detailForRun(row: ProcessInstanceRead): ProcessInstanceDetailRead {
  const named = [
    createProcessInstanceDetail(),
    createFaultedProcessInstanceDetail(),
    createRunningProcessInstanceDetail(),
    createLoadYieldCurvesProcessInstanceDetail(),
    createCancelledProcessInstanceDetail(),
    createSuspendedProcessInstanceDetail(),
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
      required(createProcessInstanceDetail().ProcessInstanceId, 'Id'),
      createExecutionLogList(createExecutionLogs()),
    ],
    [
      required(createFaultedProcessInstanceDetail().ProcessInstanceId, 'Id'),
      createExecutionLogList(createFaultedExecutionLogs()),
    ],
    [
      required(createRunningProcessInstanceDetail().ProcessInstanceId, 'Id'),
      createExecutionLogList(createRunningExecutionLogs()),
    ],
    [
      required(
        createLoadYieldCurvesProcessInstanceDetail().ProcessInstanceId,
        'Id',
      ),
      createExecutionLogList(createLoadYieldCurvesExecutionLogs()),
    ],
  ]);
}

/**
 * Import traces by WOID: one per ImportFile run (its ID is its file's Woid).
 * LoadYieldCurves runs get none, so the service answers 404 for them.
 */
function knownImports(
  runs: Map<string, ProcessInstanceDetailRead>,
  filesByWoid: Map<string, FileDetailRead>,
): Map<string, ImportRead> {
  const imports = new Map<string, ImportRead>();
  for (const [id, run] of runs) {
    const file = filesByWoid.get(id);
    if (run.ProcessName !== IMPORT_FILE || !file) continue;
    const parts = { File: file, ProcessInstance: run };
    if (run.CurrentStatus === 'Faulted') {
      imports.set(id, createFailedImport(parts));
    } else if (run.CurrentStatus === 'Running') {
      imports.set(id, createProcessingImport(parts));
    } else {
      imports.set(id, createImport(parts));
    }
  }
  return imports;
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockDataService(page: Page): Promise<void> {
  const fileList = createFileList();
  const fileDetails = createFiles().map(detailForFile);
  const filesById = new Map(
    fileDetails.map((detail) => [required(detail.Id, 'File.Id'), detail]),
  );
  const filesByWoid = new Map(
    fileDetails.map((detail) => [required(detail.Woid, 'File.Woid'), detail]),
  );
  const instances = createProcessInstances();
  const runs = new Map(
    instances.map((row) => [
      required(row.ProcessInstanceId, 'ProcessInstanceId'),
      detailForRun(row),
    ]),
  );
  const logs = knownLogs();
  const imports = knownImports(runs, filesByWoid);

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

/** True when the URL is the Workflow monitor showing only this run. */
function isSingleRunView(url: URL, instanceId: string): boolean {
  return (
    url.pathname === '/workflow-monitor' &&
    url.searchParams.get('instance') === instanceId &&
    url.searchParams.get('view') === 'single'
  );
}

/** The File log table row for a file, found by its unique shortened WOID. */
function fileRow(page: Page, detail: FileDetailRead): Locator {
  return page
    .getByRole('row')
    .filter({ hasText: required(detail.Woid, 'Woid').slice(0, 8) });
}

/** The File log details card, named by the file's title. */
function fileDetails(page: Page, detail: FileDetailRead): Locator {
  return page.getByRole('region', {
    name: required(detail.FileName, 'FileName'),
  });
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

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic workflow-monitor-and-api, Story 3: Move between a file and its run', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
    await signIn(page);
  });

  // AC-1
  test('"Open workflow" on a file\'s details opens the Workflow monitor with only that file\'s run, selected', async ({
    page,
  }) => {
    const file = createFileDetail();
    const run = createProcessInstanceDetail();
    const runId = required(file.Woid, 'Woid');
    const loadYieldCurvesRun = createLoadYieldCurvesProcessInstanceDetail();

    await page.goto(`/file-log?file=${required(file.Id, 'File.Id')}`);
    const details = fileDetails(page, file);
    await expect(
      details.getByRole('heading', {
        name: required(file.FileName, 'FileName'),
      }),
    ).toBeVisible();

    await details.getByRole('link', { name: 'Open workflow' }).click();

    // The link opens the file's own ImportFile run (its Woid), in single-run view.
    await expect(page).toHaveURL((url) => isSingleRunView(url, runId));
    await expect(
      page.getByRole('heading', { level: 1, name: 'Workflow monitor' }),
    ).toBeVisible();

    // Only that run is listed, and it is the selected one.
    await expect(processInstanceRows(page)).toHaveCount(1);
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');

    const card = stepsCard(page, run);
    await expect(card).toBeVisible();
    await expect(card).toContainText(runId);

    // The single-run, selected state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // "Show all process instances" brings the full list back, run still selected.
    await page
      .getByRole('button', { name: 'Show all process instances' })
      .click();
    await expect(processInstanceRows(page)).toHaveCount(
      createProcessInstances().length,
    );
    await expect(page).toHaveURL(
      (url) => url.searchParams.get('view') !== 'single',
    );
    await expect(
      runRow(
        page,
        required(loadYieldCurvesRun.ProcessInstanceId, 'ProcessInstanceId'),
      ),
    ).toBeVisible();
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');
  });

  // AC-2
  test('"Open file log entry" on a selected run opens the File log with that run\'s file selected', async ({
    page,
  }) => {
    const run = createProcessInstanceDetail();
    const file = createFileDetail();
    const fileId = required(file.Id, 'File.Id');

    await page.goto(
      `/workflow-monitor?instance=${required(run.ProcessInstanceId, 'ProcessInstanceId')}`,
    );
    await expect(stepsCard(page, run)).toBeVisible();

    await page.getByRole('button', { name: 'Open file log entry' }).click();

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/file-log' &&
        url.searchParams.get('file') === String(fileId),
    );
    await expect(fileRow(page, file)).toHaveAttribute('aria-selected', 'true');
    const details = fileDetails(page, file);
    await expect(
      details.getByRole('heading', {
        name: required(file.FileName, 'FileName'),
      }),
    ).toBeVisible();
    await expect(details.getByRole('definition').first()).toHaveText(
      required(file.Woid, 'Woid'),
    );
  });

  // AC-3
  test("opening a failed file's workflow shows the faulted step, the Pending steps after it and the failing message", async ({
    page,
  }) => {
    const file = createFailedFileDetail();
    const run = createFaultedProcessInstanceDetail();
    const runId = required(file.Woid, 'Woid');
    const steps = required(run.Steps, 'Steps');
    const faultedIndex = steps.findIndex((step) => step.State === 'Faulted');
    const faulted = required(steps[faultedIndex], 'Faulted step');
    const after = steps.slice(faultedIndex + 1);
    if (after.length === 0) {
      throw new Error('Faulted run fixture has no steps after the faulted one');
    }
    const failing = createFaultedExecutionLogs().find(
      (entry) => entry.EventName === 'Faulted',
    );
    const failingMessage = required(failing?.Message, 'faulted log Message');

    await page.goto('/file-log');
    await fileRow(page, file).click();
    const details = fileDetails(page, file);
    await details.getByRole('link', { name: 'Open workflow' }).click();

    // A failed file (no WorkflowInstanceId) still opens its faulted ImportFile run.
    await expect(page).toHaveURL((url) => isSingleRunView(url, runId));
    await expect(processInstanceRows(page)).toHaveCount(1);
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');

    // The faulted step and every step after it (Pending) are shown with their state.
    const card = stepsCard(page, run);
    await expect(
      card
        .getByRole('listitem')
        .filter({ hasText: required(faulted.Name, 'Step.Name') }),
    ).toContainText(/faulted/i);
    for (const step of after) {
      await expect(
        card
          .getByRole('listitem')
          .filter({ hasText: required(step.Name, 'Step.Name') }),
      ).toContainText(/pending/i);
    }

    // The failing activity's message is readable in the execution log.
    const logRow = page.getByRole('row').filter({ hasText: failingMessage });
    await expect(logRow).toBeVisible();
    await expect(logRow).toContainText(
      required(failing?.ActivityName, 'ActivityName'),
    );
    await expect(logRow).toContainText(/faulted/i);

    // The faulted-run state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });
});
