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
 *   - Every data-service request (`**\/v1/**`, i.e. anything sent through the
 *     same-origin `/curve-data` proxy) is intercepted and dispatched by path:
 *     - GET /v1/files                    → the shared FileList factory
 *     - GET /v1/files/{Id}               → the shared FileDetail factories (the
 *                                          ImportPro Failed file, Id 102); unknown
 *                                          Id → 404 `{ "Message": "File not found" }`
 *     - GET /v1/files/{Id}/original      → binary body, no Content-Disposition
 *     - GET /v1/imports/{Woid}/messages  → the shared ImportMessage factory, but
 *                                          ONLY for the Failed file's FULL 32-hex
 *                                          Woid (BR3); any other Woid → 404
 *                                          `{ "Message": "Import not found" }`.
 *                                          Rows are served out of row-number order
 *                                          so the grid's default ascending sort is
 *                                          observable.
 *     - anything else                    → aborted (never reaches the live service)
 *   - Auth is the client-only demo session (project.md: custom); sign-in is the
 *     "Sign in with Genwood SSO" button, no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - The row-level errors are fetched from the browser (client component via
 *     `get` → `getImportMessages(woid)`), so page.route() sees the request.
 *   - Loading `/file-log?file=<Id>` opens that file's details card (a region named
 *     by the file name). "View row-level errors" is a button in that card; it
 *     opens the grid INLINE in the card (no route change), and a
 *     "Hide row-level errors" button closes it again.
 *   - The grid is a `<table>` whose column headers read "Row …", "Observation
 *     date …" and "Message …"; each body row's cells are, in order, the row
 *     number exactly as returned, the observation date as returned (or "—" when
 *     absent) and the message.
 *   - Helper text near the grid mentions that the row number counts the
 *     "header rows" of the original file.
 *   - "Download original" stays in the same card while the grid is open.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic row-level-import-errors, Story 1: View a failed file's
 * row-level errors. playwright.config.ts's webServer block boots the FRONTEND dev
 * server only; every backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import { createFileList } from '../src/mocks/data/file-list';
import { createFailedFileDetail } from '../src/mocks/data/file-detail';
import {
  createImportMessageList,
  createImportMessages,
} from '../src/mocks/data/import-message';

import type { Locator, Page } from '@playwright/test';
import type {
  FileDetailRead,
  ImportMessageRead,
} from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FILE_NOT_FOUND = 'File not found';
const IMPORT_NOT_FOUND = 'Import not found';
const VIEW_ERRORS = 'View row-level errors';
const HIDE_ERRORS = 'Hide row-level errors';
const DOWNLOAD_TOAST = 'Original file downloaded from the Backup folder.';
/** Neutral placeholder for a missing value (NO_VALUE in lib/files/file-format). */
const NO_VALUE = '—';

/**
 * Reads a field the factories always populate. The generated types mark every
 * field optional, so fail loudly if a factory ever stops providing it.
 */
function present<T>(value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`Mock factory did not provide ${name}`);
  }
  return value;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The canonical failed rows, served deliberately out of row-number order. */
function servedMessages(): ImportMessageRead[] {
  return createImportMessages().reverse();
}

/** The canonical failed rows in ascending row-number order (the default sort). */
function ascendingMessages(): ImportMessageRead[] {
  return createImportMessages().sort(
    (a, b) =>
      present(a.SourceRowNumber, 'SourceRowNumber') -
      present(b.SourceRowNumber, 'SourceRowNumber'),
  );
}

/** A body row's full text: row number, date (or placeholder), message — in order. */
function rowText(message: ImportMessageRead): RegExp {
  const parts = [
    String(present(message.SourceRowNumber, 'SourceRowNumber')),
    message.ObservationDate ?? NO_VALUE,
    present(message.Message, 'Message'),
  ];
  return new RegExp(`^\\s*${parts.map(escapeRegExp).join('\\s*')}\\s*$`);
}

/**
 * Intercept every data-service call. The import messages answer only for the
 * Failed file's full Woid, so a truncated or wrong WOID surfaces as a failure.
 */
