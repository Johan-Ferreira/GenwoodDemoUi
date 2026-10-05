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
 *     through the same-origin `/curve-data` proxy) is intercepted and dispatched by
 *     path, using only the project-wide factories in web/src/mocks/data/:
 *     - GET /v1/process-instances                 → queryProcessInstances() over the
 *                                                   shared collection (Status /
 *                                                   ProcessName / Page / Size honoured)
 *     - GET /v1/process-instances/{Id}            → the shared detail factories; unknown
 *                                                   Id → 404 createProcessInstanceNotFound()
 *     - GET /v1/process-instances/{Id}/execution-logs → the matching shared log list;
 *                                                   unknown Id → 404 (same body)
 *     - GET /v1/imports/{Woid}                    → the shared import traces, keyed by
 *                                                   the ImportFile run's own
 *                                                   ProcessInstanceId (the live service
 *                                                   returns NO ContextId; an ImportFile
 *                                                   run's Id IS its file's Woid). Any
 *                                                   other Id (LoadYieldCurves runs,
 *                                                   unknown) → 404 createImportNotFound()
 *     - anything else                             → aborted (never reaches a live service)
 *   - Auth is the client-only demo session (project.md: custom); sign-in is the
 *     "Sign in with Genwood SSO" button — no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - The list, the selected instance's detail, its execution log and the import
 *     trace are fetched from the BROWSER (client component via the API client), so
 *     page.route() sees them. Server Components / Server Actions must NOT fetch them.
 *   - The selection lives in the URL: loading `/workflow-monitor?instance=<Id>` opens
 *     that run directly, and its table row carries `aria-selected="true"`.
 *   - The file name in the steps-card subtitle comes from
 *     `GET /v1/imports/{ProcessInstanceId}` (the run's own Id used as the Woid) —
 *     never from a ContextId, which the service does not return.
 *   - The steps card is a landmark region named by its title (the process name, e.g.
 *     a `<section aria-labelledby>` pointing at the heading); its subtitle contains
 *     the full instance Id, the status and the file name. Its step tiles are list
 *     items in service order, each reading "{n} · {STATE}" and the raw step name.
 *   - The execution log is a region named "Execution log" containing a table with
 *     columns Timestamp, Activity, Event, Message, oldest first.
 *   - A 404 from /v1/process-instances/{Id} shows "Process instance not found" and a
 *     link back to the list (link name mentions "process instance"), not the generic
 *     error with Retry. Following it lands on `/workflow-monitor` with no selection.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 2: Run detail — step pipeline,
 * audit history and execution log.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
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
  createFailedImport,
  createImport,
  createProcessingImport,
} from '../src/mocks/data/import';
import {
  PROCESS_INSTANCE_NOT_FOUND,
  createImportNotFound,
  createProcessInstanceNotFound,
} from '../src/mocks/data/message';

