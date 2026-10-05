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
 *     body taken from the project-wide factories in web/src/mocks/data/:
 *       GET /v1/files                               → createFileList()
 *       GET /v1/files/{Id}                          → file-detail factories by Id
 *                                                     (404 "File not found" otherwise)
 *       GET /v1/process-instances?Status&ProcessName&Page&Size
 *                                                   → queryProcessInstances(...)
 *       GET /v1/process-instances/{Id}              → process-instance-detail factories
 *                                                     (404 createProcessInstanceNotFound())
 *       GET /v1/process-instances/{Id}/execution-logs → execution-log factories
 *       GET /v1/imports/{Woid}                      → import factories by WOID
 *                                                     (404 createImportNotFound())
 *       anything else                               → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through the
 *     "Sign in with Genwood SSO" button as the other specs do — no credentials.
 * - Implementation pattern this assumes:
 *   - All of the above are fetched from the BROWSER via the API client (client
 *     components), so page.route() can intercept them.
 *   - The File log file details card (FileDetailCard) shows an "Open workflow" LINK
 *     (Button asChild + next/link, like "Trace import") to
 *     /workflow-monitor?instance=<WorkflowInstanceId>.
 *   - The Workflow monitor reads `?instance=<Id>` and selects that run: its row in
 *     the Process instances table carries aria-selected="true" and the steps card is
 *     a landmark region named by its title (the process name, e.g. a <section> with
 *     aria-labelledby on the heading), listing each step's position, state label and
 *     raw step name.
 *   - The selected run view offers an "Open file log entry" BUTTON that resolves the
 *     run's ContextId (WOID) via GET /v1/imports/{Woid} and navigates to
 *     /file-log?file=<File.Id>; the File log then shows that file's row selected
 *     (aria-selected="true") and its details card (region named by the file name).
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
  createFaultedProcessInstanceDetail,
  createProcessInstanceDetail,
  createRunningProcessInstanceDetail,
} from '../src/mocks/data/process-instance-detail';
import {
  createProcessInstances,
  queryProcessInstances,
} from '../src/mocks/data/process-instance';
import {
  createExecutionLogList,
  createExecutionLogs,
  createFaultedExecutionLogs,
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
  ImportRead,
  ProcessInstanceDetailRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

/** File details the mocked service knows, by file Id. */
function knownFiles(): Map<number, FileDetailRead> {
  return new Map(
    [
      createFileDetail(),
      createSupersededFileDetail(),
      createFailedFileDetail(),
      createProcessingFileDetail(),
    ].map((detail) => [required(detail.Id, 'File.Id'), detail]),
  );
}

/** Run details and their logs the mocked service knows, by instance Id. */
function knownRuns(): Map<
  string,
  { detail: ProcessInstanceDetailRead; logs: ExecutionLogReadList }
> {
  return new Map(
    [
      { detail: createProcessInstanceDetail(), logs: createExecutionLogs() },
      {
        detail: createFaultedProcessInstanceDetail(),
        logs: createFaultedExecutionLogs(),
      },
      {
        detail: createRunningProcessInstanceDetail(),
        logs: createRunningExecutionLogs(),
      },
    ].map(({ detail, logs }) => [
      required(detail.ProcessInstanceId, 'ProcessInstanceId'),
      { detail, logs: createExecutionLogList(logs) },
    ]),
  );
}

/** Import traces the mocked service knows, by WOID. */
function knownImports(): Map<string, ImportRead> {
  return new Map(
    [createImport(), createFailedImport(), createProcessingImport()].map(
      (trace) => [required(trace.File?.Woid, 'Import.File.Woid'), trace],
    ),
  );
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockDataService(page: Page): Promise<void> {
  const files = knownFiles();
  const runs = knownRuns();
  const imports = knownImports();
  const fileList = createFileList();
  const instances = createProcessInstances();

  await page.route(
    (url) => url.pathname.includes('/v1/'),
    (route) => {
      const url = new URL(route.request().url());
      const { pathname, searchParams } = url;

      if (/\/v1\/files$/.test(pathname)) {
        return route.fulfill({ status: 200, json: fileList });
      }

      const file = /\/v1\/files\/(\d+)$/.exec(pathname);
      if (file) {
        const detail = files.get(Number(file[1]));
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

      const logs = /\/v1\/process-instances\/([^/]+)\/execution-logs$/.exec(
        pathname,
      );
      if (logs) {
        const run = runs.get(logs[1]);
        return run
          ? route.fulfill({ status: 200, json: run.logs })
          : route.fulfill({
              status: 404,
              json: createProcessInstanceNotFound(),
            });
      }

      const instance = /\/v1\/process-instances\/([^/]+)$/.exec(pathname);
      if (instance) {
        const run = runs.get(instance[1]);
        return run
          ? route.fulfill({ status: 200, json: run.detail })
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

/** The Process instances table row for a run, by its 12-character shortened Id. */
function runRow(page: Page, run: ProcessInstanceDetailRead): Locator {
  return page.getByRole('row').filter({
    hasText: required(run.ProcessInstanceId, 'ProcessInstanceId').slice(0, 12),
  });
}

/** The selected run's steps card, named by the process name. */
function stepsCard(page: Page, run: ProcessInstanceDetailRead): Locator {
  return page.getByRole('region', {
    name: required(run.ProcessName, 'ProcessName'),
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
  test('"Open workflow" on a file\'s details opens the Workflow monitor with that file\'s run selected', async ({
    page,
  }) => {
    const file = createFileDetail();
    const run = createProcessInstanceDetail();
    const instanceId = required(run.ProcessInstanceId, 'ProcessInstanceId');

    await page.goto(`/file-log?file=${required(file.Id, 'File.Id')}`);
    const details = fileDetails(page, file);
    await expect(
      details.getByRole('heading', {
        name: required(file.FileName, 'FileName'),
      }),
    ).toBeVisible();

    await details.getByRole('link', { name: 'Open workflow' }).click();

    await expect(page).toHaveURL(
      new RegExp(`/workflow-monitor\\?(.*&)?instance=${instanceId}(&|$)`),
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'Workflow monitor' }),
    ).toBeVisible();
    await expect(runRow(page, run)).toHaveAttribute('aria-selected', 'true');

    const card = stepsCard(page, run);
    await expect(card).toBeVisible();
    await expect(card).toContainText(instanceId);

    // The selected-run state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
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
      new RegExp(`/file-log\\?(.*&)?file=${fileId}(&|$)`),
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

    await expect(page).toHaveURL(
      new RegExp(
        `/workflow-monitor\\?(.*&)?instance=${required(run.ProcessInstanceId, 'ProcessInstanceId')}(&|$)`,
      ),
    );
    await expect(runRow(page, run)).toHaveAttribute('aria-selected', 'true');

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
