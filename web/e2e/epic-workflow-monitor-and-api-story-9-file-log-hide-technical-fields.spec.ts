/**
 * Story Metadata:
 * - Route: /file-log
 * - Target File: web/src/components/files/FileTable.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (any path containing `/v1/`, i.e. anything sent
 *     through the same-origin `/curve-data` proxy) is dispatched by path, with
 *     bodies from the project-wide factories in web/src/mocks/data/:
 *       GET /v1/files       → createFileList()
 *       GET /v1/files/{Id}  → createFileDetail() for its Id; 404 "File not found"
 *                             otherwise
 *       anything else       → aborted
 *   - Auth is the client-only demo session (project.md: custom); sign in through
 *     the "Sign in with Genwood SSO" button — no credentials.
 * - Implementation pattern this assumes:
 *   - The file list and file details are fetched from the browser (client
 *     component via the API client), so page.route() sees them.
 *   - Loading `/file-log?file=<Id>` opens that file's details card, a region named
 *     by the file name, whose key/value grid is a `<dl>` (terms = labels).
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 9: File log hides technical
 * fields. All of this story's ACs are Vitest-tagged; this is the one live smoke
 * test the routable-story rule requires.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
// Project-wide factories shared with the Vitest layer (relative imports).
import { createFileList } from '../src/mocks/data/file-list';
import { createFileDetail } from '../src/mocks/data/file-detail';
import { createMessage } from '../src/mocks/data/message';

import type { Page } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockFileService(page: Page): Promise<void> {
  const list = createFileList();
  const detail = createFileDetail();
  const detailId = required(detail.Id, 'Id');

  await page.route(
    (url) => url.pathname.includes('/v1/'),
    (route) => {
      const { pathname } = new URL(route.request().url());

      if (/\/v1\/files$/.test(pathname)) {
        return route.fulfill({ status: 200, json: list });
      }

      const single = /\/v1\/files\/(\d+)$/.exec(pathname);
      if (single) {
        return Number(single[1]) === detailId
          ? route.fulfill({ status: 200, json: detail })
          : route.fulfill({
              status: 404,
              json: createMessage('File not found'),
            });
      }

      return route.abort();
    },
  );
}

/** Sign in through the demo session (client-only, no credentials). */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
}

test.describe('Epic workflow-monitor-and-api, Story 9: File log hides technical fields', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockFileService(page);
    await signIn(page);
  });

  // AC-1, AC-2 (smoke — full coverage lives in the Vitest file)
  test('the File log has a "#" first column, no Size column, and file details omit Size, Backup file and SHA-256', async ({
    page,
  }) => {
    const detail = createFileDetail();
    const fileName = required(detail.FileName, 'FileName');

    await page.goto('/file-log');
    const headers = page.getByRole('columnheader');
    await expect(headers.first()).toHaveText('#');
    await expect(
      page.getByRole('columnheader', { name: 'Size', exact: true }),
    ).toHaveCount(0);

    await page.goto(`/file-log?file=${required(detail.Id, 'Id')}`);
    const card = page.getByRole('region', { name: fileName });
    await expect(card.getByRole('heading', { name: fileName })).toBeVisible();
    await expect(card.getByRole('term').first()).toBeVisible();
    for (const hidden of ['Size', 'Backup file', 'SHA-256']) {
      await expect(
        card.getByRole('term').filter({ hasText: new RegExp(`^${hidden}$`) }),
      ).toHaveCount(0);
    }
    await expect(
      card.getByRole('button', { name: 'Download original' }),
    ).toBeVisible();
  });
});
