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
 *   - `GET .../v1/process-instances` (served through the same-origin /curve-data
 *     proxy) is fulfilled from the project-wide factories in web/src/mocks/data/
 *     via `queryProcessInstances`, which behaves like the service: exact `Status`
 *     match, exact `ProcessName` match, then 1-based `Page` / `Size`.
 *   - Every other data-service request (`**\/v1/**`) is aborted.
 * - Implementation pattern this assumes:
 *   - The process-instance list is fetched from the browser (client component via
 *     the API client), so page.route() can intercept it — not from a Server
 *     Component or Server Action.
 *   - Filters and paging are sent to the service as the Status / ProcessName /
 *     Page / Size query parameters (service-driven paging, not client slicing).
 *     "All statuses" omits Status; "All processes" omits ProcessName.
 *   - The demo session is client-only (sign in via "Sign in with Genwood SSO", as in
 *     the app-shell spec); no credentials, no userinfo endpoint.
 *   - Filter controls: two Shadcn Select comboboxes (FilterSelect) — "Status"
 *     (options "All statuses", Idle, Running, Suspended, Finished, Cancelled,
 *     Faulted) and "Process name" (hardcoded options "All processes", "ImportFile",
 *     "LoadYieldCurves"; not populated dynamically).
 *   - Paging uses the shared TablePagination: "Rows per page" select (5, 10, 20, 50;
 *     default 20), a "first–last of total" range line, Previous / Next page buttons.
 *   - Each row shows the instance ID shortened to its first 12 characters plus "…".
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 1: Process instance list.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import {
  createProcessInstances,
  queryProcessInstances,
} from '../src/mocks/data/process-instance';
import {
  IMPORT_FILE,
  LOAD_YIELD_CURVES,
} from '../src/mocks/data/process-instance-detail';

import type { Locator, Page } from '@playwright/test';
import type { ProcessInstanceRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** The 15-row mixed collection, newest first, as the service returns it. */
const ALL_INSTANCES = createProcessInstances();
const TOTAL = ALL_INSTANCES.length;

/** The shortened instance ID a row displays (12 characters, then the ellipsis). */
function shortId(instance: ProcessInstanceRead): string {
  return (instance.ProcessInstanceId ?? '').slice(0, 12);
}

/** Abort every data-service call, then serve GET /v1/process-instances. */
async function mockProcessInstanceService(
  page: Page,
  instances: ProcessInstanceRead[],
): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(
    (url) => /\/v1\/process-instances$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const pageParam = Number(params.get('Page'));
      const sizeParam = Number(params.get('Size'));
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          queryProcessInstances(instances, {
            Status: params.get('Status') ?? undefined,
            ProcessName: params.get('ProcessName') ?? undefined,
            Page: pageParam > 0 ? pageParam : undefined,
            Size: sizeParam > 0 ? sizeParam : undefined,
          }),
        ),
      });
    },
  );
}

/** Sign in with the demo session and open Workflow monitor from the side navigation. */
async function openWorkflowMonitor(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Workflow monitor', exact: true })
    .click();
  await expect(page).toHaveURL(/\/workflow-monitor$/);
}

/** Data rows only (header row holds columnheaders, not cells). */
function dataRows(page: Page): Locator {
  return page
    .getByRole('table')
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** Assert the table shows exactly these instances (identified by shortened ID). */
async function expectRows(
  page: Page,
  instances: ProcessInstanceRead[],
): Promise<void> {
  const rows = dataRows(page);
  await expect(rows).toHaveCount(instances.length);
  for (const instance of instances) {
    await expect(rows.filter({ hasText: shortId(instance) })).toHaveCount(1);
  }
}

async function chooseOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

function withStatus(status: string): ProcessInstanceRead[] {
  return ALL_INSTANCES.filter((p) => p.CurrentStatus === status);
}

function withProcess(processName: string): ProcessInstanceRead[] {
  return ALL_INSTANCES.filter((p) => p.ProcessName === processName);
}

test.describe('Epic workflow-monitor-and-api, Story 1: Process instance list', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockProcessInstanceService(page, ALL_INSTANCES);
  });

  // AC-2
  test('filtering by status or by choosing a process lists only the matching instances', async ({
    page,
  }) => {
    await openWorkflowMonitor(page);
    await expectRows(page, ALL_INSTANCES);

    // Status: only the faulted runs remain, newest first.
    await chooseOption(page, 'Status', 'Faulted');
    await expectRows(page, withStatus('Faulted'));

    // Back to every status, then narrow by the Process name dropdown.
    await chooseOption(page, 'Status', 'All statuses');
    await expectRows(page, ALL_INSTANCES);

    await chooseOption(page, 'Process name', IMPORT_FILE);
    await expectRows(page, withProcess(IMPORT_FILE));

    await chooseOption(page, 'Process name', LOAD_YIELD_CURVES);
    await expectRows(page, withProcess(LOAD_YIELD_CURVES));

    await chooseOption(page, 'Process name', 'All processes');
    await expectRows(page, ALL_INSTANCES);
  });

  // AC-3
  test('choosing a page size and moving between pages shows the matching page', async ({
    page,
  }) => {
    await openWorkflowMonitor(page);

    // Default page size 20: every run on one page.
    await expect(
      page.getByRole('combobox', { name: 'Rows per page', exact: true }),
    ).toHaveText(/20/);
    await expectRows(page, ALL_INSTANCES);
    await expect(page.getByText(`1–${TOTAL} of ${TOTAL}`)).toBeVisible();

    // Accessibility of the populated list (filters, table, pagination).
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);

    // Page size 5: the five newest runs, then the next five on page 2.
    await chooseOption(page, 'Rows per page', '5');
    await expectRows(page, ALL_INSTANCES.slice(0, 5));
    await expect(page.getByText(`1–5 of ${TOTAL}`)).toBeVisible();

    await page.getByRole('button', { name: 'Next page' }).click();
    await expectRows(page, ALL_INSTANCES.slice(5, 10));
    await expect(page.getByText(`6–10 of ${TOTAL}`)).toBeVisible();

    await page.getByRole('button', { name: 'Previous page' }).click();
    await expectRows(page, ALL_INSTANCES.slice(0, 5));
  });
});
