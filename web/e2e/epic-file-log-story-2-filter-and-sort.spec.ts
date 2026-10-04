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
 *   - `GET .../v1/files` (served through the same-origin /curve-data proxy) is
 *     fulfilled from the project-wide factories in web/src/mocks/data/. The handler
 *     behaves like the service: it filters by the `Status`, `CurveFamily`,
 *     `ReceivedFrom` and `ReceivedTo` query parameters (dates compared on the
 *     YYYY-MM-DD part of ReceivedAt, both ends inclusive), then honours `Page`/`Size`.
 *   - Every other data-service request (`**\/v1/**`) is aborted.
 * - Implementation pattern this assumes:
 *   - The file list is fetched from the browser (client component via the API
 *     client), so page.route() can intercept it — not from a Server Component or
 *     Server Action.
 *   - Filters are sent to the service as the Status / CurveFamily / ReceivedFrom /
 *     ReceivedTo query parameters, with dates exactly as entered (BR1). "All" options
 *     omit the parameter.
 *   - The demo session is client-only (sign in via "Sign in with Genwood SSO", as in
 *     the app-shell spec); no credentials, no userinfo endpoint.
 *   - Filter controls: Shadcn Select comboboxes labelled "Status" (options "All
 *     statuses", Imported, Failed, Processing) and "Curve family" (options All,
 *     Nominal, Real, Inflation, OIS); text inputs labelled "Received from" and
 *     "Received to", applied when the field is committed (blur / Tab).
 *   - Paging: default 20 rows per page with a "Next page" button (story 1).
 *   - The table's ID column renders the numeric Id as its own cell.
 *   - No matches: "No files match these filters.", each active filter named with its
 *     label and value (e.g. "Received from: 2027-01-01"), and a "Clear all" button
 *     that resets every filter.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic file-log, Story 2: Filter and sort the file log.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import { createFile, createFiles } from '../src/mocks/data/file';
import { createFileList } from '../src/mocks/data/file-list';

import type { Locator, Page } from '@playwright/test';
import type { FileRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const NO_MATCHES = 'No files match these filters.';
const DEFAULT_PAGE_SIZE = 20;

/**
 * 25 files: the canonical mixed collection (Ids 103, 102, 101, 98, 97, 95 — every
 * status and curve family, received 2026-09-28..30) plus 19 older Imported Nominal
 * files (Ids 60–78, received 2026-09-01..19), so the default 20-row page has a
 * second page.
 */
function buildAllFiles(): FileRead[] {
  const older = Array.from({ length: 19 }, (_, i) => {
    const day = String(19 - i).padStart(2, '0');
    return createFile({
      Id: 78 - i,
      ReceivedAt: `2026-09-${day} 18:00:00`,
      IsCurrent: false,
      Woid: `${78 - i}${'0'.repeat(30)}`,
    });
  });
  return [...createFiles(), ...older];
}

/** Service-like filtering of the mock collection by the request's query params. */
function filterFiles(files: FileRead[], params: URLSearchParams): FileRead[] {
  const status = params.get('Status');
  const family = params.get('CurveFamily');
  const from = params.get('ReceivedFrom');
  const to = params.get('ReceivedTo');
  return files.filter((file) => {
    const day = (file.ReceivedAt ?? '').slice(0, 10);
    if (status && file.Status !== status) return false;
    if (family && file.CurveFamily !== family) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

/** Abort every data-service call, then serve GET /v1/files from the factories. */
async function mockFileService(page: Page, files: FileRead[]): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(
    (url) => /\/v1\/files$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const matching = filterFiles(files, params);
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

async function chooseOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function enterDate(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press('Tab');
}

test.describe('Epic file-log, Story 2: Filter and sort the file log', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockFileService(page, buildAllFiles());
  });

  // AC-1
  test('status, curve family and received dates narrow the list and return to the first page', async ({
    page,
  }) => {
    await openFileLog(page);
    await expect(dataRows(page)).toHaveCount(DEFAULT_PAGE_SIZE);

    // Move to page 2 (the 5 oldest files) before filtering.
    await page.getByRole('button', { name: /next page/i }).click();
    await expectRows(page, [64, 63, 62, 61, 60]);

    // Status: only the failed files — shown on page 1, not an empty page 2.
    await chooseOption(page, 'Status', 'Failed');
    await expectRows(page, [102, 95]);

    // Curve family narrows further: the failed Inflation file only.
    await chooseOption(page, 'Curve family', 'Inflation');
    await expectRows(page, [102]);

    // Back to all statuses and families, then narrow by received date range.
    await chooseOption(page, 'Status', 'All statuses');
    await chooseOption(page, 'Curve family', 'All');
    await enterDate(page, 'Received from', '2026-09-29');
    await enterDate(page, 'Received to', '2026-09-29');
    await expectRows(page, [98, 97]);
  });

  // AC-3
  test('no matches names the active filters and Clear all restores the full list', async ({
    page,
  }) => {
    await openFileLog(page);
    await expect(dataRows(page)).toHaveCount(DEFAULT_PAGE_SIZE);

    await chooseOption(page, 'Status', 'Imported');
    await enterDate(page, 'Received from', '2027-01-01');

    await expect(page.getByText(NO_MATCHES, { exact: true })).toBeVisible();
    await expect(dataRows(page)).toHaveCount(0);
    await expect(page.getByText(/Status:\s*Imported/)).toBeVisible();
    await expect(page.getByText(/Received from:\s*2027-01-01/)).toBeVisible();

    // Accessibility of the filter bar + no-matches state introduced by this story.
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);

    await page.getByRole('button', { name: 'Clear all' }).click();

    await expect(page.getByText(NO_MATCHES, { exact: true })).toBeHidden();
    await expect(dataRows(page)).toHaveCount(DEFAULT_PAGE_SIZE);
    await expect(page.getByLabel('Received from', { exact: true })).toHaveValue(
      '',
    );
    await expect(
      page.getByRole('combobox', { name: 'Status', exact: true }),
    ).toHaveText(/All statuses/);
  });
});
