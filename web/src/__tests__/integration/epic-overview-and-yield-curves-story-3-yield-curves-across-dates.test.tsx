/**
 * Story Metadata:
 * - Route: /yield-curves
 * - Target File: web/src/app/(app)/yield-curves/page.tsx
 * - Page Action: modify_existing
 *
 * Epic overview-and-yield-curves, Story 3: Yield curves across dates.
 *
 * Production contracts these tests define (implement to them):
 * - The page loads the catalogue (GET /v1/curves) through getCurves() and the
 *   "Curve" Shadcn Select (CurveSelect) offers ONLY the long-end curves
 *   (Segment "Long"), in service order, defaulting to "UK nominal spot curve".
 * - It loads the selected curve's availability (GET /v1/curves/{Code}/availability)
 *   through getCurveAvailability(). "Valuation date" (text input, YYYY-MM-DD)
 *   defaults to the latest date in Dates and "Compare with" (a second text
 *   input labelled exactly "Compare with") to the previous date in Dates.
 * - Series come from compareCurves() (GET /v1/curves/compare with Codes and a
 *   comma-separated ObservationDates). A series that is absent OR has empty
 *   Points is omitted.
 * - The chart card is a role="figure" whose accessible name is its title (the
 *   curve name). Its subtitle reads "{date} compared with {compare date}".
 * - The shared chart exposes an accessible text summary of its series: a
 *   role="list" named "Series" with one listitem per drawn series, valuation
 *   date first. Each item's text starts with the series name (its date); the
 *   comparison series item also says "dashed" (e.g. "2026-09-29, dashed line"),
 *   the valuation series item does not. (jsdom draws no SVG, so the legend and
 *   the dash pattern itself are checked in Playwright / manually.)
 * - Clearing "Compare with" is allowed (no validation error) and draws only the
 *   valuation date series.
 * - Missing combinations: the subtitle is replaced by "No data has been imported
 *   for {curve name} on {date}." (or "... on {date} or {date}.", valuation date
 *   first). When no series has data there is no series summary. When the curve
 *   has no dates at all the chart area reads "No data has been imported for
 *   {curve name}." and both date inputs stay editable.
 * - A failed compare call shows DataState's persistent role="alert" message
 *   with the service description and a Retry button that reloads the chart.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data.
 *
 * AC-5 (redraw on a new selection, axis label by rate type) is covered by the
 * Playwright spec for this story.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import YieldCurvesPage from '@/app/(app)/yield-curves/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import {
  AVAILABLE_DATES,
  DATE_WITHOUT_DATA,
  LATEST_AVAILABLE_DATE,
  PREVIOUS_AVAILABLE_DATE,
  createAvailability,
  createEmptyAvailability,
} from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import {
  createCompareSeries,
  createCurveCompare,
  createPreviousDateSeries,
} from '@/mocks/data/curve-compare';
import type {
  AvailabilityRead,
  CurveCompareRead,
  CurveCompareSeriesItem,
} from '@/types/api-generated';

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
  usePathname: () => '/yield-curves',
  useSearchParams: () => new URLSearchParams(),
}));

// jsdom lacks the pointer-capture / scrollIntoView APIs Radix Select calls and
// the ResizeObserver the chart container uses. Test-environment shims only.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  if (typeof proto.hasPointerCapture !== 'function') {
    proto.hasPointerCapture = () => false;
  }
  if (typeof proto.releasePointerCapture !== 'function') {
    proto.releasePointerCapture = () => undefined;
  }
  if (typeof proto.scrollIntoView !== 'function') {
    proto.scrollIntoView = () => undefined;
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

const CANONICAL_CURVE = 'UK nominal spot curve';
const OBSERVATION_DATE_MESSAGE = 'Enter the observation date as YYYY-MM-DD.';
const SERVICE_DESCRIPTION = 'The data service could not complete the request.';

type CompareHandler = (
  code: string,
  dates: string[],
) => CurveCompareRead | Promise<CurveCompareRead>;

/** The series the shared factories give a curve on a date with data. */
function seriesFor(code: string, date: string): CurveCompareSeriesItem {
  const curve = createCurves().find((c) => c.Code === code);
  const identity = { Code: curve?.Code, Name: curve?.Name };
  if (date === PREVIOUS_AVAILABLE_DATE) {
    return createPreviousDateSeries(identity);
  }
  return createCompareSeries({ ...identity, ObservationDate: date });
}