import type { Locator, Page, Route } from '@playwright/test';
import type {
  ExecutionLogReadList,
  ImportRead,
  ProcessInstanceDetailRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const MISSING_INSTANCE_ID = 'ffffffffffffffffffffffffffffffff';

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Instance details the mocked service knows about, by ProcessInstanceId. */
function knownDetails(): Map<string, ProcessInstanceDetailRead> {
  return new Map(
    [
      createProcessInstanceDetail(),
      createFaultedProcessInstanceDetail(),
      createRunningProcessInstanceDetail(),
      createCancelledProcessInstanceDetail(),
      createSuspendedProcessInstanceDetail(),
      createIdleProcessInstanceDetail(),
      createLoadYieldCurvesProcessInstanceDetail(),
    ].map((d) => [required(d.ProcessInstanceId, 'ProcessInstanceId'), d]),
  );
}

/** Execution logs by ProcessInstanceId; known instances without a log get none. */
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
 * Import traces keyed by the ImportFile run's own ProcessInstanceId — the Woid the
 * app looks imports up by (the service returns no ContextId). Only ImportFile runs
 * resolve; any other Id (e.g. a LoadYieldCurves run) is absent, so it 404s.
 */
function knownImports(): Map<string, ImportRead> {
  return new Map(
    [createImport(), createFailedImport(), createProcessingImport()]
      .filter((trace) => trace.ProcessInstance?.ProcessName === IMPORT_FILE)
      .map((trace) => [
        required(
          trace.ProcessInstance?.ProcessInstanceId,
          'ProcessInstance.ProcessInstanceId',
        ),
        trace,
      ]),
  );
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockWorkflowService(page: Page): Promise<void> {
  const instances = createProcessInstances();
  const details = knownDetails();
  const logs = knownLogs();
  const imports = knownImports();

  await page.route(
    (url) => url.pathname.includes('/v1/'),
    (route) => {
      const url = new URL(route.request().url());
      const { pathname, searchParams } = url;

      if (/\/v1\/process-instances$/.test(pathname)) {
        const pageParam = searchParams.get('Page');
        const sizeParam = searchParams.get('Size');
        return json(
          route,
          200,
          queryProcessInstances(instances, {
            Status: searchParams.get('Status') ?? undefined,
            ProcessName: searchParams.get('ProcessName') ?? undefined,
            Page: pageParam ? Number(pageParam) : undefined,
            Size: sizeParam ? Number(sizeParam) : undefined,
          }),
        );
      }

      const logMatch = /\/v1\/process-instances\/([^/]+)\/execution-logs$/.exec(
        pathname,
      );
      if (logMatch) {
        const id = logMatch[1];
        if (!details.has(id)) {
          return json(route, 404, createProcessInstanceNotFound());
        }
        return json(route, 200, logs.get(id) ?? createEmptyExecutionLogList());
      }

      const detailMatch = /\/v1\/process-instances\/([^/]+)$/.exec(pathname);
      if (detailMatch) {
        const detail = details.get(detailMatch[1]);
        return detail
          ? json(route, 200, detail)
          : json(route, 404, createProcessInstanceNotFound());
      }

      const importMatch = /\/v1\/imports\/([^/]+)$/.exec(pathname);
      if (importMatch) {
        const trace = imports.get(importMatch[1]);
        return trace
          ? json(route, 200, trace)
          : json(route, 404, createImportNotFound());
      }

      return route.abort();
    },
  );
}

/** Sign in through the demo session (client-only, no credentials). */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

/** The table row for a run, found by its unique 12-character shortened Id. */
function rowFor(page: Page, instance: ProcessInstanceDetailRead): Locator {
  return page.getByRole('row').filter({
    hasText: required(instance.ProcessInstanceId, 'ProcessInstanceId').slice(
      0,
      12,
    ),
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

test.describe('Epic workflow-monitor-and-api, Story 2: Run detail — steps and log', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockWorkflowService(page);
    await signIn(page);
  });

  // AC-4
  test('opening a link to a specific run shows that run selected, with its steps and log', async ({
    page,
  }) => {
    const faulted = createFaultedProcessInstanceDetail();
    const trace = createFailedImport();
    const instanceId = required(faulted.ProcessInstanceId, 'ProcessInstanceId');
    const processName = required(faulted.ProcessName, 'ProcessName');
    const steps = required(faulted.Steps, 'Steps');
    const faultedLog = createFaultedExecutionLogs();

    await page.goto(`/workflow-monitor?instance=${instanceId}`);

    // The linked run is the selected row in the list.
    await expect(rowFor(page, faulted)).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Steps card: titled by the process name, subtitle names the run, status and file.
    const stepsCard = page.getByRole('region', { name: processName });
    await expect(
      stepsCard.getByRole('heading', { name: processName }),
    ).toBeVisible();
    await expect(stepsCard).toContainText(instanceId);
    await expect(stepsCard).toContainText(
      required(faulted.CurrentStatus, 'CurrentStatus'),
    );
    await expect(stepsCard).toContainText(
      required(trace.File?.FileName, 'File.FileName'),
    );

    // One tile per service step, in service order: "{n} · {STATE}" plus the raw name.
    await expect(stepsCard.getByRole('listitem')).toHaveText(
      steps.map(
        (step, i) =>
          new RegExp(
            `${i + 1}\\s*·\\s*${escapeRegExp(required(step.State, 'State'))}[\\s\\S]*${escapeRegExp(required(step.Name, 'Name'))}`,
            'i',
          ),
      ),
    );

    // Execution log: header row, then every entry oldest first, failing message shown.
    const log = page.getByRole('region', { name: 'Execution log' });
    await expect(log.getByRole('row')).toHaveText([
      /Timestamp[\s\S]*Activity[\s\S]*Event[\s\S]*Message/i,
      ...faultedLog.map(
        (entry) =>
          new RegExp(
            [
              required(entry.Timestamp, 'Timestamp'),
              required(entry.ActivityName, 'ActivityName'),
              required(entry.EventName, 'EventName'),
              entry.Message ?? '',
            ]
              .map(escapeRegExp)
              .join('[\\s\\S]*'),
            'i',
          ),
      ),
    ]);

    // Selected-run state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });

  // AC-5
  test('opening a run that does not exist shows "Process instance not found" with a way back to the list', async ({
    page,
  }) => {
    await page.goto(`/workflow-monitor?instance=${MISSING_INSTANCE_ID}`);

    await expect(
      page.getByText(PROCESS_INSTANCE_NOT_FOUND, { exact: true }),
    ).toBeVisible();
    // Specific not-found message, not the generic error with Retry.
    await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);

    const backLink = page.getByRole('link', { name: /process instance/i });
    await expect(backLink).toBeVisible();

    // Not-found state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    await backLink.click();
    await expect(page).toHaveURL(/\/workflow-monitor$/);
    await expect(
      page.getByText(PROCESS_INSTANCE_NOT_FOUND, { exact: true }),
    ).toBeHidden();
    await expect(rowFor(page, createProcessInstanceDetail())).toBeVisible();
  });
});
