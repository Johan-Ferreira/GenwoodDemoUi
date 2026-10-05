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
 *   - Every data-service request (`**\/v1/**`, i.e. the same-origin proxy path
 *     `/curve-data/v1/...`) is aborted by default, then the endpoints this story
 *     needs are fulfilled from the project-wide factories in web/src/mocks/data/:
 *       GET /v1/curves                     → { Curves: createCurves() } (honours
 *                                            Family / RateType / Segment via filterCurves)
 *       GET /v1/curves/{Code}/availability → createAvailability()
 *       GET /v1/curves/compare?Codes=&ObservationDates=
 *            → one series (createCompareSeries) per requested code/date pair whose
 *              date is in AVAILABLE_DATES; other pairs are ABSENT (BR2). Name comes
 *              from the curve catalogue. Codes / dates may be repeated params or
 *              comma-separated — both are accepted.
 *   - Auth is the client-only demo session (project.md: custom) — sign in through
 *     "Sign in with Genwood SSO"; no credentials, no cookies.
 * - Implementation pattern this assumes:
 *   - Catalogue, availability and compare are fetched from the BROWSER via the API
 *     client (client components), so page.route() can intercept them.
 *   - The page defaults to "UK nominal spot curve", Valuation date = latest available
 *     date, Compare with = previous available date, and draws the chart without input.
 *   - Filters: a Shadcn Select combobox labelled "Curve" (options = curve names), and
 *     two typeable YYYY-MM-DD text inputs labelled "Valuation date" and "Compare with"
 *     that apply the typed date on Enter (or blur).
 *   - The chart card shows the curve name as a heading, the subtitle
 *     "{date} compared with {compare date}" as one text element, and the y axis label
 *     "Spot rate (%)" or "Forward rate (%)" by the curve's rate type.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic overview-and-yield-curves, Story 3: Yield curves across dates.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import {
  AVAILABLE_DATES,
  LATEST_AVAILABLE_DATE,
  PREVIOUS_AVAILABLE_DATE,
  createAvailability,
} from '../src/mocks/data/availability';
import { createCurves, filterCurves } from '../src/mocks/data/curve';
import {
  createCompareSeries,
  createCurveCompare,
} from '../src/mocks/data/curve-compare';
import { createCurvePoints } from '../src/mocks/data/curve-points';

import type { Page, Route } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const DEFAULT_CURVE = 'UK nominal spot curve';
const FORWARD_CURVE = 'UK instantaneous nominal forward curve';
/** Two other dates with data, used to re-pick the valuation and comparison dates. */
const NEW_VALUATION_DATE = '2026-09-25';
const NEW_COMPARE_DATE = '2026-09-24';

const AVAILABLE: readonly string[] = AVAILABLE_DATES;

function json(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** All values of a query parameter, whether repeated or comma-separated. */
function listParam(params: URLSearchParams, name: string): string[] {
  return params
    .getAll(name)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Scenario fixture: the compare response for the requested codes and dates,
 * composed from the shared factories. Pairs whose date has no data are absent.
 */
function compareFor(codes: string[], dates: string[]) {
  const catalogue = createCurves();
  const series = codes.flatMap((code) => {
    const curve = catalogue.find((c) => c.Code === code);
    return dates
      .filter((date) => AVAILABLE.includes(date))
      .map((date) =>
        createCompareSeries({
          Code: code,
          Name: curve?.Name,
          ObservationDate: date,
          Points: createCurvePoints(
            date === PREVIOUS_AVAILABLE_DATE ? 'NominalPrevious' : 'Nominal',
          ),
        }),
      );
  });
  return createCurveCompare(series);
}

/** Abort every data-service call, then serve catalogue, availability and compare. */
async function mockDataService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(
    (url) => /\/v1\/curves$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      return json(route, {
        Curves: filterCurves(createCurves(), {
          Family: params.get('Family') ?? undefined,
          RateType: params.get('RateType') ?? undefined,
          Segment: params.get('Segment') ?? undefined,
        }),
      });
    },
  );
  await page.route(
    (url) => /\/v1\/curves\/[^/]+\/availability$/.test(url.pathname),
    (route) => json(route, createAvailability()),
  );
  await page.route(
    (url) => /\/v1\/curves\/compare$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      return json(
        route,
        compareFor(
          listParam(params, 'Codes'),
          listParam(params, 'ObservationDates'),
        ),
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
    page.getByRole('heading', { level: 1, name: /^Yield curves/ }),
  ).toBeVisible();
}

/** Type a YYYY-MM-DD date into a labelled date field and apply it. */
async function typeDate(
  page: Page,
  label: string,
  date: string,
): Promise<void> {
  const input = page.getByRole('textbox', { name: label, exact: true });
  await input.fill(date);
  await input.press('Enter');
}

test.describe('Epic overview-and-yield-curves, Story 3: Yield curves across dates', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
  });

  // AC-5
  test('choosing another curve, valuation date or comparison date redraws the chart with the matching rate axis', async ({
    page,
  }) => {
    await openYieldCurves(page);
    const main = page.getByRole('main');

    // Default selection drawn: spot curve, latest vs previous date, spot axis.
    await expect(
      main.getByRole('heading', { name: DEFAULT_CURVE, exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText(
        `${LATEST_AVAILABLE_DATE} compared with ${PREVIOUS_AVAILABLE_DATE}`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      main.getByText('Spot rate (%)', { exact: true }),
    ).toBeVisible();

    // Another curve (a forward curve): title and y axis follow the new curve.
    await main.getByRole('combobox', { name: 'Curve', exact: true }).click();
    await page
      .getByRole('option', { name: FORWARD_CURVE, exact: true })
      .click();
    await expect(
      main.getByRole('heading', { name: FORWARD_CURVE, exact: true }),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { name: DEFAULT_CURVE, exact: true }),
    ).toHaveCount(0);
    await expect(
      main.getByText('Forward rate (%)', { exact: true }),
    ).toBeVisible();
    await expect(main.getByText('Spot rate (%)', { exact: true })).toHaveCount(
      0,
    );

    // Another valuation date: the chart redraws for it.
    await typeDate(page, 'Valuation date', NEW_VALUATION_DATE);
    await expect(
      main.getByText(
        `${NEW_VALUATION_DATE} compared with ${PREVIOUS_AVAILABLE_DATE}`,
        { exact: true },
      ),
    ).toBeVisible();

    // Another comparison date: the chart redraws for it.
    await typeDate(page, 'Compare with', NEW_COMPARE_DATE);
    await expect(
      main.getByText(
        `${NEW_VALUATION_DATE} compared with ${NEW_COMPARE_DATE}`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      main.getByRole('heading', { name: FORWARD_CURVE, exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText('Forward rate (%)', { exact: true }),
    ).toBeVisible();

    // Accessibility of the redrawn chart state (real-browser scan).
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
