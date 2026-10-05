/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/components/file-log/FileLogView.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - `GET .../v1/files` (served through the same-origin /curve-data proxy) is
 *     fulfilled with createFileList() over the project-wide createFiles() collection
 *     (web/src/mocks/data/). The handler behaves like the service: it filters by the
 *     `Status` query parameter (exact match on the file's Status), then honours
 *     `Page`/`Size`.
 *   - Every other data-service request (`**\/v1/**`) is aborted.
 * - Implementation pattern this assumes:
 *   - The file list is fetched from the browser (client component via the API
 *     client), so page.route() can intercept it.
 *   - The File log "Status" filter is a Shadcn Select combobox labelled "Status" whose
 *     options are, in order: "All statuses", "Staging", "Staged", "Importing",
 *     "Imported", "Failed" (no "Processing"). Choosing a status sends it as the
 *     `Status` query parameter with that exact value; "All statuses" omits it.
 *   - The table's ID column renders the numeric Id as its own cell.
 *   - The demo session is client-only (sign in via "Sign in with Genwood SSO", as in
 *     the other specs); no credentials, no userinfo endpoint.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 5: New import statuses across
 * the File log and Overview.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import { createFiles } from '../src/mocks/data/file';
import { createFileList } from '../src/mocks/data/file-list';

import type { Locator, Page } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Abort every data-service call, then serve GET /v1/files filtered by Status. */
async function mockFileService(page: Page): Promise<void> {
  const files = createFiles();
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(
    (url) => /\/v1\/files$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const status = params.get('Status');
      const matching = status
        ? files.filter((file) => file.Status === status)
        : files;
      const pageNumber = Number(params.get('Page') ?? '1') || 1;
      const size =
        Number(params.get('Size') ?? String(matching.length)) ||
        matching.length;
      const start = (pageNumber - 1) * size;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          createFileList({
            Files: matching.slice(start, start + size),
            TotalItems: matching.length,
            Page: pageNumber,
            Size: size,
          }),
        ),
      });
    },
  );
}

/** Sign in with the demo session and open File log from the side navigation. */
async function openFileLog(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'File log', exact: true })
    .click();
  await expect(page).toHaveURL(/\/file-log$/);
}

/** Data rows only (header row holds columnheaders, not cells). */
function dataRows(page: Page): Locator {
  return page
    .getByRole('table')
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

function rowWithId(page: Page, id: number): Locator {
  return dataRows(page).filter({
    has: page.getByRole('cell', { name: String(id), exact: true }),
  });
}

/** Assert the table shows exactly these file Ids. */
async function expectRows(page: Page, ids: number[]): Promise<void> {
  await expect(dataRows(page)).toHaveCount(ids.length);
  for (const id of ids) {
    await expect(rowWithId(page, id)).toBeVisible();
  }
}

async function chooseStatus(page: Page, option: string): Promise<void> {
  await page.getByRole('combobox', { name: 'Status', exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

test.describe('Epic workflow-monitor-and-api, Story 5: Two-stage import statuses', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockFileService(page);
  });

  // AC-1
  test('status filter offers the five import statuses and each lists only its files', async ({
    page,
  }) => {
    await openFileLog(page);
    // createFiles(): Staging 104, Staged 105, Importing 103, Failed 106/102/95,
    // Imported 101/98/97.
    await expectRows(page, [104, 105, 103, 106, 102, 101, 98, 97, 95]);

    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await expect(page.getByRole('listbox').getByRole('option')).toHaveText([
      'All statuses',
      'Staging',
      'Staged',
      'Importing',
      'Imported',
      'Failed',
    ]);

    // Accessibility of the open status list introduced by this story. Scoped to the
    // listbox: while a Radix Select is open it aria-hides (and focus-traps away from)
    // the rest of the page by design, which a page-wide scan reports as
    // aria-hidden-focus. The closed page is scanned by the File log specs.
    const { violations } = await new AxeBuilder({ page })
      .include('[role="listbox"]')
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);

    await page.getByRole('option', { name: 'Importing', exact: true }).click();
    await expectRows(page, [103]);

    await chooseStatus(page, 'Staging');
    await expectRows(page, [104]);

    await chooseStatus(page, 'Staged');
    await expectRows(page, [105]);

    await chooseStatus(page, 'Imported');
    await expectRows(page, [101, 98, 97]);

    await chooseStatus(page, 'Failed');
    await expectRows(page, [106, 102, 95]);

    await chooseStatus(page, 'All statuses');
    await expectRows(page, [104, 105, 103, 106, 102, 101, 98, 97, 95]);
  });
});
