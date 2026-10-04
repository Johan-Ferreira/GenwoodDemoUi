/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Epic curve-data, Story 1: Rates by maturity for a curve and valuation date.
 *
 * Production contracts these tests define (implement to them):
 * - The page loads the catalogue (GET /v1/curves) into a "Curve" select that
 *   defaults to "UK nominal spot curve" (GlcNominalSpotCurve), then loads that
 *   curve's tenors (GET /v1/curves/{Code}/tenors) and availability
 *   (GET /v1/curves/{Code}/availability) through the typed endpoint functions
 *   in web/src/lib/api/endpoints.ts.
 * - "Valuation date" is a TEXT input (typed YYYY-MM-DD; not type="date") that
 *   starts at the availability MaxDate. Its accessible description
 *   (aria-describedby) names the earliest and latest dates. A "Choose
 *   valuation date" button opens a "Valuation date calendar" dialog (UTC
 *   days) bounded by MinDate/MaxDate; days with data have "data imported" in
 *   their accessible name; picking a day applies it at once and closes it.
 * - An invalid date (isIsoDate false) shows "Enter the observation date as
 *   YYYY-MM-DD." and no GET .../rates request is made for it.
 * - The by-maturity table has one body row per service tenor (never a hard-coded
 *   grid), joined to GET .../rates?ObservationDate= by tenor LABEL (not
 *   position). Columns: Tenor, Years, Months, Source column, Rate (%),
 *   Source row, Source import (WOID). Years and Rate (%) show 4 decimals; the
 *   WOID cell is a link to /file-log/imports/{Woid} showing its first 8 chars.
 * - An empty Rates array shows "No data imported" plus the hint "Choose another
 *   valuation date or import a file." with no rate rows and no error alert.
 * - A failed load shows DataState's persistent role="alert" message with Retry,
 *   which reloads the rates.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data.
 *
 * AC-5 (WOID link opens the import trace) and the accessibility scan are
 * covered by the Playwright spec for this story.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  AVAILABLE_DATES,
  DATE_WITHOUT_DATA,
  createAvailability,
} from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import {
  CANONICAL_OBSERVATION_DATE,
  CANONICAL_RATE_WOID,
  createEmptyRates,
  createRateList,
  createRates,
} from '@/mocks/data/rate';
import { createTenors } from '@/mocks/data/tenor';
import type { RateReadList } from '@/types/api-generated';

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
  usePathname: () => '/curve-data',
  useSearchParams: () => new URLSearchParams(),
}));

const CODE = 'GlcNominalSpotCurve';
const RATES_ENDPOINT = `/v1/curves/${CODE}/rates`;
const DATE_MESSAGE = 'Enter the observation date as YYYY-MM-DD.';

type RatesHandler = (
  observationDate: string | undefined,
) => RateReadList | Promise<RateReadList>;

/**
 * Route GET calls to the shared factories. `rates` decides the response for
 * GET .../rates by observation date (default: canonical rates for any date).
 */
function mockService(rates: RatesHandler = () => createRateList()) {
  mockGet.mockImplementation(
    async (endpoint: string, params?: Record<string, unknown>) => {
      if (endpoint === '/v1/curves') {
        return {
          Curves: filterCurves(
            createCurves(),
            (params ?? {}) as Record<string, string>,
          ),
        };
      }
      if (endpoint === `/v1/curves/${CODE}/tenors`) {
        return { Tenors: createTenors() };
      }
      if (endpoint === `/v1/curves/${CODE}/availability`) {
        return createAvailability();
      }
      if (endpoint === RATES_ENDPOINT) {
        return rates(params?.ObservationDate as string | undefined);
      }
      throw new Error(`Unexpected GET ${endpoint}`);
    },
  );
}

