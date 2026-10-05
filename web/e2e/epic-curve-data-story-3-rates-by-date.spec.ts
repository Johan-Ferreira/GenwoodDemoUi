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
 *   - Every data-service request (`**\/v1/**`, i.e. anything through the
 *     same-origin proxy `/curve-data/v1/...`) is aborted by default, then the
 *     curve endpoints are fulfilled from the project-wide factories in
 *     `web/src/mocks/data/` (`createCurves`, `createTenors`, `createRateList`,
 *     `createAvailability`, `createRateMatrix`).
 *   - The rate-matrix mock honours `ObservationDateFrom` / `ObservationDateTo` /
 *     `Tenors`: it echoes the requested tenors as `Tenors[]`, keeps only rows
 *     inside the range, and keeps only cells for requested tenors (cells stay in
 *     the factory's 10Y/1Y/5Y order, so columns must be matched by label).
 * - Implementation pattern this assumes:
 *   - Curve data is fetched in the browser (client component calling the API
 *     client through the `/curve-data` proxy), so page.route() sees it.
 *   - The demo session is client-only (sessionStorage), created by
 *     "Sign in with Genwood SSO"; no cookies or credentials.
 *   - The view switch exposes a control named "By date" (tab, radio or button).
 *   - The By date view has inputs labelled "From", "To" and "Tenors"; the
 *     matrix is requested once the inputs are filled (on change, or when Enter is
 *     pressed in the tenor input).
 *   - The matrix is a real `<table>`: column headers "{label} (%)", one `<tbody>`
 *     row per observation date showing the date in a cell, rates to 4 decimals.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic curve-data, Story 3: Rates by date across a date range.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createAvailability } from '../src/mocks/data/availability';
import { createCurves } from '../src/mocks/data/curve';
import { createRateList } from '../src/mocks/data/rate';
import { createRateMatrix } from '../src/mocks/data/rate-matrix';
import { createTenors } from '../src/mocks/data/tenor';

import type { Locator, Page, Route } from '@playwright/test';
import type { RateMatrixRead } from '../src/types/api-generated';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Scenario fixture: the canonical matrix narrowed to the requested range and tenors. */
function matrixFor(from: string, to: string, tenors: string[]): RateMatrixRead {
  const full = createRateMatrix();
  return {
    Tenors: tenors,
    Rows: (full.Rows ?? [])
      .filter((row) => {
        const date = row.ObservationDate ?? '';
        return (!from || date >= from) && (!to || date <= to);
      })
      .map((row) => ({
        ...row,
        Rates: (row.Rates ?? []).filter((cell) =>
          tenors.includes(cell.TenorLabel ?? ''),
        ),
      })),
  };
}

/** Mock the data service: abort anything under /v1/, then serve the curve endpoints. */
async function mockDataService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(/\/v1\/curves(\/[^?]*)?(\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (/\/v1\/curves\/?$/.test(path)) {
      return json(route, { Curves: createCurves() });
    }
    if (path.endsWith('/tenors')) {
      return json(route, { Tenors: createTenors() });
    }
    if (path.endsWith('/availability')) {
      return json(route, createAvailability());
    }
    if (path.endsWith('/rates')) {
      return json(route, createRateList());
    }
    if (path.endsWith('/rate-matrix')) {
      const from = url.searchParams.get('ObservationDateFrom') ?? '';
      const to = url.searchParams.get('ObservationDateTo') ?? '';
      const tenors = (url.searchParams.get('Tenors') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      return json(route, matrixFor(from, to, tenors));
    }
    return route.abort();
  });
}

/** Sign in to the demo session and open Curve data from the side navigation. */
async function openCurveData(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in with Genwood SSO' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Curve data', exact: true })
    .click();
  await expect(page).toHaveURL(/\/curve-data$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /^Curve data/ }),
  ).toBeVisible();
}

function byDateControl(page: Page): Locator {
  return page
    .getByRole('tab', { name: 'By date', exact: true })
    .or(page.getByRole('radio', { name: 'By date', exact: true }))
    .or(page.getByRole('button', { name: 'By date', exact: true }));
}

test.describe('Epic curve-data, Story 3: Rates by date across a date range', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-1
  test('By date with a range and 1Y,5Y,10Y shows one row per date and one percent column per tenor', async ({
    page,
  }) => {
    await mockDataService(page);
    await openCurveData(page);

    await byDateControl(page).click();
    await page.getByLabel(/^from/i).fill('2026-09-29');
    await page.getByLabel(/^to\b/i).fill('2026-09-30');
    const tenors = page.getByLabel(/tenor/i);
    await tenors.fill('1Y,5Y,10Y');
    await tenors.press('Enter');

    const table = page.getByRole('table');
    // One column per chosen tenor, each labelled in percent, in the order entered.
    await expect(
      table.getByRole('columnheader', { name: /\(%\)$/ }),
    ).toHaveText(['1Y (%)', '5Y (%)', '10Y (%)']);

    // One row per observation date in the range (2026-09-28 is outside it).
    const rows = table.locator('tbody').getByRole('row');
    await expect(rows).toHaveCount(2);

    // Date may render as a row header or a cell; rates follow in column order.
    const row29 = rows.filter({ hasText: '2026-09-29' });
    await expect(row29.locator('th, td')).toHaveText([
      '2026-09-29',
      '3.8510',
      '3.5025',
      '3.5756',
    ]);
    const row30 = rows.filter({ hasText: '2026-09-30' });
    await expect(row30.locator('th, td')).toHaveText([
      '2026-09-30',
      '3.8424',
      '3.4880',
      '3.5575',
    ]);
    await expect(table.getByText('2026-09-28')).toHaveCount(0);

    // Accessibility of the populated By date view (real-browser scan).
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
