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
 *     behaves like the service: it filters by `ReceivedFrom` / `ReceivedTo` (dates
 *     compared on the YYYY-MM-DD part of ReceivedAt, both ends inclusive), plus
 *     `Status` / `CurveFamily`, then honours `Page`/`Size`.
 *   - Every other data-service request (`**\/v1/**`) is aborted.
 * - "Today" is pinned with page.clock.setFixedTime (timers keep running), so the
 *   calendar's default month (today's month, BR3) is deterministic.
 * - Implementation pattern this assumes:
 *   - The file list is fetched from the browser (client component via the API
 *     client), so page.route() can intercept it.
 *   - The demo session is client-only (sign in via "Sign in with Genwood SSO").
 *   - Each received-date filter keeps its text input (labelled "Received from" /
 *     "Received to") and gains a calendar button named "Choose received-from date"
 *     / "Choose received-to date" (same pattern as ValuationDateField).
 *   - The button opens a labelled dialog (name contains "Received from"/"Received
 *     to") holding a react-day-picker grid named by its month (e.g. "October 2026").
 *     Day buttons are named with the full date (day number + month name + year).
 *   - Picking a day writes YYYY-MM-DD into the field, applies it at once (sending
 *     ReceivedFrom/ReceivedTo exactly as a typed date would) and closes the dialog.
 *   - Keyboard: Enter on the button opens the dialog; Tab reaches the day grid;
 *     PageUp/arrow keys move between days/months; Enter picks the focused day.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic quality-check-and-clean-up, Story 2: Date pickers on the File
 * log received-date filters.
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
const DEFAULT_PAGE_SIZE = 20;
const FROM_BUTTON = 'Choose received-from date';
const TO_BUTTON = 'Choose received-to date';

/** Ids of the canonical files received on or after 2026-09-29. */
const RECEIVED_FROM_29_SEPT = [104, 105, 103, 106, 102, 101, 98, 97];

/**
 * 25 files: the canonical mixed collection (received 2026-09-28..30) plus 16
 * older Imported Nominal files (Ids 60–75, received 2026-09-04..19).
 */
function buildAllFiles(): FileRead[] {
  const older = Array.from({ length: 16 }, (_, i) => {
    const day = String(19 - i).padStart(2, '0');
    return createFile({
      Id: 75 - i,
      ReceivedAt: `2026-09-${day} 18:00:00`,
      Woid: `${75 - i}${'0'.repeat(30)}`,
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
  await expect(dataRows(page)).toHaveCount(DEFAULT_PAGE_SIZE);
}

/** Data rows only (header row holds columnheaders, not cells). */
function dataRows(page: Page): Locator {
  return page
    .getByRole('table')
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });
}

/** Assert the table shows exactly these file Ids. */
async function expectRows(page: Page, ids: number[]): Promise<void> {
  await expect(dataRows(page)).toHaveCount(ids.length);
  for (const id of ids) {
    await expect(
      dataRows(page).filter({
        has: page.getByRole('cell', { name: String(id), exact: true }),
      }),
    ).toBeVisible();
  }
}

/** The calendar dialog for a received-date filter ("Received from" / "Received to"). */
function calendarDialog(page: Page, label: RegExp): Locator {
  return page.getByRole('dialog', { name: label });
}

/** A day button named with day 29 of September (accepts "29 September" or "September 29th"). */
function september29(dialog: Locator): Locator {
  return dialog.getByRole('button', {
    name: /\b29(th)?\b,? September|September 29(th)?\b/,
  });
}

test.describe('Epic quality-check-and-clean-up, Story 2: File log date pickers', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockFileService(page, buildAllFiles());
  });

  // AC-2
  test('picking a day in the Received from calendar fills the field, closes the calendar and narrows the list', async ({
    page,
  }) => {
    // Today = 30 Sept 2026, so the empty field's calendar opens on September 2026.
    await page.clock.setFixedTime(new Date('2026-09-30T12:00:00Z'));
    await openFileLog(page);

    await page.getByRole('button', { name: FROM_BUTTON, exact: true }).click();
    const dialog = calendarDialog(page, /received from/i);
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('grid', { name: /September 2026/ }),
    ).toBeVisible();

    // Accessibility of the open calendar — the state this story introduces.
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);

    await september29(dialog).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByLabel('Received from', { exact: true })).toHaveValue(
      '2026-09-29',
    );
    await expectRows(page, RECEIVED_FROM_29_SEPT);
  });

  // AC-4
  test('calendar buttons are named and a day can be picked with the keyboard alone', async ({
    page,
  }) => {
    // Today = 15 Oct 2026: the calendar opens on October; the keyboard moves to September.
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    await openFileLog(page);

    const fromButton = page.getByRole('button', {
      name: FROM_BUTTON,
      exact: true,
    });
    await expect(fromButton).toBeVisible();
    await expect(
      page.getByRole('button', { name: TO_BUTTON, exact: true }),
    ).toBeVisible();

    // Tab from the "Received from" field to its calendar button, open it with Enter.
    await page.getByLabel('Received from', { exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(fromButton).toBeFocused();
    await page.keyboard.press('Enter');

    const dialog = calendarDialog(page, /received from/i);
    await expect(dialog).toBeVisible();
    const october = dialog.getByRole('grid', { name: /October 2026/ });
    await expect(october).toBeVisible();

    // Tab through the dialog's controls (month navigation buttons) into the day grid.
    const focusedDay = dialog.getByRole('grid').locator('button:focus');
    for (let i = 0; i < 5 && (await focusedDay.count()) === 0; i += 1) {
      await page.keyboard.press('Tab');
    }
    // Focus lands on today (15 October) in the grid.
    await expect(focusedDay).toHaveAccessibleName(
      /\b15(th)?\b,? October|October 15(th)?\b/,
    );

    // PageUp = previous month (15 September), two weeks down = 29 September.
    await page.keyboard.press('PageUp');
    await expect(
      dialog.getByRole('grid', { name: /September 2026/ }),
    ).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(september29(dialog)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(dialog).toBeHidden();
    await expect(page.getByLabel('Received from', { exact: true })).toHaveValue(
      '2026-09-29',
    );
    await expectRows(page, RECEIVED_FROM_29_SEPT);
  });
});
