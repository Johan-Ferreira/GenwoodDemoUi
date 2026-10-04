/**
 * Story Metadata:
 * - Route: /file-log/imports/[woid]
 * - Target File: web/src/app/(app)/file-log/imports/[woid]/page.tsx
 * - Page Action: create_new
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (`/curve-data/v1/...`, the same-origin proxy path)
 *     is aborted by default, then the endpoints this story needs are fulfilled from
 *     the project-wide factories in web/src/mocks/data/:
 *       GET /curve-data/v1/files            → createFileList()
 *       GET /curve-data/v1/files/{Id}       → createFileDetail()
 *       GET /curve-data/v1/imports/{Woid}   → createImport() for the canonical WOID,
 *                                             404 { Message: "Import not found" } otherwise
 *   - Auth is the client-only demo session (project.md: custom) — sign in through
 *     the sign-in screen as in epic-app-shell-and-sign-in story 1; no credentials.
 * - Implementation pattern this assumes:
 *   - The file list, file detail and import trace are fetched from the BROWSER via
 *     the API client (client components), so page.route() can intercept them.
 *   - The file details card (story 3) shows a "Trace import" LINK that navigates to
 *     /file-log/imports/{Woid} for the selected file.
 *   - The trace page renders inside the app frame's <main>, with an <h1> naming the
 *     import trace; a 404 renders "Import not found" plus a link back to the file
 *     list (/file-log) — not the generic error with Retry.
 *   - The demo session lives in browser storage and survives page.goto in the tab.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic file-log, Story 4: Trace a file to its import.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import { createFile } from '../src/mocks/data/file';
import { createFileList } from '../src/mocks/data/file-list';
import { createFileDetail } from '../src/mocks/data/file-detail';
import { createImport } from '../src/mocks/data/import';

import type { Page, Route } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

const traced = createImport();
const tracedFile = createFile();
const FILE_ID = required(tracedFile.Id, 'File.Id');
const FILE_NAME = required(tracedFile.FileName, 'File.FileName');
const WOID = required(tracedFile.Woid, 'File.Woid');
const PROCESS_NAME = required(
  traced.ProcessInstance?.ProcessName,
  'ProcessInstance.ProcessName',
);
const MISSING_WOID = 'ffffffffffffffffffffffffffffffff';

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Abort every data-service call by default, then serve the file list, the
 * canonical file detail and the import trace from the shared factories.
 * (Routes registered later take precedence in Playwright.)
 */
async function mockDataService(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/curve-data/v1/'),
    (route) => route.abort(),
  );
  await page.route(
    (url) => url.pathname === '/curve-data/v1/files',
    (route) => json(route, 200, createFileList()),
  );
  await page.route(
    (url) => url.pathname === `/curve-data/v1/files/${FILE_ID}`,
    (route) => json(route, 200, createFileDetail()),
  );
  await page.route(
    (url) => url.pathname.startsWith('/curve-data/v1/imports/'),
    (route) => {
      const woid = new URL(route.request().url()).pathname.split('/').pop();
      return woid === WOID
        ? json(route, 200, traced)
        : json(route, 404, { Message: 'Import not found' });
    },
  );
}

/** Sign in through the demo session and wait for Overview inside the frame. */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
}

test.describe('Epic file-log, Story 4: Trace a file to its import', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
  });

  // AC-1
  test('choosing "Trace import" in a file\'s details opens that file\'s import trace', async ({
    page,
  }) => {
    await signIn(page);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'File log', exact: true })
      .click();

    await page
      .getByRole('row', { name: new RegExp(FILE_NAME.replace(/\./g, '\\.')) })
      .click();

    const traceLink = page.getByRole('link', { name: 'Trace import' });
    await expect(traceLink).toBeVisible();
    await traceLink.click();

    await expect(page).toHaveURL(new RegExp(`/file-log/imports/${WOID}$`));
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 1, name: /import trace/i }),
    ).toBeVisible();
    // The trace is for the chosen file and shows its workflow instance.
    await expect(
      main.getByText(FILE_NAME, { exact: true }).first(),
    ).toBeVisible();
    await expect(main.getByText(PROCESS_NAME, { exact: true })).toBeVisible();

    // Accessibility of the loaded trace state.
    const { violations } = await scan(page);
    expect(violations).toEqual([]);
  });

  // AC-3
  test('a WOID with no import shows "Import not found" with a way back to the file list', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/file-log/imports/${MISSING_WOID}`);

    const main = page.getByRole('main');
    await expect(main.getByText('Import not found')).toBeVisible();
    // The specific not-found state, not the generic error with Retry.
    await expect(main.getByRole('button', { name: /retry/i })).toHaveCount(0);

    // Accessibility of the not-found state.
    const { violations } = await scan(page);
    expect(violations).toEqual([]);

    await main.getByRole('link', { name: /file (log|list)/i }).click();
    await expect(page).toHaveURL(/\/file-log$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /^File log/ }),
    ).toBeVisible();
  });
});
