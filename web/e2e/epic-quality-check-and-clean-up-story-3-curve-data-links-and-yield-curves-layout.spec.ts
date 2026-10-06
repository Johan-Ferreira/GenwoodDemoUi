/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (`/curve-data/v1/...`, the same-origin proxy path)
 *     is aborted by default, then the endpoints this story needs are fulfilled from
 *     the project-wide factories in web/src/mocks/data/:
 *       GET /curve-data/v1/curves                      → { Curves: createCurves() }
 *       GET /curve-data/v1/curves/{Code}/availability  → createAvailability()
 *       GET /curve-data/v1/curves/{Code}/tenors        → { Tenors: createTenors() }
 *                                                        (createShortEndTenors() for *ShortEnd codes)
 *       GET /curve-data/v1/curves/{Code}/rates?ObservationDate=
 *            → createRateList() / createRateList(createShortEndRates()) on the
 *              canonical date, createEmptyRates() on any other date
 *       GET /curve-data/v1/imports/{Woid}              → createImport() for the canonical WOID
 *   - Auth is the client-only demo session (project.md: custom) — sign in through
 *     the sign-in screen; no credentials.
 * - Implementation pattern this assumes:
 *   - Curves, availability, tenors and rates are fetched from the BROWSER via the
 *     API client (client components), so page.route() can intercept them.
 *   - The page selects a curve on load and defaults the valuation date to the
 *     latest available date (CANONICAL_OBSERVATION_DATE), so rates load without input.
 *   - Each By maturity row's source cell is a link whose accessible name is exactly
 *     "View Import Trace" (BR6), navigating to /file-log/imports/{Woid}
 *     (importTracePath) — the same destination as before.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic quality-check-and-clean-up, Story 3: Curve data import-trace
 * links and Yield curves date filter spacing.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import { createCurves } from '../src/mocks/data/curve';
import { createAvailability } from '../src/mocks/data/availability';
import { createShortEndTenors, createTenors } from '../src/mocks/data/tenor';
import {
  CANONICAL_OBSERVATION_DATE,
  CANONICAL_RATE_WOID,
  createEmptyRates,
  createRateList,
  createShortEndRates,
} from '../src/mocks/data/rate';
import { createImport } from '../src/mocks/data/import';
import { createRateMatrix } from '../src/mocks/data/rate-matrix';

import type { Page, Route } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CURVES_PREFIX = '/curve-data/v1/curves/';
const LINK_TEXT = 'View Import Trace';

/** Factory fields are optional in the generated types; fail loudly if one is missing. */
function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) throw new Error(`Mock factory is missing ${field}`);
  return value;
}

const traced = createImport();
const PROCESS_NAME = required(
  traced.ProcessInstance?.ProcessName,
  'ProcessInstance.ProcessName',
);

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Curve code segment of a `/curve-data/v1/curves/{Code}/...` path. */
function curveCode(pathname: string): string {
  return pathname.slice(CURVES_PREFIX.length).split('/')[0] ?? '';
}

/**
 * Abort every data-service call by default, then serve the curve catalogue,
 * availability, tenors, rates and the import trace from the shared factories.
 * (Routes registered later take precedence in Playwright.)
 */