async function mockServices(page: Page, failed: FileDetailRead): Promise<void> {
  const list = createFileList();
  const failedId = present(failed.Id, 'Id');
  const failedWoid = present(failed.Woid, 'Woid');

  await page.route('**/v1/**', (route) => {
    const { pathname } = new URL(route.request().url());

    if (/\/v1\/files$/.test(pathname)) {
      return route.fulfill({ status: 200, json: list });
    }

    const original = /\/v1\/files\/(\d+)\/original$/.exec(pathname);
    if (original) {
      return Number(original[1]) === failedId
        ? route.fulfill({
            status: 200,
            contentType: 'application/octet-stream',
            body: 'mock original xlsx bytes',
          })
        : route.fulfill({ status: 404, json: { Message: FILE_NOT_FOUND } });
    }

    const single = /\/v1\/files\/(\d+)$/.exec(pathname);
    if (single) {
      return Number(single[1]) === failedId
        ? route.fulfill({ status: 200, json: failed })
        : route.fulfill({ status: 404, json: { Message: FILE_NOT_FOUND } });
    }

    const messages = /\/v1\/imports\/([^/]+)\/messages$/.exec(pathname);
    if (messages) {
      return decodeURIComponent(messages[1]) === failedWoid
        ? route.fulfill({
            status: 200,
            json: createImportMessageList(servedMessages()),
          })
        : route.fulfill({ status: 404, json: { Message: IMPORT_NOT_FOUND } });
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

/** The details card, named by the file's title. */
function detailsFor(page: Page, detail: FileDetailRead): Locator {
  return page.getByRole('region', {
    name: present(detail.FileName, 'FileName'),
  });
}

/** Open the Failed file's details and wait for the card to settle. */
async function openFailedFile(
  page: Page,
  failed: FileDetailRead,
): Promise<Locator> {
  await page.goto(`/file-log?file=${present(failed.Id, 'Id')}`);
  const card = detailsFor(page, failed);
  await expect(
    card.getByRole('heading', { name: present(failed.FileName, 'FileName') }),
  ).toBeVisible();
  return card;
}

/** Body rows only — the header row holds column headers, not cells. */
function bodyRows(page: Page, grid: Locator): Locator {
  return grid.getByRole('row').filter({ has: page.getByRole('cell') });
}

async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe("Epic row-level-import-errors, Story 1: View a failed file's row-level errors", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockServices(page, createFailedFileDetail());
    await signIn(page);
  });

  // AC-2
  test('"View row-level errors" shows the failed rows in ascending row-number order, with a placeholder for a missing date and row-number helper text', async ({
    page,
  }) => {
    const failed = createFailedFileDetail();
    const card = await openFailedFile(page, failed);

    await card.getByRole('button', { name: VIEW_ERRORS }).click();

    const grid = card.getByRole('table');
    await expect(grid).toBeVisible();
    await expect(
      grid.getByRole('columnheader', { name: /^row/i }),
    ).toBeVisible();
    await expect(
      grid.getByRole('columnheader', { name: /^observation date/i }),
    ).toBeVisible();
    await expect(
      grid.getByRole('columnheader', { name: /^message/i }),
    ).toBeVisible();

    // Served out of order; shown ascending by row number, numbers exactly as
    // returned, and "—" for the row without an observation date.
    await expect(bodyRows(page, grid)).toHaveText(
      ascendingMessages().map(rowText),
    );

    await expect(card.getByText(/header rows/i)).toBeVisible();

    // The open-grid state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });

  // AC-6
  test('with the row-level errors open, the user can download the original and return to the file details without leaving the File log', async ({
    page,
  }) => {
    const failed = createFailedFileDetail();
    const card = await openFailedFile(page, failed);

    await card.getByRole('button', { name: VIEW_ERRORS }).click();
    const grid = card.getByRole('table');
    await expect(grid).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Download original' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      present(failed.FileName, 'FileName'),
    );
    await expect(page.getByText(DOWNLOAD_TOAST, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/file-log\?/);

    await card.getByRole('button', { name: HIDE_ERRORS }).click();

    await expect(grid).toBeHidden();
    await expect(page).toHaveURL(
      new RegExp(`/file-log\\?(.*&)?file=${present(failed.Id, 'Id')}(&|$)`),
    );
    await expect(card.getByRole('button', { name: VIEW_ERRORS })).toBeVisible();
    await expect(
      card.getByRole('term').filter({ hasText: 'Staging instance ID' }),
    ).toBeVisible();
  });
});
