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
 *   - Every data-service request (`**\/v1/**`, i.e. anything through the
 *     same-origin proxy `/curve-data/v1/...`) is aborted by default, then
 *     `GET .../v1/files` is fulfilled from the project-wide factories in
 *     `web/src/mocks/data/` (`createFile`, `createFileList`, `createEmptyFileList`).
 *   - The files mock honours the `Page` / `Size` query parameters (1-based) and
 *     reports the true `TotalItems`, so it works whether the page fetches everything
 *     in one large request or in successive pages that it merges.
 * - Implementation pattern this assumes:
 *   - The file list is fetched in the browser (client component calling `get`
 *     from the API client through the `/curve-data` proxy), so page.route() sees it.
 *   - The demo session is client-only (sessionStorage `genwood.demo-session`),
 *     created by "Sign in with Genwood SSO"; no cookies or credentials.
 *   - All files are loaded once and paged/sorted in the browser, newest first.
 *   - The page-size control is a labelled combobox (accessible name containing
 *     "page size", "per page" or "rows") whose options read 5, 10, 20, 50; the
 *     paging controls are buttons named "Previous …" / "Next …".
 *   - The table is a real `<table>` with a `<tbody>`; each file row shows its
 *     file name in a cell.
 *   - The error state shows a "Retry" button; the empty state shows
 *     "No files have been received yet."
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic file-log, Story 1: File log table with paging.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createFile } from '../src/mocks/data/file';
import {
  createEmptyFileList,
  createFileList,
} from '../src/mocks/data/file-list';

import type { Locator, Page } from '@playwright/test';
import type { FileRead } from '../src/types/api-generated';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const TOTAL_FILES = 23;
const EMPTY_MESSAGE = 'No files have been received yet.';

/** Scenario fixture: 23 files, Id 1..23, received one day apart (Id 23 newest). */
function pagingScenarioFiles(): FileRead[] {
  const files: FileRead[] = [];
  for (let id = TOTAL_FILES; id >= 1; id -= 1) {
    const day = String(id).padStart(2, '0');
    files.push(
      createFile({
        Id: id,
        FileName: `Curve file ${id}.xlsx`,
        ReceivedAt: `2026-09-${day} 18:00:00`,
        Woid: `${day}aa${day}bb0000400080000000000000${day}`,
        IsCurrent: id === TOTAL_FILES,
      }),
    );
  }
  return files;
}

type Scenario = 'files' | 'empty' | 'error';

/**
 * Mock the data service: abort anything under /v1/, then serve GET /v1/files
 * according to the current scenario (read on every request, so a test can switch
 * scenario and reload).
 */
async function mockDataService(
  page: Page,
  getScenario: () => Scenario,
): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(/\/v1\/files(\?.*)?$/, (route) => {
    const scenario = getScenario();
    if (scenario === 'error') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ Message: 'Internal server error' }),
      });
    }
    if (scenario === 'empty') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createEmptyFileList()),
      });
    }
    const url = new URL(route.request().url());
    const all = pagingScenarioFiles();
    const pageNumber = Number(url.searchParams.get('Page') ?? '1') || 1;
    const size =
      Number(url.searchParams.get('Size') ?? String(all.length)) || all.length;
    const start = (pageNumber - 1) * size;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        createFileList({
          Files: all.slice(start, start + size),
          TotalItems: all.length,
          Page: pageNumber,
          Size: size,
        }),
      ),
    });
  });
}

/** Sign in to the demo session and open File log from the side navigation. */
async function openFileLog(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in with Genwood SSO' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'File log', exact: true })
    .click();
  await expect(page).toHaveURL(/\/file-log$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /^File log/ }),
  ).toBeVisible();
}

function bodyRows(page: Page): Locator {
  return page.getByRole('table').locator('tbody').getByRole('row');
}

/** File names expected on screen for the given (descending) id range, inclusive. */
function fileNames(fromId: number, toId: number): string[] {
  const names: string[] = [];
  for (let id = fromId; id >= toId; id -= 1)
    names.push(`Curve file ${id}.xlsx`);
  return names;
}

async function expectRows(
  page: Page,
  fromId: number,
  toId: number,
): Promise<void> {
  const expected = fileNames(fromId, toId);
  const rows = bodyRows(page);
  await expect(rows).toHaveCount(expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    await expect(
      rows.nth(i).getByRole('cell', { name: expected[i], exact: true }),
    ).toBeVisible();
  }
}

async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
}

test.describe('Epic file-log, Story 1: File log table with paging', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-3
  test('page size offers 5, 10, 20 and 50 (default 20) and next/previous show the matching files', async ({
    page,
  }) => {
    await mockDataService(page, () => 'files');
    await openFileLog(page);

    // Default page size 20: newest 20 files (23..4) on page 1.
    const pageSize = page.getByRole('combobox', {
      name: /page size|per page|rows/i,
    });
    await expect(pageSize).toHaveText(/\b20\b/);
    await expectRows(page, 23, 4);

    const next = page.getByRole('button', { name: /^next/i });
    const previous = page.getByRole('button', { name: /^previous/i });

    // Page 2 holds the remaining three files.
    await next.click();
    await expectRows(page, 3, 1);
    await previous.click();
    await expectRows(page, 23, 4);

    // The size options are exactly 5, 10, 20, 50.
    await pageSize.click();
    await expect(page.getByRole('option')).toHaveText(['5', '10', '20', '50']);
    await page.getByRole('option', { name: '5', exact: true }).click();
    await expect(pageSize).toHaveText(/\b5\b/);

    await expectRows(page, 23, 19);
    await next.click();
    await expectRows(page, 18, 14);
    await previous.click();
    await expectRows(page, 23, 19);
  });

  // AC-6
  test('File log passes an accessibility scan in its loaded, empty and error states', async ({
    page,
  }) => {
    let scenario: Scenario = 'files';
    await mockDataService(page, () => scenario);
    await openFileLog(page);

    // Loaded table.
    await expect(bodyRows(page).first()).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    // Empty state.
    scenario = 'empty';
    await page.reload();
    await expect(page.getByText(EMPTY_MESSAGE)).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);

    // Persistent error with Retry.
    scenario = 'error';
    await page.reload();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
  });
});
