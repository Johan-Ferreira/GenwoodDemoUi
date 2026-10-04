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
 *   - `GET /curve-data/v1/files` (any query string) is fulfilled from the shared
 *     factories in web/src/mocks/data/. The test flips a flag once the Processing
 *     row is on screen; every later list request returns the same file as Imported.
 *   - Every other data-service request (`**\/v1/**`) is aborted, so the page never
 *     depends on the live service.
 * - Implementation pattern this assumes:
 *   - The file list is fetched from the browser (client component via the API
 *     client, same-origin `/curve-data` proxy) so page.route() can intercept it —
 *     both the first load and each background poll.
 *   - Polling uses browser timers (setInterval/setTimeout, 10 s) so page.clock can
 *     advance it deterministically; no test-only duration props.
 *   - The demo session is client-only: "Sign in with Genwood SSO" on /sign-in lands
 *     on Overview, and the side nav "File log" link opens /file-log.
 *   - Rows are table rows (`role="row"`) whose accessible name includes the file
 *     name; the status badge shows its text label ("Processing" / "Imported").
 *   - "Import complete." is shown via the app toast (useToast()).
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic file-log, Story 5: Import finished and failed notices.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted and no real
 * credentials are needed.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories — relative imports so Playwright resolves them
// without alias plumbing. Never inline response bodies here.
import { createFile, createProcessingFile } from '../src/mocks/data/file';
import { createFileList } from '../src/mocks/data/file-list';

import type { Page } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FILES_LIST_URL = /\/curve-data\/v1\/files(\?.*)?$/;

const processingFile = createProcessingFile();
const otherFile = createFile();

/**
 * Mock the data service. The list returns the file as Processing until
 * `markImported()` is called, then as Imported on every later request.
 */
async function mockFilesService(
  page: Page,
): Promise<{ markImported: () => void }> {
  let imported = false;

  // Registered first so the more specific files-list route below takes precedence.
  await page.route('**/v1/**', (route) => route.abort());

  await page.route(FILES_LIST_URL, (route) => {
    const file = imported
      ? createProcessingFile({
          Status: 'Imported',
          SizeBytes: '412300',
          RecordCount: 26,
          RecordsInserted: '26',
          IsCurrent: true,
        })
      : processingFile;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createFileList({ Files: [file, otherFile] })),
    });
  });

  return {
    markImported: () => {
      imported = true;
    },
  };
}

/** Sign in with the demo session and open the File log from the side nav. */
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

test.describe('Epic file-log, Story 5: Import finished and failed notices', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-1
  test('a Processing file that becomes Imported updates its badge and shows "Import complete." once', async ({
    page,
  }) => {
    await page.clock.install();
    const service = await mockFilesService(page);

    await openFileLog(page);

    const row = page
      .getByRole('row')
      .filter({ hasText: String(processingFile.FileName) });
    await expect(row.getByText('Processing', { exact: true })).toBeVisible();
    // First load never raises an import notice.
    await expect(
      page.getByText('Import complete.', { exact: true }),
    ).toHaveCount(0);

    // The import finishes on the service; the next 10 s poll picks it up.
    service.markImported();
    await page.clock.runFor(11_000);

    await expect(row.getByText('Imported', { exact: true })).toBeVisible();
    await expect(row.getByText('Processing', { exact: true })).toHaveCount(0);
    const notice = page.getByText('Import complete.', { exact: true });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveCount(1);

    // Accessibility of the state this story introduces (notice open), WCAG 2.1 AA.
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
