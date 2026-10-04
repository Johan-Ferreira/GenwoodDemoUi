/**
 * Story Metadata:
 * - Route: /sign-in
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: create_new
 *
 * Mocking strategy:
 * - Backend calls are ALWAYS mocked — a Playwright spec never contacts a live
 *   backend (see testing-policy.md § "Playwright runs against mocks, never live").
 *   Intercept via: page.route() (default)
 *   - This story makes no backend calls: auth is `custom` (project.md) and the demo
 *     session is client-only (display name fixed to "Demo user", no credentials, no
 *     identity provider, no userinfo endpoint). The view pages are title-only
 *     placeholders.
 *   - As a guard, every data-service request (`**\/v1/**`, i.e. anything routed
 *     through the same-origin proxy) is aborted, so the frame never depends on the
 *     live service at http://localhost:10020.
 * - Implementation pattern this assumes:
 *   - Sign-in is a client-side action: choosing "Sign in with Genwood SSO" creates
 *     the demo session in browser storage (e.g. sessionStorage/localStorage) and
 *     navigates to Overview. Sign-out clears it and navigates to /sign-in.
 *   - The protected (app) route group checks the session in the browser; with no
 *     session, `/` and every view route (e.g. /file-log, /api-reference) redirect
 *     to /sign-in. `/` never renders the template welcome page.
 *   - Back after sign-out: the session is re-checked on `pageshow` (bfcache restore)
 *     or protected responses are `no-store`, so Back lands on /sign-in.
 *   - The header is a `<header>` (banner landmark) holding the logo (alt "Genwood"),
 *     "Yield curve data", "Demo user" and a "Sign out" button.
 *   - The sidebar is the frame's only `<nav>` landmark; its six items are links in
 *     order, under visible group labels "Data" and "Governance". The active item
 *     carries `aria-current="page"`.
 *   - Each view (placeholder or real) renders its title as the page's `<h1>`.
 * - If the implementation diverges from these assumptions, this spec will not pass.
 *
 * E2E spec for Epic app-shell-and-sign-in, Story 1: Sign in and the Genwood app frame.
 * playwright.config.ts's webServer block boots the FRONTEND dev server only; no live
 * backend is contacted and no credentials are used.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import type { Locator, Page } from '@playwright/test';

const SIGN_IN_BUTTON = 'Sign in with Genwood SSO';
const DISCLAIMER =
  'Demo only: no credentials are checked. You will be signed in as Demo user.';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const NAV_ITEMS = [
  'Overview',
  'File log',
  'Curve data',
  'Yield curves',
  'Workflow monitor',
  'API',
] as const;

/** Abort any data-service request so the frame never touches the live backend. */
async function blockDataService(page: Page): Promise<void> {
  await page.route('**/v1/**', (route) => route.abort());
}

function overviewHeading(page: Page): Locator {
  return page.getByRole('heading', { level: 1, name: 'Overview' });
}

function sideNav(page: Page): Locator {
  return page.getByRole('navigation');
}

/** Sign in from the sign-in screen and wait for Overview inside the frame. */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: SIGN_IN_BUTTON }).click();
  await expect(overviewHeading(page)).toBeVisible();
}

/**
 * Move keyboard focus with Tab until `target` is focused (bounded), so focus
 * arrives the way a keyboard user's does and :focus-visible applies.
 */
async function tabTo(
  page: Page,
  target: Locator,
  maxPresses = 25,
): Promise<void> {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  await expect(target).toBeFocused();
}

/** Accessibility scan scoped to WCAG 2.1 AA; the Next.js dev overlay is excluded. */
async function scan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .exclude('nextjs-portal')
    .analyze();
}

/** True when the focused element shows a visible focus indicator (outline or ring). */
async function hasVisibleFocus(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const outline =
      style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const ring = style.boxShadow !== 'none' && style.boxShadow !== '';
    return outline || ring;
  });
}