/** Default compare: one series per requested date that has data. */
function compareFromAvailableDates(
  code: string,
  dates: string[],
): CurveCompareRead {
  return createCurveCompare(
    dates
      .filter((date) => (AVAILABLE_DATES as readonly string[]).includes(date))
      .map((date) => seriesFor(code, date)),
  );
}

/** Route GET calls to the shared factories. */
function mockService({
  compare = compareFromAvailableDates,
  availability = () => createAvailability(),
}: {
  compare?: CompareHandler;
  availability?: (code: string) => AvailabilityRead;
} = {}) {
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
      const availabilityMatch = /^\/v1\/curves\/([^/]+)\/availability$/.exec(
        endpoint,
      );
      if (availabilityMatch) {
        return availability(availabilityMatch[1]);
      }
      if (endpoint === '/v1/curves/compare') {
        const codes = String(params?.Codes ?? '');
        const dates = String(params?.ObservationDates ?? '')
          .split(',')
          .map((date) => date.trim())
          .filter((date) => date !== '');
        return compare(codes, dates);
      }
      throw new Error(`Unexpected GET ${endpoint}`);
    },
  );
}

/** The page inside the app's ToastProvider (mounted by the root layout). */
function renderYieldCurves() {
  return render(
    <ToastProvider>
      <YieldCurvesPage />
    </ToastProvider>,
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dateInput(name: 'Valuation date' | 'Compare with'): HTMLInputElement {
  return screen.getByRole('textbox', { name }) as HTMLInputElement;
}

/** The chart's accessible series summary, once drawn. */
async function findSeriesItems(): Promise<HTMLElement[]> {
  const list = await screen.findByRole('list', { name: 'Series' });
  return within(list).getAllByRole('listitem');
}

/** The series name (its YYYY-MM-DD date) a summary item starts with. */
function seriesDate(item: HTMLElement): string | undefined {
  return /^\s*(\d{4}-\d{2}-\d{2})/.exec(item.textContent ?? '')?.[1];
}

/** Every element showing `text` is visible (it may be both subtitle and plot line). */
async function expectMessageShown(text: string) {
  const matches = await screen.findAllByText(text);
  for (const match of matches) {
    expect(match).toBeVisible();
  }
}

async function typeDate(
  user: ReturnType<typeof userEvent.setup>,
  name: 'Valuation date' | 'Compare with',
  value: string,
) {
  const input = dateInput(name);
  await user.clear(input);
  if (value !== '') await user.type(input, value);
  await user.tab();
}

describe('Epic overview-and-yield-curves, Story 3: Yield curves across dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('offers only the long-end curves, defaults to UK nominal spot curve and to the latest and previous dates with data', async () => {
    const user = userEvent.setup();
    mockService();

    renderYieldCurves();

    const curveSelect = await screen.findByRole('combobox', { name: 'Curve' });
    expect(curveSelect).toHaveTextContent(CANONICAL_CURVE);

    expect(await screen.findByDisplayValue(LATEST_AVAILABLE_DATE)).toBe(
      dateInput('Valuation date'),
    );
    expect(await screen.findByDisplayValue(PREVIOUS_AVAILABLE_DATE)).toBe(
      dateInput('Compare with'),
    );

    await user.click(curveSelect);
    const listbox = await screen.findByRole('listbox');
    const offered = within(listbox)
      .getAllByRole('option')
      .map((option) => option.textContent?.trim() ?? '');
    expect(offered).toEqual(
      createCurves()
        .filter((curve) => curve.Segment === 'Long')
        .map((curve) => curve.Name),
    );
    expect(
      within(listbox).queryByRole('option', {
        name: 'UK nominal spot curve, short end',
      }),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('titles the chart with the curve name, subtitles it with both dates and draws one series per date with the comparison dashed', async () => {
    mockService();

    renderYieldCurves();

    const chart = await screen.findByRole('figure', { name: CANONICAL_CURVE });
    expect(
      await within(chart).findByText(
        `${LATEST_AVAILABLE_DATE} compared with ${PREVIOUS_AVAILABLE_DATE}`,
      ),
    ).toBeVisible();

    const [valuation, comparison, ...rest] = await findSeriesItems();
    expect(rest).toEqual([]);
    expect(valuation).toHaveTextContent(
      new RegExp(`^${escapeRegExp(LATEST_AVAILABLE_DATE)}`),
    );
    expect(valuation).not.toHaveTextContent(/dashed/i);
    expect(comparison).toHaveTextContent(
      new RegExp(`^${escapeRegExp(PREVIOUS_AVAILABLE_DATE)}.*dashed`, 'i'),
    );
  });

  // AC-3
  it('draws only the valuation date curve when Compare with is cleared', async () => {
    const user = userEvent.setup();
    mockService();

    renderYieldCurves();
    await screen.findByDisplayValue(PREVIOUS_AVAILABLE_DATE);
    await findSeriesItems();

    await typeDate(user, 'Compare with', '');

    const chart = await screen.findByRole('figure', { name: CANONICAL_CURVE });
    const list = await within(chart).findByRole('list', { name: 'Series' });
    await waitFor(() => {
      expect(within(list).getAllByRole('listitem').map(seriesDate)).toEqual([
        LATEST_AVAILABLE_DATE,
      ]);
    });
    expect(within(chart).queryByText(/compared with/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(OBSERVATION_DATE_MESSAGE),
    ).not.toBeInTheDocument();
  });

  // AC-4
  it('leaves out dates without imported data and names them, and names a curve with no dates at all', async () => {
    const user = userEvent.setup();
    const REAL_SPOT = 'UK implied real spot curve';
    mockService({
      // The previous date comes back with empty Points: treated as no data.
      compare: (code, dates) =>
        createCurveCompare(
          compareFromAvailableDates(code, dates).Series?.map((series) =>
            series.ObservationDate === PREVIOUS_AVAILABLE_DATE
              ? createPreviousDateSeries({ Points: [] })
              : series,
          ) ?? [],
        ),
      availability: (code) =>
        code === 'GlcRealSpotCurve'
          ? createEmptyAvailability()
          : createAvailability(),
    });

    renderYieldCurves();

    // One date missing: its series is left out and the subtitle names it.
    await expectMessageShown(
      `No data has been imported for ${CANONICAL_CURVE} on ${PREVIOUS_AVAILABLE_DATE}.`,
    );
    const items = await findSeriesItems();
    expect(items.map(seriesDate)).toEqual([LATEST_AVAILABLE_DATE]);
    expect(screen.queryByText(/compared with/)).not.toBeInTheDocument();

    // Both dates missing: only the message, no series.
    await typeDate(user, 'Valuation date', DATE_WITHOUT_DATA);
    await expectMessageShown(
      `No data has been imported for ${CANONICAL_CURVE} on ${DATE_WITHOUT_DATA} or ${PREVIOUS_AVAILABLE_DATE}.`,
    );
    expect(
      screen.queryByRole('list', { name: 'Series' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // A curve with no dates at all.
    await user.click(screen.getByRole('combobox', { name: 'Curve' }));
    await user.click(await screen.findByRole('option', { name: REAL_SPOT }));
    await expectMessageShown(`No data has been imported for ${REAL_SPOT}.`);
    expect(
      screen.queryByRole('list', { name: 'Series' }),
    ).not.toBeInTheDocument();
    expect(dateInput('Valuation date')).toBeEnabled();
    expect(dateInput('Compare with')).toBeEnabled();
  });

  // AC-6
  it('shows a persistent error with Retry when the chart data cannot load, and Retry reloads it', async () => {
    const user = userEvent.setup();
    let compareAvailable = false;
    mockService({
      compare: (code, dates) => {
        if (compareAvailable) return compareFromAvailableDates(code, dates);
        return Promise.reject(
          new ServiceError({
            status: 500,
            description: SERVICE_DESCRIPTION,
            retryable: true,
            kind: 'service-error',
          }),
        );
      },
    });

    renderYieldCurves();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(SERVICE_DESCRIPTION)).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Series' }),
    ).not.toBeInTheDocument();

    compareAvailable = true;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    const items = await findSeriesItems();
    expect(items.map(seriesDate)).toEqual([
      LATEST_AVAILABLE_DATE,
      PREVIOUS_AVAILABLE_DATE,
    ]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
