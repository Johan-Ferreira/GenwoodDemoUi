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
 *   - Every data-service request (`**\/v1/**`, i.e. anything sent through the
 *     same-origin `/curve-data` proxy) is intercepted and dispatched by path:
 *     - GET /v1/curves                     → the shared Curve factory (16 curves,
 *                                            filtered by Family/RateType/Segment)
 *     - GET /v1/curves/{Code}/tenors       → the shared Tenor factory
 *     - GET /v1/curves/{Code}/availability → the shared Availability factory
 *     - GET /v1/curves/{Code}/rates        → the shared Rate factory on the
 *                                            canonical date, empty list otherwise
 *     - GET /v1/curves/{Code}/rate-matrix  → the shared RateMatrix factory
 *     - GET /v1/curves/{Code}/rates.csv    → text/csv built from the shared Rate
 *                                            factory (tenor label, tenor years,
 *                                            rate in percent), with NO
 *                                            Content-Disposition header
 *     - anything else                      → aborted (never reaches the service)
 *   - Auth is the client-only demo session (project.md: custom); sign-in is the
 *     "Sign in with Genwood SSO" button, no credentials, no userinfo endpoint.
 * - Implementation pattern this assumes:
 *   - Curves, tenors, availability, rates and the CSV export are fetched from the
 *     browser (client component via `get` / `downloadFile`), so page.route() sees
 *     them. Server Components / Server Actions must NOT fetch these endpoints.
 *   - The page opens on the first catalogue curve (GlcNominalSpotCurve) with the
 *     valuation date set to the latest available date, in the By maturity view.
 *   - "Export CSV" calls downloadFile('/v1/curves/{Code}/rates.csv',
 *     { ObservationDate }, '{Code}-{date}.csv'), so with no Content-Disposition
 *     the file is saved as "{Code}-{date}.csv", then shows the toast
 *     "CSV export prepared.".
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic curve-data, Story 4: Export rates as CSV.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { readFile } from 'node:fs/promises';

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import {
  createCurve,
  createCurves,
  filterCurves,
} from '../src/mocks/data/curve';
import { createShortEndTenors, createTenors } from '../src/mocks/data/tenor';
import { createAvailability } from '../src/mocks/data/availability';
import {
  CANONICAL_OBSERVATION_DATE,
  createEmptyRates,
  createRateList,
  createRates,
  createShortEndRates,
} from '../src/mocks/data/rate';
import { createRateMatrix } from '../src/mocks/data/rate-matrix';

import type { Page } from '@playwright/test';
import type { RateRead } from '../src/types/api-generated';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const EXPORT_TOAST = 'CSV export prepared.';

/** Canonical (first) curve the page opens on. */
const CURVE_CODE = createCurve().Code as string;

/** The 10Y canonical rate as the table shows it (4 decimal places). */
const SHOWN_10Y_RATE = (
  createRates().find((r) => r.TenorLabel === '10Y')?.RatePercent as number
).toFixed(4);

/** CSV of tenor label, tenor years and rate in percent — composed from the shared rates. */
function ratesCsv(rates: RateRead[]): string {
  const lines = rates.map(
    (r) => `${r.TenorLabel},${r.TenorYears},${r.RatePercent}`,
  );
  return ['TenorLabel,TenorYears,RatePercent', ...lines].join('\n') + '\n';
}

function isShortEnd(code: string): boolean {
  return code.endsWith('ShortEnd');
}

/** Intercept every data-service call and answer from the shared factories. */
async function mockCurveService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;

    if (/\/v1\/curves$/.test(pathname)) {
      const curves = filterCurves(createCurves(), {
        Family: searchParams.get('Family') ?? undefined,
        RateType: searchParams.get('RateType') ?? undefined,
        Segment: searchParams.get('Segment') ?? undefined,
      });
      return route.fulfill({ status: 200, json: { Curves: curves } });
    }

    const curvePath = /\/v1\/curves\/([^/]+)\/([^/]+)$/.exec(pathname);
    if (curvePath) {
      const code = decodeURIComponent(curvePath[1]);
      const resource = curvePath[2];
      const shortEnd = isShortEnd(code);
      const date = searchParams.get('ObservationDate');

      switch (resource) {
        case 'tenors':
          return route.fulfill({
            status: 200,
            json: {
              Tenors: shortEnd ? createShortEndTenors() : createTenors(),
            },
          });
        case 'availability':
          return route.fulfill({ status: 200, json: createAvailability() });
        case 'rates':
          return route.fulfill({
            status: 200,
            json:
              date === CANONICAL_OBSERVATION_DATE
                ? createRateList(
                    shortEnd ? createShortEndRates() : createRates(),
                  )
                : createEmptyRates(),
          });
        case 'rate-matrix':
          return route.fulfill({ status: 200, json: createRateMatrix() });
        case 'rates.csv': {
          const rates =
            date === CANONICAL_OBSERVATION_DATE
              ? shortEnd
                ? createShortEndRates()
                : createRates()
              : [];
          // text/csv with NO Content-Disposition — the app names the file itself.
          return route.fulfill({
            status: 200,
            contentType: 'text/csv',
            body: ratesCsv(rates),
          });
        }
        default:
          break;
      }
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

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function expectNoA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
  expect(violations).toEqual([]);
}

test.describe('Epic curve-data, Story 4: Export rates as CSV', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  // AC-1
  test('Export CSV downloads a CSV file of the shown curve and valuation date', async ({
    page,
  }) => {
    await mockCurveService(page);
    await signIn(page);

    await page.goto('/curve-data');
    // The by-maturity table for the canonical curve and latest date has loaded.
    await expect(
      page.getByRole('cell', { name: SHOWN_10Y_RATE, exact: true }),
    ).toBeVisible();

    const csvRequestPromise = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith(
        `/v1/curves/${CURVE_CODE}/rates.csv`,
      ),
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const csvRequest = await csvRequestPromise;
    const download = await downloadPromise;

    // Requested for the shown valuation date, saved under "{Code}-{date}.csv".
    expect(new URL(csvRequest.url()).searchParams.get('ObservationDate')).toBe(
      CANONICAL_OBSERVATION_DATE,
    );
    expect(download.suggestedFilename()).toBe(
      `${CURVE_CODE}-${CANONICAL_OBSERVATION_DATE}.csv`,
    );

    // The saved file is the service's CSV: tenor label, tenor years, rate (%).
    const savedPath = await download.path();
    const saved = await readFile(savedPath, 'utf8');
    expect(saved).toBe(ratesCsv(createRates()));

    await expect(page.getByText(EXPORT_TOAST, { exact: true })).toBeVisible();

    // Post-export state (toast shown) passes the real-browser accessibility scan.
    await expectNoA11yViolations(page);
  });
});