/** The page inside the app's ToastProvider (mounted by the root layout). */
function renderCurveData() {
  return render(
    <ToastProvider>
      <CurveDataPage />
    </ToastProvider>,
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The table row for a tenor, found by its leading tenor label. */
function rowForTenor(label: string): HTMLElement {
  return screen.getByRole('row', {
    name: new RegExp(`^${escapeRegExp(label)}\\s`),
  });
}

/** Body rows only (rows without column headers). */
function bodyRows(): HTMLElement[] {
  return screen
    .queryAllByRole('row')
    .filter((row) => within(row).queryAllByRole('columnheader').length === 0);
}

function valuationDateInput(): HTMLInputElement {
  return screen.getByRole('textbox', {
    name: 'Valuation date',
  }) as HTMLInputElement;
}

/** Open the Valuation date calendar and return its dialog. */
async function openValuationCalendar(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await user.click(
    screen.getByRole('button', { name: 'Choose valuation date' }),
  );
  return screen.findByRole('dialog', { name: 'Valuation date calendar' });
}

/** A September 2026 day in the open calendar, by day of the month. */
function calendarDay(calendar: HTMLElement, day: number): HTMLElement {
  return within(calendar).getByRole('button', {
    name: new RegExp(`^\\w+, ${day} September 2026`),
  });
}

/** The day of the month in a calendar day's accessible name. */
function dayOfMonth(name: string): number {
  return Number(/(\d+) September 2026/.exec(name)?.[1]);
}

/** Observation dates GET .../rates was asked for, in call order. */
function requestedRateDates(): unknown[] {
  return mockGet.mock.calls
    .filter((call) => call[0] === RATES_ENDPOINT)
    .map((call) => (call[1] as { ObservationDate?: unknown }).ObservationDate);
}

describe('Epic curve-data, Story 1: Rates by maturity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('lists one row per service tenor with years, months, source column, rate (%) to 4 dp, source row and a WOID link', async () => {
    // Rates deliberately in reverse order: the join must be by tenor label.
    mockService(() => createRateList([...createRates()].reverse()));

    renderCurveData();

    const table = await screen.findByRole('table');
    for (const header of [
      /^Tenor/,
      /^Years/,
      /^Months/,
      /^Source column/,
      /^Rate \(%\)/,
      /^Source row/,
      /^Source import \(WOID\)/,
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }

    // One row per tenor the service returned.
    await screen.findByRole('row', { name: /^10Y\s/ });
    expect(bodyRows()).toHaveLength(createTenors().length);

    const tenYear = rowForTenor('10Y');
    expect(within(tenYear).getByText('10.0000')).toBeInTheDocument();
    expect(within(tenYear).getByText('120')).toBeInTheDocument();
    expect(within(tenYear).getByText('Years10')).toBeInTheDocument();
    expect(within(tenYear).getByText('3.5575')).toBeInTheDocument();
    expect(
      within(tenYear).queryByText('3.55752926323083'),
    ).not.toBeInTheDocument();
    expect(within(tenYear).getByText('26')).toBeInTheDocument();
    const woidLink = within(tenYear).getByRole('link', { name: /0d41a444/ });
    expect(woidLink).toHaveAttribute(
      'href',
      `/file-log/imports/${CANONICAL_RATE_WOID}`,
    );

    // A fractional tenor joins to its own rate, not the one in the same position.
    const halfYear = rowForTenor('0.5Y');
    expect(within(halfYear).getByText('0.5000')).toBeInTheDocument();
    expect(within(halfYear).getByText('6')).toBeInTheDocument();
    expect(within(halfYear).getByText('Years0_5')).toBeInTheDocument();
    expect(within(halfYear).getByText('3.9512')).toBeInTheDocument();
  });

  // AC-2
  it('offers the earliest, latest and available dates and starts the valuation date at the latest one', async () => {
    // Only the latest date has data: rates showing proves it was the default.
    mockService((date) =>
      date === CANONICAL_OBSERVATION_DATE
        ? createRateList()
        : createEmptyRates(),
    );

    renderCurveData();

    expect(
      await screen.findByRole('combobox', { name: 'Curve' }),
    ).toHaveTextContent('UK nominal spot curve');

    const input = await screen.findByDisplayValue(CANONICAL_OBSERVATION_DATE);
    expect(input).toBe(valuationDateInput());
    expect(input).toHaveAccessibleDescription(
      new RegExp(`${AVAILABLE_DATES[0]}.*${CANONICAL_OBSERVATION_DATE}`),
    );

    expect(await screen.findByRole('row', { name: /^10Y\s/ })).toBeVisible();
    expect(screen.queryByText('No data imported')).not.toBeInTheDocument();

    // The calendar opens on the latest date's month and marks every date with
    // data in it; days without data inside the range can still be picked.
    const calendar = await openValuationCalendar(userEvent.setup());
    const markedDays = within(calendar)
      .getAllByRole('button', { name: /data imported/ })
      .map((day) => day.getAttribute('aria-label') ?? '');
    expect(markedDays.map(dayOfMonth)).toEqual(
      AVAILABLE_DATES.filter((date) => date.startsWith('2026-09')).map((date) =>
        Number(date.slice(8)),
      ),
    );
    expect(calendarDay(calendar, 30)).toHaveAccessibleName(/selected/);
    expect(calendarDay(calendar, 27)).toBeEnabled();
    // Nothing after the latest date: the calendar cannot move past its month.
    expect(
      within(calendar).getByRole('button', { name: /next month/i }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  // Regression: a date with data other than the latest can be picked.
  it('picks an earlier date with data from the calendar and loads its rates', async () => {
    const user = userEvent.setup();
    const EARLIER_DATE = '2026-09-28';
    mockService((date) =>
      date === EARLIER_DATE ? createRateList() : createEmptyRates(),
    );

    renderCurveData();
    expect(await screen.findByText('No data imported')).toBeInTheDocument();

    const calendar = await openValuationCalendar(user);
    await user.click(calendarDay(calendar, 28));

    expect(
      screen.queryByRole('dialog', { name: 'Valuation date calendar' }),
    ).not.toBeInTheDocument();
    expect(valuationDateInput()).toHaveValue(EARLIER_DATE);
    expect(await screen.findByRole('row', { name: /^10Y\s/ })).toBeVisible();
    expect(screen.queryByText('No data imported')).not.toBeInTheDocument();
    expect(requestedRateDates()).toContain(EARLIER_DATE);
  });

  // AC-3
  it('rejects a valuation date not written as YYYY-MM-DD and requests no rates for it', async () => {
    const user = userEvent.setup();
    mockService();

    renderCurveData();
    await screen.findByDisplayValue(CANONICAL_OBSERVATION_DATE);

    const input = valuationDateInput();
    await user.clear(input);
    await user.type(input, '04/10/2026');
    await user.tab();

    expect(await screen.findByText(DATE_MESSAGE)).toBeInTheDocument();
    // The only date ever sent to the rates endpoint is the valid default.
    expect(
      requestedRateDates().filter((d) => d !== CANONICAL_OBSERVATION_DATE),
    ).toEqual([]);
  });

  // AC-4
  it('shows "No data imported" with an empty rate list, not an error, for a date without data', async () => {
    const user = userEvent.setup();
    mockService((date) =>
      date === DATE_WITHOUT_DATA ? createEmptyRates() : createRateList(),
    );

    renderCurveData();
    await screen.findByRole('row', { name: /^10Y\s/ });

    const input = valuationDateInput();
    await user.clear(input);
    await user.type(input, DATE_WITHOUT_DATA);
    await user.tab();

    expect(await screen.findByText('No data imported')).toBeInTheDocument();
    expect(
      screen.getByText('Choose another valuation date or import a file.'),
    ).toBeInTheDocument();
    expect(bodyRows()).toEqual([]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(DATE_MESSAGE)).not.toBeInTheDocument();
  });

  // AC-6
  it('shows a persistent error with Retry when the curve data cannot load, and Retry reloads it', async () => {
    const user = userEvent.setup();
    let ratesAvailable = false;
    mockService(() => {
      if (ratesAvailable) return createRateList();
      return Promise.reject(
        new ServiceError({
          status: 500,
          description: 'The data service could not complete the request.',
          retryable: true,
          kind: 'service-error',
        }),
      );
    });

    renderCurveData();

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(
        'The data service could not complete the request.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('row', { name: /^10Y\s/ }),
    ).not.toBeInTheDocument();

    ratesAvailable = true;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('row', { name: /^10Y\s/ })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
