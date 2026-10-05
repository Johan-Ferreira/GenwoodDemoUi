/**
 * Story Metadata:
 * - Route: /yield-curves
 * - Target File: web/src/app/(app)/yield-curves/page.tsx
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
 *       GET /curve-data/v1/curves/compare?Codes=&ObservationDates=
 *            → createCurveCompare(...) with one createCompareSeries() per requested
 *              code/date pair whose date is in AVAILABLE_DATES (named from the
 *              catalogue, points from createCurvePoints(family)); other pairs are
 *              absent, as the service does. Codes / ObservationDates are accepted
 *              either repeated or comma-separated.
 *   - Auth is the client-only demo session (project.md: custom) — sign in through
 *     the sign-in screen as in epic-app-shell-and-sign-in story 1; no credentials.
 * - Implementation pattern this assumes:
 *   - Curves, availability and compare are fetched from the BROWSER via the API
 *     client (client components), so page.route() can intercept them.
 *   - The mode toggle exposes controls named "Across dates" and "Across families"
 *     (radio, tab or button). The filter row has a "Curve" combobox, a "Valuation
 *     date" text input (applied on Enter) and, in Across dates only, a text input
 *     whose label starts "Compare with".
 *   - The chart card shows its title and subtitle as visible text: Across dates
 *     "{curve name}" / "{date} compared with {compare date}"; Across families
 *     "{Spot|Forward} curves by family" / "{date}, long end".
 *   - Switching mode keeps the chosen curve and valuation date in page state.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic overview-and-yield-curves, Story 4: Yield curves across families.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import { createCurves } from '../src/mocks/data/curve';
import {
  AVAILABLE_DATES,
  LATEST_AVAILABLE_DATE,
  PREVIOUS_AVAILABLE_DATE,
  createAvailability,
} from '../src/mocks/data/availability';
import {
  createCompareSeries,
  createCurveCompare,
} from '../src/mocks/data/curve-compare';
import { POINT_SETS, createCurvePoints } from '../src/mocks/data/curve-points';

import type { Locator, Page, Route } from '@playwright/test';
import type { CurveCompareRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CURVES_PREFIX = '/curve-data/v1/curves/';
const FORWARD_CURVE = 'UK instantaneous nominal forward curve';
/** A non-default valuation date that has data (default is LATEST_AVAILABLE_DATE). */
const CHOSEN_DATE = '2026-09-28';