test.describe('Epic app-shell-and-sign-in, Story 1: Sign in and the Genwood app frame', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await blockDataService(page);
  });

  // AC-1
  test('signing in with Genwood SSO lands on Overview inside the app frame', async ({
    page,
  }) => {
    await page.goto('/sign-in');

    const signInButton = page.getByRole('button', { name: SIGN_IN_BUTTON });
    await expect(signInButton).toBeVisible();
    await expect(page.getByText(DISCLAIMER)).toBeVisible();
    // No credential fields of any kind.
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    await signInButton.click();

    await expect(overviewHeading(page)).toBeVisible();
    const header = page.getByRole('banner');
    await expect(header.getByRole('img', { name: 'Genwood' })).toBeVisible();
    await expect(
      header.getByText('Yield curve data', { exact: true }),
    ).toBeVisible();
    await expect(header.getByText('Demo user', { exact: true })).toBeVisible();
    await expect(
      header.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible();
  });

  // AC-2
  test('side navigation lists the six views in groups and marks the chosen one active', async ({
    page,
  }) => {
    await signIn(page);

    const nav = sideNav(page);
    await expect(nav.getByRole('link')).toHaveText([...NAV_ITEMS]);
    await expect(nav.getByText('Data', { exact: true })).toBeVisible();
    await expect(nav.getByText('Governance', { exact: true })).toBeVisible();

    for (const item of NAV_ITEMS) {
      const link = nav.getByRole('link', { name: item, exact: true });
      await link.click();
      await expect(
        page.getByRole('heading', { level: 1, name: new RegExp(`^${item}`) }),
      ).toBeVisible();
      await expect(link).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    }

    // The two addresses the story fixes explicitly.
    await nav.getByRole('link', { name: 'File log', exact: true }).click();
    await expect(page).toHaveURL(/\/file-log$/);
    await nav.getByRole('link', { name: 'API', exact: true }).click();
    await expect(page).toHaveURL(/\/api-reference$/);
  });

  // AC-3
  test('signing out returns to sign-in and the next sign-in lands on Overview', async ({
    page,
  }) => {
    await signIn(page);

    await sideNav(page)
      .getByRole('link', { name: 'Curve data', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: /^Curve data/ }),
    ).toBeVisible();

    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page).toHaveURL(/\/sign-in$/);
    const signInButton = page.getByRole('button', { name: SIGN_IN_BUTTON });
    await expect(signInButton).toBeVisible();

    await signInButton.click();
    await expect(overviewHeading(page)).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /^Curve data/ }),
    ).toBeHidden();
    await expect(
      sideNav(page).getByRole('link', { name: 'Overview', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  // AC-4
  test('signed-out visits to the root or any view redirect to sign-in', async ({
    page,
  }) => {
    for (const path of ['/', '/file-log', '/api-reference']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(
        page.getByRole('button', { name: SIGN_IN_BUTTON }),
      ).toBeVisible();
      // Never the template welcome page, never the protected frame.
      await expect(page.getByText(/welcome/i)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(
        0,
      );
    }
  });

  // AC-5
  test('pressing Back after signing out returns to sign-in, not the protected page', async ({
    page,
  }) => {
    await signIn(page);
    await sideNav(page)
      .getByRole('link', { name: 'File log', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: /^File log/ }),
    ).toBeVisible();

    await page
      .getByRole('banner')
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(
      page.getByRole('button', { name: SIGN_IN_BUTTON }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /^File log/ }),
    ).toBeHidden();
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  });

  // AC-6
  test('sign-in screen and app frame pass an accessibility scan with visible focus', async ({
    page,
  }) => {
    // Sign-in screen: settled, scanned, and the button shows visible keyboard focus.
    await page.goto('/sign-in');
    const signInButton = page.getByRole('button', { name: SIGN_IN_BUTTON });
    await expect(signInButton).toBeVisible();
    const signInScan = await scan(page);
    expect(signInScan.violations).toEqual([]);

    await tabTo(page, signInButton);
    expect(await hasVisibleFocus(signInButton)).toBe(true);

    // Sign in with the keyboard, then scan the app frame.
    await page.keyboard.press('Enter');
    await expect(overviewHeading(page)).toBeVisible();
    const frameScan = await scan(page);
    expect(frameScan.violations).toEqual([]);

    // Keyboard focus is visible on Sign out and on a nav item.
    const signOut = page
      .getByRole('banner')
      .getByRole('button', { name: 'Sign out' });
    await tabTo(page, signOut);
    expect(await hasVisibleFocus(signOut)).toBe(true);

    const navItem = sideNav(page).getByRole('link', {
      name: 'File log',
      exact: true,
    });
    await tabTo(page, navItem);
    expect(await hasVisibleFocus(navItem)).toBe(true);
  });
});
