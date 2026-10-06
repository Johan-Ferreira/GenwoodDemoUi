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
 *     - GET /v1/files            → the shared FileList factory (all statuses)
 *     - GET /v1/files/{Id}       → the shared FileDetail factories; unknown Id →
 *                                  404 `{ "Message": "File not found" }`
 *     - GET /v1/files/{Id}/original → binary body (application/octet-stream) with
 *                                  NO Content-Disposition header (matches the
 *                                  live service, found at manual test)
 *     - anything else            → aborted (never reaches the live service)
 *   - Auth is the client-only demo session (project.md: custom); sign-in is the
 *     "Sign in with Genwood SSO" button, no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - The file list, file details and the original download are fetched from the
 *     browser (client component via `get` / `downloadFile`), so page.route() sees
 *     them. Server Components / Server Actions must NOT fetch these endpoints.
 *   - Selecting a row sets `?file=<Id>` in the URL; loading `/file-log?file=<Id>`
 *     opens that file's details directly.
 *   - The selected table row carries `aria-selected="true"` (the Forest-50 fill and
 *     inset bar are its visual form); other rows do not.
 *   - The details card is a landmark region named by its title (e.g. a `<section>`
 *     with `aria-labelledby` pointing at the file-name heading).
 *   - The key/value grid is a description list (`<dl>` with `<dt>`/`<dd>`) in the
 *     story's order: WOID, Workflow instance, Stage (then Failed step for Failed
 *     files), Received, Inbox location, Record count, Records inserted,
 *     Created by. (Size, Backup file and SHA-256 are not shown — epic
 *     workflow-monitor-and-api story 9.)
 *   - "Download original" saves the file under the file's own FileName (the
 *     service sends no Content-Disposition; its name is preferred only when sent)
 *     via downloadFile in web/src/lib/api/download.ts, and shows the toast.
 *   - A 404 from /v1/files/{Id} shows "File not found" and a link back to the file
 *     list (link name contains "file list"), not the generic error with Retry.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic file-log, Story 3: File details and original download.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import { createFileList } from '../src/mocks/data/file-list';
import {
  createFailedFileDetail,
  createFileDetail,
  createStagingFileDetail,
  createSupersededFileDetail,
} from '../src/mocks/data/file-detail';

