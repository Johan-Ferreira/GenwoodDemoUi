/**
 * Story Metadata:
 * - Route: /overview
 * - Target File: web/src/app/(app)/overview/page.tsx
 * - Page Action: modify_existing
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - Every data-service request (`/curve-data/v1/...`, the same-origin proxy path)
 *     is aborted by default, then the endpoint this story needs is fulfilled from
 *     the project-wide factory in web/src/mocks/data/:
 *       GET /curve-data/v1/overview → createOverview()
 *   - Auth is the client-only demo session (project.md: custom) — sign in through
 *     the sign-in screen as in epic-app-shell-and-sign-in story 1; no credentials.
 * - Implementation pattern this assumes:
 *   - The overview is fetched from the BROWSER via getOverview() / the API client
 *     (client component), so page.route() can intercept it.
 *   - Signing in lands on /overview, whose h1 is "Overview".
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic overview-and-yield-curves, Story 1: Overview headline cards.
 * All of this story's ACs are Vitest-covered; this spec is the routable smoke test
 * (the page loads with its four headline cards) plus the real-browser axe scan.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; every
 * backend response is mocked below.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Project-wide factories shared with the Vitest layer — relative imports so the
// Playwright runtime resolves them without alias plumbing.
import { createOverview } from '../src/mocks/data/overview';
import { CANONICAL_OBSERVATION_DATE } from '../src/mocks/data/rate';

import type { Page, Route } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

/**
 * Abort every data-service call by default, then serve the overview from the
 * shared factory. (Routes registered later take precedence in Playwright.)
 */
async function mockDataService(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith('/curve-data/v1/'),
    (route) => route.abort(),
  );
  await page.route(
    (url) => url.pathname === '/curve-data/v1/overview',
    (route) => json(route, 200, createOverview()),
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

test.describe('Epic overview-and-yield-curves, Story 1: Overview headline cards', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await mockDataService(page);
  });

  // AC-1, AC-2, AC-5 (routable smoke — detailed behaviour is covered in Vitest)
  test('the Overview page loads with its four headline cards', async ({
    page,
  }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/overview$/);

    const main = page.getByRole('main');
    await expect(
      main.getByText(`Latest valuation date ${CANONICAL_OBSERVATION_DATE}.`, {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      main.getByText('10Y nominal spot', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText('10Y implied inflation', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText('Files received', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText('+2.1 bp vs prior day', { exact: true }),
    ).toBeVisible();
    await expect(
      main.getByText('3 imported, 1 importing, 1 staged, 1 staging, 3 failed', {
        exact: true,
      }),
    ).toBeVisible();

    // Accessibility of the loaded headline-cards state (dev overlay excluded).
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .exclude('nextjs-portal')
      .analyze();
    expect(violations).toEqual([]);
  });
});
