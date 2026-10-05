/**
 * Story Metadata:
 * - Route: /overview
 * - Target File: web/src/app/(app)/overview/page.tsx
 * - Page Action: modify_existing
 *
 * Epic overview-and-yield-curves, Story 1: Overview headline cards.
 *
 * Production contracts these tests define (implement to them):
 * - The Overview page makes one GET /v1/overview call through getOverview()
 *   (web/src/lib/api/endpoints.ts), wrapped in the shared DataState pattern.
 * - The page subtitle (PageHeader) reads
 *   "Latest valuation date {date}. Source: Bank of England, daily estimated UK yield curves."
 *   and drops the date sentence when LatestValuationDate is absent or empty.
 * - Each stat card is a labelled group: role="group" whose accessible name is
 *   the card label ("Latest valuation date", "10Y nominal spot",
 *   "10Y implied inflation", "Files received"), e.g. via aria-labelledby.
 * - Headline rates show RatePercent to 4 decimals followed by "%". The change
 *   line reads "+2.1 bp vs prior day" / "−1.4 bp vs prior day" (U+2212 minus,
 *   1 decimal) and its element (or an ancestor inside the card) carries
 *   `data-tone="success"` for an increase and `data-tone="danger"` for a decrease.
 * - The Files received detail line (the non-zero status counts) carries
 *   `data-tone="neutral"`.
 * - A failed load shows DataState's persistent role="alert" message with Retry.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data/overview.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OverviewPage from '@/app/(app)/overview/page';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  createEmptyRatesOverview,
  createFileCounts,
  createInflationKeyRate,
  createKeyRate,
  createOverview,
  withoutChange,
} from '@/mocks/data/overview';
import { CANONICAL_OBSERVATION_DATE } from '@/mocks/data/rate';
import type { OverviewRead } from '@/types/api-generated';

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, get: vi.fn() };
});
const mockGet = get as ReturnType<typeof vi.fn>;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/overview',
  useSearchParams: () => new URLSearchParams(),
}));

const SOURCE_SENTENCE =
  'Source: Bank of England, daily estimated UK yield curves.';
const NOMINAL_LABEL = '10Y nominal spot';
const INFLATION_LABEL = '10Y implied inflation';

function mockOverview(
  handler: () => OverviewRead | Promise<OverviewRead>,
): void {
  mockGet.mockImplementation((path: unknown) => {
    if (path === '/v1/overview') return Promise.resolve().then(handler);
    return Promise.reject(new Error(`Unexpected request: ${String(path)}`));
  });
}

function card(name: string): Promise<HTMLElement> {
  return screen.findByRole('group', { name });
}

function toneOf(element: HTMLElement): string | null {
  return element.closest('[data-tone]')?.getAttribute('data-tone') ?? null;
}

describe('Epic overview-and-yield-curves, Story 1: Overview headline cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('shows the latest valuation date in its card and the subtitle, or "No data" and a dateless subtitle when there is none', async () => {
    mockOverview(() => createOverview());
    const { unmount } = render(<OverviewPage />);

    const dateCard = await card('Latest valuation date');
    expect(
      within(dateCard).getByText(CANONICAL_OBSERVATION_DATE),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        `Latest valuation date ${CANONICAL_OBSERVATION_DATE}. ${SOURCE_SENTENCE}`,
      ),
    ).toBeInTheDocument();
    unmount();

    mockOverview(() => createEmptyRatesOverview({ LatestValuationDate: '' }));
    render(<OverviewPage />);

    const emptyDateCard = await card('Latest valuation date');
    expect(within(emptyDateCard).getByText('No data')).toBeInTheDocument();
    expect(
      within(emptyDateCard).getByText('No rates have been imported yet.'),
    ).toBeInTheDocument();
    expect(await screen.findByText(SOURCE_SENTENCE)).toBeInTheDocument();
    expect(
      screen.queryByText(/Latest valuation date \d{4}-\d{2}-\d{2}/),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('shows each headline rate to 4 decimals with "%" and a signed, toned change line', async () => {
    mockOverview(() => createOverview());
    render(<OverviewPage />);

    const nominal = await card(NOMINAL_LABEL);
    expect(nominal).toHaveTextContent(/3\.5575\s*%/);
    const rise = within(nominal).getByText('+2.1 bp vs prior day');
    expect(toneOf(rise)).toBe('success');

    const inflation = await card(INFLATION_LABEL);
    expect(inflation).toHaveTextContent(/3\.2185\s*%/);
    const fall = within(inflation).getByText('−1.4 bp vs prior day');
    expect(toneOf(fall)).toBe('danger');
  });

  // AC-3
  it('shows a headline rate with no prior day without any change line', async () => {
    mockOverview(() =>
      createOverview({
        KeyRates: [withoutChange(createKeyRate()), createInflationKeyRate()],
      }),
    );
    render(<OverviewPage />);

    const nominal = await card(NOMINAL_LABEL);
    expect(nominal).toHaveTextContent(/3\.5575\s*%/);
    expect(nominal).not.toHaveTextContent(/bp/);
    expect(nominal).not.toHaveTextContent(/[—–]/);

    const inflation = await card(INFLATION_LABEL);
    expect(
      within(inflation).getByText('−1.4 bp vs prior day'),
    ).toBeInTheDocument();
  });

  // AC-4
  it('reads "No data" with no unit or change line for a headline rate the service did not return', async () => {
    mockOverview(() => createOverview({ KeyRates: [createKeyRate()] }));
    render(<OverviewPage />);

    const inflation = await card(INFLATION_LABEL);
    expect(within(inflation).getByText('No data')).toBeInTheDocument();
    expect(inflation).not.toHaveTextContent('%');
    expect(inflation).not.toHaveTextContent(/bp/);

    const nominal = await card(NOMINAL_LABEL);
    expect(nominal).toHaveTextContent(/3\.5575\s*%/);

    expect(document.body).not.toHaveTextContent(/NaN|null|undefined/);
    expect(inflation).not.toHaveTextContent(/0\.0000/);
  });

  // AC-5
  it('shows the Files received total with a neutral status breakdown line, even when no rates exist', async () => {
    mockOverview(() => createOverview({ FileCounts: createFileCounts() }));
    const { unmount } = render(<OverviewPage />);

    const files = await card('Files received');
    expect(within(files).getByText('9')).toBeInTheDocument();
    const detail = within(files).getByText(
      '3 imported, 1 importing, 1 staged, 1 staging, 3 failed',
    );
    expect(toneOf(detail)).toBe('neutral');
    unmount();

    mockOverview(() => createEmptyRatesOverview());
    render(<OverviewPage />);

    const filesNoRates = await card('Files received');
    expect(within(filesNoRates).getByText('4')).toBeInTheDocument();
    const breakdown = within(filesNoRates).getByText(
      '1 importing, 1 staged, 1 staging, 1 failed',
    );
    expect(toneOf(breakdown)).toBe('neutral');
    expect(filesNoRates).not.toHaveTextContent(/imported/);
  });

  // AC-6
  it('shows a persistent error with Retry and no cards when the overview cannot load, and Retry reloads the cards', async () => {
    const user = userEvent.setup();
    let serviceUp = false;
    mockOverview(() => {
      if (serviceUp) return createOverview();
      return Promise.reject(
        new ServiceError({
          status: 503,
          description: 'The data service is not responding.',
          retryable: true,
          kind: 'service-error',
        }),
      );
    });
    render(<OverviewPage />);

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('The data service is not responding.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: NOMINAL_LABEL }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Files received' }),
    ).not.toBeInTheDocument();

    serviceUp = true;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    const nominal = await card(NOMINAL_LABEL);
    expect(nominal).toHaveTextContent(/3\.5575\s*%/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