import type { Locator, Page } from '@playwright/test';
import type { FileDetailRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const DOWNLOAD_TOAST = 'Original file downloaded from the Backup folder.';
const NOT_FOUND = 'File not found';
const MISSING_ID = 999999;

// Imported files: no "Failed step" row (it follows "Stage" only for Failed files).
const GRID_LABELS = [
  'WOID',
  'Workflow instance',
  'Stage',
  'Received',
  'Inbox location',
  'Record count',
  'Records inserted',
  'Created by',
];

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

/** Superseded (Id 98) file whose service record carries no content hash. */
function supersededWithoutHash(): FileDetailRead {
  const detail = createSupersededFileDetail();
  delete detail.Sha256;
  return detail;
}

/** The detail records the mocked service knows about, by Id. */
function knownDetails(): Map<number, FileDetailRead> {
  return new Map(
    [
      createFileDetail(),
      supersededWithoutHash(),
      createFailedFileDetail(),
      createStagingFileDetail(),
    ].map((detail) => [present(detail.Id, 'Id'), detail]),
  );
}

/**
 * Intercept every data-service call. Files list → shared list factory; detail and
 * original → the known detail records (404 "File not found" otherwise).
 */
async function mockFileService(page: Page): Promise<void> {
  const details = knownDetails();
  const list = createFileList();

  await page.route('**/v1/**', (route) => {
    const { pathname } = new URL(route.request().url());

    if (/\/v1\/files$/.test(pathname)) {
      return route.fulfill({ status: 200, json: list });
    }

    const original = /\/v1\/files\/(\d+)\/original$/.exec(pathname);
    if (original) {
      const detail = details.get(Number(original[1]));
      if (!detail) {
        return route.fulfill({ status: 404, json: { Message: NOT_FOUND } });
      }
      // Exactly what the live service sends: octet-stream, NO Content-Disposition.
      return route.fulfill({
        status: 200,
        contentType: 'application/octet-stream',
        body: 'mock original xlsx bytes',
      });
    }

    const single = /\/v1\/files\/(\d+)$/.exec(pathname);
    if (single) {
      const detail = details.get(Number(single[1]));
      return detail
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

/** The table row for a file, found by its unique shortened WOID. */
function rowFor(page: Page, detail: FileDetailRead): Locator {
  return page
    .getByRole('row')
    .filter({ hasText: present(detail.Woid, 'Woid').slice(0, 8) });
}

/** The details card, named by the file's title. */
function detailsFor(page: Page, detail: FileDetailRead): Locator {
  return page.getByRole('region', {
    name: present(detail.FileName, 'FileName'),
  });
}

/** The details card's title heading. */
function titleOf(card: Locator, detail: FileDetailRead): Locator {
  return card.getByRole('heading', {
    name: present(detail.FileName, 'FileName'),
  });
}

/** The values the key/value grid shows, in label order. */
function expectedGridValues(detail: FileDetailRead): string[] {
  return [
    present(detail.Woid, 'Woid'),
    present(detail.WorkflowInstanceId, 'WorkflowInstanceId'),
    present(detail.Stage, 'Stage'),
    present(detail.ReceivedAt, 'ReceivedAt'),
    present(detail.InboxLocation, 'InboxLocation'),
    String(present(detail.RecordCount, 'RecordCount')),
    present(detail.RecordsInserted, 'RecordsInserted'),
    present(detail.CreatedBy, 'CreatedBy'),
  ];
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic file-log, Story 3: File details and original download', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockFileService(page);
    await signIn(page);
  });

  // AC-1
  test('selecting a file highlights its row and shows its details, and selecting another file moves the selection', async ({
    page,
  }) => {
    const current = createFileDetail();
    const noHash = supersededWithoutHash();

    await page.goto('/file-log');
    await rowFor(page, current).click();

    await expect(page).toHaveURL(
      new RegExp(`[?&]file=${present(current.Id, 'Id')}(&|$)`),
    );
    await expect(rowFor(page, current)).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const card = detailsFor(page, current);
    await expect(titleOf(card, current)).toBeVisible();
    await expect(card.getByRole('term')).toHaveText(GRID_LABELS);
    await expect(card.getByRole('definition')).toHaveText(
      expectedGridValues(current),
    );

    // Details state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    // Selecting another file (one with no content hash) moves the selection.
    await rowFor(page, noHash).click();
    await expect(page).toHaveURL(
      new RegExp(`[?&]file=${present(noHash.Id, 'Id')}(&|$)`),
    );
    await expect(rowFor(page, noHash)).toHaveAttribute('aria-selected', 'true');
    await expect(rowFor(page, current)).not.toHaveAttribute(
      'aria-selected',
      'true',
    );

    const noHashCard = detailsFor(page, noHash);
    await expect(noHashCard.getByRole('term')).toHaveText(GRID_LABELS);
    await expect(noHashCard.getByRole('definition')).toHaveText(
      expectedGridValues(noHash),
    );
  });

  // AC-4
  test('opening a file that does not exist shows "File not found" with a way back to the file list', async ({
    page,
  }) => {
    await page.goto(`/file-log?file=${MISSING_ID}`);

    await expect(page.getByText(NOT_FOUND, { exact: true })).toBeVisible();
    // Specific not-found message, not the generic error with Retry.
    await expect(page.getByRole('button', { name: /retry/i })).toHaveCount(0);

    const backLink = page.getByRole('link', { name: /file list/i });
    await expect(backLink).toBeVisible();

    // Not-found state passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);

    await backLink.click();
    await expect(page).toHaveURL(/\/file-log$/);
    await expect(page.getByText(NOT_FOUND, { exact: true })).toBeHidden();
    await expect(rowFor(page, createFileDetail())).toBeVisible();
  });

  // AC-5
  test('"Download original" saves the source file and confirms it was downloaded', async ({
    page,
  }) => {
    const current = createFileDetail();

    await page.goto(`/file-log?file=${present(current.Id, 'Id')}`);
    const card = detailsFor(page, current);
    await expect(titleOf(card, current)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Download original' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      present(current.FileName, 'FileName'),
    );
    await expect(page.getByText(DOWNLOAD_TOAST, { exact: true })).toBeVisible();
  });
});
