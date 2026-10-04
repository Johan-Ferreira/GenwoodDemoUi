/**
 * Story Metadata:
 * - Route: /sign-in (frame shared by every (app) route)
 * - Target File: web/src/app/(app)/layout.tsx (+ web/src/app/sign-in/page.tsx)
 * - Page Action: create_new
 *
 * Per-epic baseline for Epic app-shell-and-sign-in: invariants of the shared
 * Genwood app frame that every later story and epic relies on.
 *
 * Contract this assumes:
 * - The sign-in page (default export of web/src/app/sign-in/page.tsx) records the
 *   client-only demo session in browser storage, because it sits outside the (app)
 *   route group and its session provider. The (app) layout reads that session.
 * - The (app) layout (default export) renders the header and the side navigation
 *   around its children when a session exists.
 * - The active nav item carries aria-current="page".
 *
 * Only next/navigation is mocked (jsdom has no App Router). No API calls are made.
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SignInPage from '@/app/sign-in/page';
import AppLayout from '@/app/(app)/layout';

const mockPathname = vi.fn(() => '/file-log');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => mockPathname(),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const NAV_ITEMS = [
  'Overview',
  'File log',
  'Curve data',
  'Yield curves',
  'Workflow monitor',
  'API',
] as const;

/** Sign in through the real sign-in page, then render the app frame. */
async function renderSignedInFrame(): Promise<void> {
  const user = userEvent.setup();
  render(<SignInPage />);
  await user.click(
    screen.getByRole('button', { name: 'Sign in with Genwood SSO' }),
  );
  cleanup();

  render(
    <AppLayout>
      <h1>View content</h1>
    </AppLayout>,
  );
  await screen.findByRole('navigation');
}

describe('Epic app-shell-and-sign-in baseline: Genwood app frame', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockPathname.mockReturnValue('/file-log');
  });

  // AC-1 (baseline: BR2 — always signed in as "Demo user")
  it('header shows the Genwood logo, "Yield curve data", "Demo user" and Sign out around the view', async () => {
    await renderSignedInFrame();

    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('img', { name: 'Genwood' }),
    ).toBeInTheDocument();
    expect(within(header).getByText('Yield curve data')).toBeInTheDocument();
    expect(within(header).getByText('Demo user')).toBeInTheDocument();
    expect(
      within(header).getByRole('button', { name: 'Sign out' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('heading', { name: 'View content' }),
    ).toBeInTheDocument();
  });

  // AC-2 (baseline: R4/BR1 — no role gating, every destination available)
  it('side navigation offers all six views as links, grouped under Data and Governance', async () => {
    await renderSignedInFrame();

    const nav = screen.getByRole('navigation');
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim()),
    ).toEqual([...NAV_ITEMS]);
    expect(within(nav).getByText('Data')).toBeInTheDocument();
    expect(within(nav).getByText('Governance')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'File log' })).toHaveAttribute(
      'href',
      '/file-log',
    );
    expect(within(nav).getByRole('link', { name: 'API' })).toHaveAttribute(
      'href',
      '/api-reference',
    );
  });

  // AC-2 (baseline: active-item indicator follows the current address)
  it('marks only the nav item for the current view as active', async () => {
    mockPathname.mockReturnValue('/api-reference');
    await renderSignedInFrame();

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'API' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('link', { name: 'File log' }),
    ).not.toHaveAttribute('aria-current');
    expect(
      within(nav).getByRole('link', { name: 'Overview' }),
    ).not.toHaveAttribute('aria-current');
  });
});
