/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/components/workflow-monitor/WorkflowMonitorView.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (any path containing `/v1/`, i.e. anything sent
 *     through the same-origin `/curve-data` proxy) is dispatched by path, with every
 *     body taken from the project-wide factories in web/src/mocks/data/:
 *       GET /v1/files                                 → createFileList()
 *       GET /v1/files/{Id}                            → the named file-detail factories
 *                                                       (404 "File not found" otherwise)
 *       GET /v1/process-instances?Status&ProcessName&Page&Size
 *                                                     → queryProcessInstances(...)
 *       GET /v1/process-instances/{Id}                → process-instance-detail factories
 *                                                       (404 createProcessInstanceNotFound())
 *       GET /v1/process-instances/{Id}/execution-logs → execution-log factories
 *       GET /v1/imports/{Woid}                        → the import factories, keyed by their
 *                                                       STAGING (ImportFile) run id only;
 *                                                       every LoadYieldCurves run id → 404
 *                                                       createImportNotFound() (as live)
 *       anything else                                 → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button as the other specs do — no credentials.
 * - Implementation pattern this assumes:
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - The file details card (region named by the file name) offers an "Open import
 *     run" LINK (story 6) to
 *     /workflow-monitor?instance=<WorkflowInstanceId>&view=single&file=<File.Id>.
 *   - The selected run's steps card is a region named by the process name
 *     (LoadYieldCurves); each step tile is a listitem showing its state label and
 *     its raw name. The execution log is a region named "Execution log" containing a
 *     table whose rows show time, activity, event and message.
 *   - "Open file log entry" (a BUTTON) uses the carried `file` search param when
 *     present and navigates to /file-log?file=<File.Id> WITHOUT calling
 *     /v1/imports; without it, it looks the run id up via /v1/imports/{id}, which
 *     404s for RateLoad runs, and shows "Import not found" with a "Back to the
 *     process instance list" link.
 *   - The demo session lives in browser storage and survives page.goto in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 7: Workflow monitor understands
 * the two processes. playwright.config.ts's webServer block boots the FRONTEND dev
 * server only; every backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
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
  ExecutionLogRead,
  ExecutionLogReadList,
  FileDetailRead,
  ImportRead,
  ProcessInstanceDetailRead,
  ProcessInstanceRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const IMPORT_NOT_FOUND = 'Import not found';

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

