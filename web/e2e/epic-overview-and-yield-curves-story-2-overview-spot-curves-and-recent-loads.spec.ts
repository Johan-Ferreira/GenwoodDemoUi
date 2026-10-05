/**
 * Story Metadata:
 * - Route: /overview
 * - Target File: web/src/app/(app)/overview/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (`**\/v1/**`, i.e. anything sent through the
 *     same-origin `/curve-data` proxy) is intercepted and dispatched by path, with
 *     bodies from the project-wide factories in web/src/mocks/data/:
 *     - GET /v1/overview     → createOverview() (all four spot curves, the five
 *                              newest files); createEmptyOverview() for the empty
 *                              accessibility state
 *     - GET /v1/files        → createFileList()
 *     - GET /v1/files/{Id}   → createFailedFileDetail() for file 102 (in Recent loads);
 *                              unknown Id → 404 `{ "Message": "File not found" }`
 *     - anything else        → aborted (never reaches the live service)
 *   - Auth is the client-only demo session (project.md: custom); sign-in is the
 *     "Sign in with Genwood SSO" button, no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - The Overview is fetched from the BROWSER (client component via the API
 *     client `get`), so page.route() sees it. No Server Component fetch.
 *   - The chart card and the Recent loads card are landmark regions named by their
 *     titles (e.g. a `<section aria-labelledby>` pointing at the card title):
 *     "Spot curves on latest valuation date" and "Recent loads".
 *   - The shared line chart is built on the Shadcn chart primitive, so its
 *     container carries the `data-chart` attribute; hovering the plot shows the
 *     chart tooltip, which carries `role="tooltip"`, reads "{x} years" and has one
 *     line per series ("Nominal spot", "Real spot", "Inflation spot", "OIS spot").
 *   - The chart is wrapped in a `<figure>` (role figure) whose accessible
 *     description is the text summary of its series (e.g. `aria-describedby`
 *     pointing at a visually hidden summary naming every series).
 *   - Recent loads reuses FileTable with clickable rows; clicking a row navigates
 *     to /file-log?file=<Id>, where the File log marks that row
 *     `aria-selected="true"` and shows the details card (a region named by the
 *     file name), as in epic-file-log story 3.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic overview-and-yield-curves, Story 2: Overview spot curves chart
 * and recent loads.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import {
  createEmptyOverview,
  createOverview,
} from '../src/mocks/data/overview';
import { createFileList } from '../src/mocks/data/file-list';
import { createFailedFileDetail } from '../src/mocks/data/file-detail';

import type { Locator, Page } from '@playwright/test';
import type { FileRead, OverviewRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CHART_TITLE = 'Spot curves on latest valuation date';
const RECENT_LOADS = 'Recent loads';
const SERIES = ['Nominal spot', 'Real spot', 'Inflation spot', 'OIS spot'];
const NOT_FOUND = 'File not found';

/** Generated types mark every field optional; fail loudly if a factory omits one. */
function present<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Mock factory did not provide ${name}`);
  }
  return value;
}

/**
 * Intercept every data-service call. `overview` is read per request so a test
 * can switch the Overview response (e.g. to the empty state) before reloading.
 */
async function mockDataService(
  page: Page,
  overview: () => OverviewRead,
): Promise<void> {
  const detail = createFailedFileDetail();
  const detailId = present(detail.Id, 'Id');
  const list = createFileList();

  await page.route('**/v1/**', (route) => {
    const { pathname } = new URL(route.request().url());

    if (/\/v1\/overview$/.test(pathname)) {
      return route.fulfill({ status: 200, json: overview() });
    }
    if (/\/v1\/files$/.test(pathname)) {
      return route.fulfill({ status: 200, json: list });
    }
    const single = /\/v1\/files\/(\d+)$/.exec(pathname);
    if (single) {
      return Number(single[1]) === detailId
        ? route.fulfill({ status: 200, json: detail })
        : route.fulfill({ status: 404, json: { Message: NOT_FOUND } });
    }
    return route.abort();
  });
}

/** Sign in through the demo session (client-only, no credentials). */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

function chartCard(page: Page): Locator {
  return page.getByRole('region', { name: CHART_TITLE });
}

function recentLoads(page: Page): Locator {
  return page.getByRole('region', { name: RECENT_LOADS });
}

/** A file-table row, found by its unique shortened WOID. */
function rowFor(scope: Locator, file: FileRead): Locator {
  return scope
    .getByRole('row')
    .filter({ hasText: present(file.Woid, 'Woid').slice(0, 8) });
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic overview-and-yield-curves, Story 2: Overview spot curves and recent loads', () => {
  let overviewBody: OverviewRead;

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    overviewBody = createOverview();
    await mockDataService(page, () => overviewBody);
    await signIn(page);
  });

  // AC-3
  test('hovering the spot curves chart shows a "{x} years" tooltip with one line per series', async ({
    page,
  }) => {
    const card = chartCard(page);
    await expect(
      card.getByRole('heading', { name: CHART_TITLE }),
    ).toBeVisible();

    const plot = card.locator('[data-chart]');
    await expect(plot).toBeVisible();
    await plot.hover();

    const tooltip = card.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip.getByText(/^\d+(\.\d+)? years$/)).toBeVisible();
    for (const series of SERIES) {
      await expect(tooltip.getByText(series, { exact: true })).toBeVisible();
    }

    // Tooltip-open state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });

  // AC-5
  test('clicking a Recent loads row opens the File log with that file selected and its details showing', async ({
    page,
  }) => {
    const file = createFailedFileDetail();
    const id = present(file.Id, 'Id');

    const recentRow = rowFor(recentLoads(page), file);
    await expect(recentRow).toBeVisible();
    await recentRow.click();

    await expect(page).toHaveURL(
      new RegExp(`/file-log\\?(.*&)?file=${id}(&|$)`),
    );
    await expect(
      page.getByRole('heading', { level: 1, name: 'File log' }),
    ).toBeVisible();
    await expect(rowFor(page.getByRole('main'), file)).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const fileName = present(file.FileName, 'FileName');
    const details = page.getByRole('region', { name: fileName });
    await expect(
      details.getByRole('heading', { name: fileName }),
    ).toBeVisible();
  });

  // AC-6
  test('the Overview passes an accessibility scan and the chart offers a text summary of its series', async ({
    page,
  }) => {
    const card = chartCard(page);
    const figure = card.getByRole('figure');
    await expect(figure).toBeVisible();
    for (const series of SERIES) {
      await expect(figure).toHaveAccessibleDescription(new RegExp(series));
    }
    await expect(
      rowFor(recentLoads(page), createFailedFileDetail()),
    ).toBeVisible();

    // Loaded state.
    await expectNoA11yViolations(page);

    // Empty state: no spot curves and no files received.
    overviewBody = createEmptyOverview();
    await page.reload();
    await expect(
      chartCard(page).getByText('No spot curves have been imported yet.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      recentLoads(page).getByText('No files have been received yet.', {
        exact: true,
      }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