function json(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Query values given either as repeated keys or comma-separated. */
function listParam(url: URL, key: string): string[] {
  return url.searchParams
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Scenario fixture: one series per requested code/date pair that has data,
 * composed from the shared factories. Pairs without data are absent (BR2).
 */
function compareFor(codes: string[], dates: string[]): CurveCompareRead {
  const catalogue = createCurves();
  const withData = new Set<string>(AVAILABLE_DATES);
  const series = codes.flatMap((code) => {
    const curve = catalogue.find((c) => c.Code === code);
    const family = POINT_SETS.find((set) => set === curve?.Family);
    if (!curve || !family) return [];
    return dates
      .filter((date) => withData.has(date))
      .map((date) =>
        createCompareSeries({
          Code: code,
          Name: curve.Name,
          ObservationDate: date,
          Points: createCurvePoints(family),
        }),
      );
  });
  return createCurveCompare(series);
}

/**
 * Abort every data-service call by default, then serve the curve catalogue,
 * availability and compare from the shared factories.
 * (Routes registered later take precedence in Playwright.)
 */
async function mockDataService(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/curve-data/v1/'),
    (route) => route.abort(),
  );
  await page.route(
    (url) => url.pathname === '/curve-data/v1/curves',
    (route) => json(route, { Curves: createCurves() }),
  );
  await page.route(
    (url) =>
      url.pathname.startsWith(CURVES_PREFIX) &&
      url.pathname.endsWith('/availability'),
    (route) => json(route, createAvailability()),
  );
  await page.route(
    (url) => url.pathname === '/curve-data/v1/curves/compare',
    (route) => {
      const url = new URL(route.request().url());
      return json(
        route,
        compareFor(listParam(url, 'Codes'), listParam(url, 'ObservationDates')),
      );
    },
  );
}

/** Sign in to the demo session and open Yield curves from the side navigation. */
async function openYieldCurves(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Yield curves', exact: true })
    .click();
  await expect(page).toHaveURL(/\/yield-curves$/);
  await expect(
    page
      .getByRole('main')
      .getByRole('heading', { level: 1, name: 'Yield curves' }),
  ).toBeVisible();
}

function modeControl(page: Page, name: string): Locator {
  return page
    .getByRole('radio', { name, exact: true })
    .or(page.getByRole('tab', { name, exact: true }))
    .or(page.getByRole('button', { name, exact: true }));
}

function valuationDate(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Valuation date', exact: true });
}

function compareWith(page: Page): Locator {
  return page.getByRole('textbox', { name: /^Compare with/ });
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
}

test.describe('Epic overview-and-yield-curves, Story 4: Yield curves across families', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
  });

  // AC-4
  test('switching between Across dates and Across families keeps the curve and valuation date and redraws the chart', async ({
    page,
  }) => {
    await openYieldCurves(page);
    const main = page.getByRole('main');

    // Choose a non-default curve (a forward curve) and a non-default valuation date.
    await main.getByRole('combobox', { name: 'Curve', exact: true }).click();
    await page
      .getByRole('option', { name: FORWARD_CURVE, exact: true })
      .click();
    await expect(
      main.getByRole('combobox', { name: 'Curve', exact: true }),
    ).toHaveText(FORWARD_CURVE);

    const dateInput = valuationDate(page);
    await dateInput.fill(CHOSEN_DATE);
    await dateInput.press('Enter');
    await expect(dateInput).toHaveValue(CHOSEN_DATE);

    const compareInput = compareWith(page);
    await expect(compareInput).toBeVisible();
    const compareDate = await compareInput.inputValue();
    await expect(
      main.getByText(`${CHOSEN_DATE} compared with ${compareDate}`, {
        exact: true,
      }),
    ).toBeVisible();

    // Across families: same curve and date, chart redrawn by family.
    await modeControl(page, 'Across families').click();
    await expect(
      main.getByText('Forward curves by family', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText(`${CHOSEN_DATE}, long end`, { exact: true }),
    ).toBeVisible();
    await expect(compareWith(page)).toBeHidden();
    await expect(
      main.getByRole('combobox', { name: 'Curve', exact: true }),
    ).toHaveText(FORWARD_CURVE);
    await expect(valuationDate(page)).toHaveValue(CHOSEN_DATE);

    // Back to Across dates: curve and valuation date unchanged, dated comparison returns.
    await modeControl(page, 'Across dates').click();
    await expect(
      main.getByText(`${CHOSEN_DATE} compared with ${compareDate}`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      main.getByText('Forward curves by family', { exact: true }),
    ).toBeHidden();
    await expect(compareWith(page)).toHaveValue(compareDate);
    await expect(
      main.getByRole('combobox', { name: 'Curve', exact: true }),
    ).toHaveText(FORWARD_CURVE);
    await expect(valuationDate(page)).toHaveValue(CHOSEN_DATE);
  });

  // AC-5
  test('the Yield curves page has no accessibility violations in either mode', async ({
    page,
  }) => {
    await openYieldCurves(page);
    const main = page.getByRole('main');

    // Across dates (default), once the default dates have loaded and the chart settled.
    await expect(
      main.getByText(
        `${LATEST_AVAILABLE_DATE} compared with ${PREVIOUS_AVAILABLE_DATE}`,
        { exact: true },
      ),
    ).toBeVisible();
    const acrossDates = await scan(page);
    expect(acrossDates.violations).toEqual([]);

    // Across families, once the family chart has settled.
    await modeControl(page, 'Across families').click();
    await expect(
      main.getByText('Spot curves by family', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText(`${LATEST_AVAILABLE_DATE}, long end`, { exact: true }),
    ).toBeVisible();
    const acrossFamilies = await scan(page);
    expect(acrossFamilies.violations).toEqual([]);
  });
});