/** Every file detail the mocked service knows, by file Id. */
function knownFileDetails(): Map<number, FileDetailRead> {
  return new Map(
    [
      createFileDetail(),
      createSupersededFileDetail(),
      createStagingFileDetail(),
      createStagedFileDetail(),
      createImportingFileDetail(),
      createFailedFileDetail(),
      createRateLoadFailedFileDetail(),
    ].map((detail) => [required(detail.Id, 'File.Id'), detail]),
  );
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

/**
 * Import traces by WOID — keyed ONLY by each trace's staging (ImportFile) run id,
 * so every LoadYieldCurves run id 404s, exactly like the live service.
 */
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
  const fileList = createFileList();
  const filesById = knownFileDetails();
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

/** A step tile in a steps card, matched by its exact step name ("Complete" ≠ "Completed"). */
function stepTile(page: Page, card: Locator, name: string): Locator {
  return card
    .getByRole('listitem')
    .filter({ has: page.getByText(name, { exact: true }) });
}

/** Open the RateLoad run of a file from that file's details ("Open import run"). */
async function openImportRunFromFile(
  page: Page,
  file: FileDetailRead,
): Promise<void> {
  await page.goto(`/file-log?file=${required(file.Id, 'File.Id')}`);
  const details = fileDetails(page, file);
  await expect(
    details.getByRole('heading', {
      name: required(file.FileName, 'FileName'),
    }),
  ).toBeVisible();
  await details.getByRole('link', { name: 'Open import run' }).click();
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic workflow-monitor-and-api, Story 7: Workflow monitor understands the two processes', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
    await signIn(page);
  });

  // AC-3
  test('"Open import run" on a RateLoad-failed file shows its RateLoad run ending on the failed step, without the Pending steps after it, and the Error step in the log', async ({
    page,
  }) => {
    const file = createRateLoadFailedFileDetail();
    const run = createRateLoadErrorProcessInstanceDetail();
    const runId = required(file.WorkflowInstanceId, 'WorkflowInstanceId');
    const pendingSteps = required(run.Steps, 'Steps').filter(
      (step) => step.State === 'Pending',
    );
    if (pendingSteps.length === 0) {
      throw new Error('RateLoad error run fixture has no Pending steps');
    }
    const errorEntries = createRateLoadErrorExecutionLogs().filter(
      (entry) => entry.ActivityName === 'Error',
    );
    if (errorEntries.length === 0) {
      throw new Error('RateLoad error log fixture has no Error entries');
    }

    await openImportRunFromFile(page, file);

    // The RateLoad run (the file's WorkflowInstanceId) opens on its own, selected.
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/workflow-monitor' &&
        url.searchParams.get('instance') === runId &&
        url.searchParams.get('view') === 'single',
    );
    await expect(processInstanceRows(page)).toHaveCount(1);
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');

    // Its steps card is the LoadYieldCurves run. Story 8: it ends on a red
    // "Error" tile for the failed step (Validate); the Pending steps after it are hidden.
    const card = stepsCard(page, run);
    await expect(card).toContainText(runId);
    await expect(stepTile(page, card, 'Validate')).toContainText(/error/i);
    for (const step of pendingSteps) {
      await expect(
        stepTile(page, card, required(step.Name, 'Step.Name')),
      ).toHaveCount(0);
    }

    // The Error step's entries are in the execution log.
    const log = page.getByRole('region', { name: 'Execution log' });
    const errorRows = log.getByRole('row').filter({
      has: page.getByRole('cell', { name: 'Error', exact: true }),
    });
    await expect(errorRows).toHaveCount(errorEntries.length);
    for (const entry of errorEntries) {
      await expect(
        errorRows.filter({
          hasText: required(entry.EventName, 'EventName'),
        }),
      ).toBeVisible();
    }

    // The RateLoad-failed run state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });

  // AC-4
  test('"Open file log entry" on a RateLoad run returns to the carried file, and shows "Import not found" when the run was picked from the list', async ({
    page,
  }) => {
    const file = createRateLoadFailedFileDetail();
    const fileId = required(file.Id, 'File.Id');
    const run = createRateLoadErrorProcessInstanceDetail();
    const runId = required(run.ProcessInstanceId, 'ProcessInstanceId');

    // Reached from the file: the link carries the file Id ...
    await openImportRunFromFile(page, file);
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get('instance') === runId &&
        url.searchParams.get('file') === String(fileId),
    );
    await expect(stepsCard(page, run)).toBeVisible();

    // ... so "Open file log entry" goes back to that file, even though
    // /v1/imports/{runId} 404s for this RateLoad run.
    await page.getByRole('button', { name: 'Open file log entry' }).click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/file-log' &&
        url.searchParams.get('file') === String(fileId),
    );
    await expect(fileRow(page, file)).toHaveAttribute('aria-selected', 'true');
    await expect(
      fileDetails(page, file).getByRole('heading', {
        name: required(file.FileName, 'FileName'),
      }),
    ).toBeVisible();

    // Picked straight from the list: no file is carried, so the lookup 404s.
    await page.goto('/workflow-monitor');
    await runRow(page, runId).click();
    await expect(runRow(page, runId)).toHaveAttribute('aria-selected', 'true');
    await expect(stepsCard(page, run)).toBeVisible();

    await page.getByRole('button', { name: 'Open file log entry' }).click();
    await expect(page.getByText(IMPORT_NOT_FOUND)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Back to the process instance list' }),
    ).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/workflow-monitor');

    // The "Import not found" state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });
});
