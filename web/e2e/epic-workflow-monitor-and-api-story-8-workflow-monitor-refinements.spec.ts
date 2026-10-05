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
 *   - `GET .../v1/process-instances` (through the same-origin /curve-data proxy) is
 *     fulfilled by `queryProcessInstances(createProcessInstances(), …)` from the
 *     project-wide factories, honouring Status / ProcessName / Page / Size exactly
 *     as the service does. Like the service, it knows no "Finished (Error)" status:
 *     a request with Status=Finished (Error) matches nothing.
 *   - Every other data-service request (`/v1/`) is aborted.
 *   - Auth is the client-only demo session: sign in through "Sign in with Genwood
 *     SSO", as the other specs do — no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - The list is fetched from the BROWSER via the API client, so page.route() can
 *     intercept it.
 *   - Choosing Status "Finished (Error)" asks the service for Status=Finished and
 *     keeps only the runs whose LastExecutedActivityName is "Error" on the page
 *     (paging done on the page), so the expected rows are exactly the runs
 *     `isFinishedWithError` selects — the two failed RateLoad runs.
 *   - Process name and "Finished (Error)" combine; when they match nothing, the
 *     "Active filters" list names "Status: Finished (Error)" and "Clear all"
 *     resets both filters (as before).
 *   - Each row shows the instance ID shortened to its first 12 characters.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 8: Workflow monitor refinements.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import {
  createProcessInstances,
  isFinishedWithError,
  queryProcessInstances,
} from '../src/mocks/data/process-instance';
import { IMPORT_FILE } from '../src/mocks/data/process-instance-detail';

import type { Locator, Page } from '@playwright/test';
import type { ProcessInstanceRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FINISHED_ERROR = 'Finished (Error)';
const NO_MATCHES = 'No process instances match these filters.';

/** The mixed collection, newest first, as the service returns it. */
const ALL_INSTANCES = createProcessInstances();
/** The failed RateLoad runs (Finished, last activity 'Error'). */
const FAILED_RATELOAD_RUNS = ALL_INSTANCES.filter(isFinishedWithError);

/** The shortened instance ID a row displays (12 characters, then the ellipsis). */
function shortId(instance: ProcessInstanceRead): string {
  return (instance.ProcessInstanceId ?? '').slice(0, 12);
}

/** Abort every other data-service call; serve GET /v1/process-instances from the factories. */
async function mockProcessInstanceService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(
    (url) => /\/v1\/process-instances$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const pageParam = Number(params.get('Page'));
      const sizeParam = Number(params.get('Size'));
      return route.fulfill({
        status: 200,
        json: queryProcessInstances(ALL_INSTANCES, {
          Status: params.get('Status') ?? undefined,
          ProcessName: params.get('ProcessName') ?? undefined,
          Page: pageParam > 0 ? pageParam : undefined,
          Size: sizeParam > 0 ? sizeParam : undefined,
        }),
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

/** Data rows of the Process instances table (header row holds columnheaders). */
function dataRows(page: Page): Locator {
  return page
    .getByRole('region', { name: 'Process instances' })
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

async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic workflow-monitor-and-api, Story 8: Workflow monitor refinements', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockProcessInstanceService(page);
  });

  // AC-4
  test('Status "Finished (Error)" lists the failed RateLoad runs, and Clear all brings every run back', async ({
    page,
  }) => {
    if (FAILED_RATELOAD_RUNS.length !== 2) {
      throw new Error(
        'Process-instance fixture should hold two failed RateLoad runs',
      );
    }

    await openWorkflowMonitor(page);
    await expectRows(page, ALL_INSTANCES);

    // "Finished (Error)" replaces "Faulted": only the failed RateLoad runs remain.
    await chooseOption(page, 'Status', FINISHED_ERROR);
    await expectRows(page, FAILED_RATELOAD_RUNS);

    // The filtered list passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // Combined with Process name ImportFile nothing matches: the active filters are
    // named and Clear all is offered.
    await chooseOption(page, 'Process name', IMPORT_FILE);
    await expect(page.getByText(NO_MATCHES, { exact: true })).toBeVisible();
    const activeFilters = page.getByRole('list', { name: 'Active filters' });
    await expect(
      activeFilters.getByRole('listitem').filter({ hasText: FINISHED_ERROR }),
    ).toHaveText(`Status: ${FINISHED_ERROR}`);

    // The no-matches state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // Clear all brings every run back.
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText(NO_MATCHES, { exact: true })).toBeHidden();
    await expectRows(page, ALL_INSTANCES);
    await expect(
      page.getByRole('combobox', { name: 'Status', exact: true }),
    ).toHaveText(/All statuses/);
  });
});