async function mockDataService(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/curve-data/v1/'),
    (route) => route.abort(),
  );
  await page.route(
    (url) => url.pathname === '/curve-data/v1/curves',
    (route) => json(route, 200, { Curves: createCurves() }),
  );
  await page.route(
    (url) =>
      url.pathname.startsWith(CURVES_PREFIX) &&
      url.pathname.endsWith('/availability'),
    (route) => json(route, 200, createAvailability()),
  );
  await page.route(
    (url) =>
      url.pathname.startsWith(CURVES_PREFIX) &&
      url.pathname.endsWith('/tenors'),
    (route) => {
      const code = curveCode(new URL(route.request().url()).pathname);
      const tenors = code.endsWith('ShortEnd')
        ? createShortEndTenors()
        : createTenors();
      return json(route, 200, { Tenors: tenors });
    },
  );
  await page.route(
    (url) =>
      url.pathname.startsWith(CURVES_PREFIX) && url.pathname.endsWith('/rates'),
    (route) => {
      const url = new URL(route.request().url());
      const code = curveCode(url.pathname);
      if (
        url.searchParams.get('ObservationDate') !== CANONICAL_OBSERVATION_DATE
      ) {
        return json(route, 200, createEmptyRates());
      }
      return json(
        route,
        200,
        code.endsWith('ShortEnd')
          ? createRateList(createShortEndRates())
          : createRateList(),
      );
    },
  );
  await page.route(
    (url) => url.pathname === `/curve-data/v1/imports/${CANONICAL_RATE_WOID}`,
    (route) => json(route, 200, traced),
  );
  await page.route(
    (url) =>
      url.pathname.startsWith(CURVES_PREFIX) &&
      url.pathname.endsWith('/rate-matrix'),
    (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get('ObservationDateFrom') ?? '';
      const to = url.searchParams.get('ObservationDateTo') ?? '';
      const matrix = createRateMatrix();
      return json(route, 200, {
        ...matrix,
        Rows: (matrix.Rows ?? []).filter(
          (row) =>
            (!from || (row.ObservationDate ?? '') >= from) &&
            (!to || (row.ObservationDate ?? '') <= to),
        ),
      });
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

test.describe('Epic quality-check-and-clean-up, Story 3: Curve data import-trace links', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
  });

  // AC-3
  test('clicking "View Import Trace" on a row opens the import trace for that row\'s file', async ({
    page,
  }) => {
    await signIn(page);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Curve data', exact: true })
      .click();

    await expect(page).toHaveURL(/\/curve-data$/);
    const main = page.getByRole('main');
    await expect(
      main.getByRole('heading', { level: 1, name: 'Curve data' }),
    ).toBeVisible();

    // The 10Y rate row (canonical rate) has loaded for the latest valuation date.
    const row = main.getByRole('row', { name: /\b10Y\b/ });
    await expect(row).toBeVisible();
    const traceLink = row.getByRole('link', { name: LINK_TEXT, exact: true });
    await expect(traceLink).toBeVisible();

    // Accessibility of the loaded table with the header-less source column.
    const { violations } = await scan(page);
    expect(violations).toEqual([]);

    await traceLink.click();

    await expect(page).toHaveURL(
      new RegExp(`/file-log/imports/${CANONICAL_RATE_WOID}$`),
    );
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 1, name: /import trace/i }),
    ).toBeVisible();
    // The trace shows the workflow instance of the import that produced the rate.
    await expect(
      page.getByRole('main').getByText(PROCESS_NAME, { exact: true }),
    ).toBeVisible();
  });

  // Manual-test fix: By date From / To have calendars; a picked day applies like a typed one.
  test('picking a By date "From" day from its calendar narrows the rows like typing it', async ({
    page,
  }) => {
    await signIn(page);
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Curve data', exact: true })
      .click();
    const main = page.getByRole('main');
    await main.getByRole('tab', { name: 'By date', exact: true }).click();

    const from = main.getByRole('textbox', { name: 'From', exact: true });
    await from.fill('2026-09-29');
    await from.press('Enter');
    await expect(main.getByRole('row', { name: /2026-09-28/ })).toHaveCount(0);
    await expect(main.getByRole('row', { name: /2026-09-29/ })).toBeVisible();

    await main.getByRole('button', { name: 'Choose from date' }).click();
    const calendar = page.getByRole('dialog', { name: 'From date calendar' });
    await expect(calendar).toBeVisible();
    await calendar
      .getByRole('button', { name: /^\w+, 30 September 2026/ })
      .click();

    await expect(from).toHaveValue('2026-09-30');
    await expect(main.getByRole('row', { name: /2026-09-29/ })).toHaveCount(0);
    await expect(main.getByRole('row', { name: /2026-09-30/ })).toBeVisible();
  });
});
