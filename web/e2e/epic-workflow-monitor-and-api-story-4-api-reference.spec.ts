/**
 * Story Metadata:
 * - Route: /api-reference
 * - Target File: web/src/app/(app)/api-reference/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (`**\/v1/**`, i.e. anything through the
 *     same-origin proxy) is aborted by default, then the curve endpoints are
 *     fulfilled from the project-wide factories in `web/src/mocks/data/`
 *     (`createCurves`, `createTenors`, `createAvailability`, `createRateList`).
 * - Implementation pattern this assumes:
 *   - The curve list and the example-response rates call are fetched in the
 *     browser (client component calling the API client through the proxy), so
 *     page.route() sees them.
 *   - The demo session is client-only (sessionStorage), created by
 *     "Sign in with Genwood SSO"; no cookies or credentials.
 *   - The side navigation has a link named "API" that opens /api-reference; the
 *     page's level-1 heading starts with "API".
 *   - The Endpoints list is a real `<table>` with "Method" and "Path" column
 *     headers; the example is shown under the text "Example request and response".
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic workflow-monitor-and-api, Story 4: API reference.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createAvailability } from '../src/mocks/data/availability';
import { createCurves } from '../src/mocks/data/curve';
import { createRateList } from '../src/mocks/data/rate';
import { createTenors } from '../src/mocks/data/tenor';

import type { Page, Route } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/** Mock the data service: abort anything under /v1/, then serve the curve endpoints. */
async function mockDataService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
  await page.route(/\/v1\/curves(\/[^?]*)?(\?.*)?$/, (route) => {
    const path = new URL(route.request().url()).pathname;
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
    return route.abort();
  });
}

/** Sign in to the demo session and open API from the side navigation. */
async function openApiReference(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in with Genwood SSO' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'API', exact: true })
    .click();
  await expect(page).toHaveURL(/\/api-reference$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /^API/ }),
  ).toBeVisible();
}

test.describe('Epic workflow-monitor-and-api, Story 4: API reference', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-6
  test('opening API from the side menu shows the endpoints and example, and passes an accessibility scan', async ({
    page,
  }) => {
    await mockDataService(page);
    await openApiReference(page);

    // Endpoints table: four read-only GET operations on live /v1 paths.
    const endpoints = page.getByRole('table');
    await expect(
      endpoints.getByRole('columnheader', { name: 'Method' }),
    ).toBeVisible();
    await expect(
      endpoints.getByRole('columnheader', { name: 'Path' }),
    ).toBeVisible();
    const rows = endpoints.locator('tbody').getByRole('row');
    await expect(rows).toHaveCount(4);
    await expect(rows.filter({ hasText: /^GET\s*\/v1\// })).toHaveCount(4);

    // Example request and response for the chosen curve and date, live rates shown.
    await expect(page.getByText('Example request and response')).toBeVisible();
    await expect(
      page.getByText(
        /GET\s+\S*\/v1\/curves\/[A-Za-z]+\/rates\?ObservationDate=\d{4}-\d{2}-\d{2}/,
      ),
    ).toBeVisible();
    await expect(page.getByText(/"TenorLabel"/).first()).toBeVisible();
    await expect(page.getByText(/3\.55752926323083/).first()).toBeVisible();

    // The prototype's example address never appears.
    await expect(page.getByText(/genwood-demo\.example/)).toHaveCount(0);

    // Accessibility of the populated page (real-browser scan).
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
