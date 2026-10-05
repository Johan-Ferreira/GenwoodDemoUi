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
 *   - `GET .../v1/curves` (served through the same-origin /curve-data proxy) is
 *     fulfilled from the project-wide 16-curve catalogue in web/src/mocks/data/curve.
 *     The handler behaves like the service: it honours the optional `Family`,
 *     `RateType` and `Segment` query parameters (via `filterCurves`), so the page may
 *     filter in memory OR through the query — either passes.
 *   - `GET .../v1/curves/{Code}/availability`, `/tenors` and `/rates` are served from
 *     the availability / tenor / rate factories (short-end bodies for `*ShortEnd`
 *     codes), so whichever curve is selected loads its table.
 *   - Every other data-service request (`**\/v1/**`) is aborted.
 * - Implementation pattern this assumes:
 *   - Curve data is fetched from the browser (client component via the API client),
 *     so page.route() can intercept it — not from a Server Component or Server Action.
 *   - The demo session is client-only (sign in via "Sign in with Genwood SSO", as in
 *     the app-shell spec); no credentials, no userinfo endpoint.
 *   - Filter controls are Shadcn Select comboboxes labelled "Family", "Rate type" and
 *     "Segment", each defaulting to "All"; options include "Inflation", "Forward" and
 *     "Long" by those exact names.
 *   - The curve picker is a Shadcn Select combobox labelled "Curve" whose options are
 *     the curve names (e.g. "UK implied inflation spot curve").
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic curve-data, Story 2: Filter the curve catalogue.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below, so no live backend is contacted.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Shared project-wide factories (relative imports — no @/ alias in the e2e layer).
import { createCurves, filterCurves } from '../src/mocks/data/curve';
import { createAvailability } from '../src/mocks/data/availability';
import { createShortEndTenors, createTenors } from '../src/mocks/data/tenor';
import {
  createRateList,
  createRates,
  createShortEndRates,
} from '../src/mocks/data/rate';

import type { Page } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Curve names from the shared catalogue matching the given filters. */
function curveNames(filters: {
  Family?: string;
  RateType?: string;
  Segment?: string;
}): string[] {
  return filterCurves(createCurves(), filters).map((c) => c.Name as string);
}

/** Abort every data-service call, then serve the curve endpoints from the factories. */
async function mockCurveService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());

  await page.route(
    (url) => /\/v1\/curves$/.test(url.pathname),
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const curves = filterCurves(createCurves(), {
        Family: params.get('Family') ?? undefined,
        RateType: params.get('RateType') ?? undefined,
        Segment: params.get('Segment') ?? undefined,
      });
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Curves: curves }),
      });
    },
  );

  await page.route(
    (url) =>
      /\/v1\/curves\/[^/]+\/(availability|tenors|rates)$/.test(url.pathname),
    (route) => {
      const [, code, resource] =
        /\/v1\/curves\/([^/]+)\/([^/]+)$/.exec(
          new URL(route.request().url()).pathname,
        ) ?? [];
      const shortEnd = (code ?? '').endsWith('ShortEnd');
      let body: unknown;
      if (resource === 'availability') {
        body = createAvailability();
      } else if (resource === 'tenors') {
        body = { Tenors: shortEnd ? createShortEndTenors() : createTenors() };
      } else {
        body = createRateList(shortEnd ? createShortEndRates() : createRates());
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    },
  );
}

/** Sign in with the demo session and open Curve data from the side navigation. */
async function openCurveData(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Overview' }),
  ).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Curve data', exact: true })
    .click();
  await expect(page).toHaveURL(/\/curve-data$/);
}

async function chooseOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Open the Curve picker, assert it lists exactly these curve names, then close it. */
async function expectCurveOptions(page: Page, names: string[]): Promise<void> {
  await page.getByRole('combobox', { name: 'Curve', exact: true }).click();
  const options = page.getByRole('listbox').getByRole('option');
  await expect(options).toHaveCount(names.length);
  for (const name of names) {
    await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
}

test.describe('Epic curve-data, Story 2: Filter the curve catalogue', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockCurveService(page);
  });

  // AC-1
  test('family, rate type and segment filters combine to list only matching curves', async ({
    page,
  }) => {
    await openCurveData(page);
    for (const label of ['Family', 'Rate type', 'Segment']) {
      await expect(
        page.getByRole('combobox', { name: label, exact: true }),
      ).toContainText('All');
    }
    await expectCurveOptions(page, curveNames({}));

    // Family alone: only the four inflation curves.
    await chooseOption(page, 'Family', 'Inflation');
    await expectCurveOptions(page, curveNames({ Family: 'Inflation' }));

    // Family + rate type + segment combine: the single long-end inflation forward curve.
    await chooseOption(page, 'Rate type', 'Forward');
    await chooseOption(page, 'Segment', 'Long');
    const remaining = curveNames({
      Family: 'Inflation',
      RateType: 'Forward',
      Segment: 'Long',
    });
    await expectCurveOptions(page, remaining);

    // Accessibility of the filter bar state introduced by this story.
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
