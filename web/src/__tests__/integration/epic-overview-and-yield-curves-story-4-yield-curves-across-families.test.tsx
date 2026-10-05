/**
 * Story Metadata:
 * - Route: /yield-curves
 * - Target File: web/src/app/(app)/yield-curves/page.tsx
 * - Page Action: modify_existing
 *
 * Epic overview-and-yield-curves, Story 4: Yield curves across families.
 *
 * Production contracts these tests define (implement to them):
 * - The Across dates / Across families toggle is a pair of buttons named
 *   "Across dates" and "Across families" (segmented, aria-pressed). Across
 *   dates is active on load (Story 3).
 * - In Across families the "Compare with" field (label + input + calendar
 *   button) is not rendered; the "Curve" select stays.
 * - The family curves are resolved from the GET /v1/curves catalogue as the
 *   Nominal, Real, Inflation and OIS curves sharing the selected curve's
 *   RateType and Segment, and fetched for the single valuation date through
 *   compareCurves() (GET /v1/curves/compare, Codes + ObservationDates comma
 *   separated). The mock below answers ONLY the codes/dates requested, so the
 *   right series appear only if the right codes are asked for.
 * - The chart card is a `role="figure"` whose accessible name is the chart
 *   title ("Spot curves by family" / "Forward curves by family"). Inside it:
 *   the subtitle, the y-axis label ("Spot rate (%)" / "Forward rate (%)"), and
 *   the series names (legend and/or the accessible text summary of the
 *   series, NFR3) must be present in the DOM under jsdom. Series are named by
 *   family ("Nominal", "Real", "Inflation", "OIS"), in that order, not by
 *   curve name.
 * - A family with no series for the date is omitted and the subtitle is
 *   replaced by "No data has been imported for {family curve name} on {date}."
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data.
 *
 * AC-4 (mode switch keeps curve and date) and AC-5 (accessibility scan in both
 * modes) are covered by the Playwright spec for this story.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import YieldCurvesPage from '@/app/(app)/yield-curves/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  LATEST_AVAILABLE_DATE,
  createAvailability,
} from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import {
  createFamilyCompare,
  createPreviousDateSeries,
} from '@/mocks/data/curve-compare';
import type { CurveCompareSeriesItem } from '@/types/api-generated';

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

const FAMILY_SERIES_NAMES = ['Nominal', 'Real', 'Inflation', 'OIS'] as const;

/** Every series the mocked service holds: both family sets plus the dated pair. */
function allSeries(): CurveCompareSeriesItem[] {
  return [
    ...(createFamilyCompare('Spot').Series ?? []),
    ...(createFamilyCompare('Forward').Series ?? []),
    createPreviousDateSeries(),
  ];
}

function splitParam(value: unknown): string[] {
  return typeof value === 'string' && value.length > 0 ? value.split(',') : [];
}

/**
 * Route GET calls to the shared factories. The compare endpoint returns only
 * the held series matching the requested Codes and ObservationDates; series in
 * `missing` (by code) are treated as never imported and left out (BR2).
 */
function mockService(missingCodes: readonly string[] = []) {
  const held = allSeries().filter((s) => !missingCodes.includes(s.Code ?? ''));
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
      if (/^\/v1\/curves\/[^/]+\/availability$/.test(endpoint)) {
        return createAvailability();
      }
      if (endpoint === '/v1/curves/compare') {
        const codes = splitParam(params?.Codes);
        const dates = splitParam(params?.ObservationDates);
        return {
          Series: held.filter(
            (s) =>
              codes.includes(s.Code ?? '') &&
              dates.includes(s.ObservationDate ?? ''),
          ),
        };
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

/** Wait for Across dates to load, then switch to Across families. */
async function openAcrossFamilies(user: ReturnType<typeof userEvent.setup>) {
  expect(
    await screen.findByRole('combobox', { name: 'Curve' }),
  ).toHaveTextContent('UK nominal spot curve');
  await screen.findByDisplayValue(LATEST_AVAILABLE_DATE);
  await user.click(screen.getByRole('button', { name: 'Across families' }));
}

/** First element inside `container` whose own text starts with `name`. */
function firstTextStartingWith(container: HTMLElement, name: string) {
  return within(container).getAllByText(new RegExp(`^${name}\\b`))[0];
}

/** True when the elements appear in the given document order. */
function inDocumentOrder(elements: HTMLElement[]): boolean {
  return elements.every(
    (el, i) =>
      i === 0 ||
      Boolean(
        elements[i - 1].compareDocumentPosition(el) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
  );
}

describe('Epic overview-and-yield-curves, Story 4: Yield curves across families', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('hides Compare with and draws the Nominal, Real, Inflation and OIS curves of the same rate type and segment, named by family in order', async () => {
    const user = userEvent.setup();
    mockService();

    renderYieldCurves();
    expect(await screen.findByLabelText('Compare with')).toBeInTheDocument();

    await openAcrossFamilies(user);

    const chart = await screen.findByRole('figure', {
      name: 'Spot curves by family',
    });
    expect(screen.queryByLabelText('Compare with')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Curve' })).toHaveTextContent(
      'UK nominal spot curve',
    );

    // Each family appears, in Nominal, Real, Inflation, OIS order.
    const seriesLabels = FAMILY_SERIES_NAMES.map((name) =>
      firstTextStartingWith(chart, name),
    );
    expect(inDocumentOrder(seriesLabels)).toBe(true);

    // Series are named by family, not by curve name; forward curves are not drawn.
    expect(
      within(chart).queryByText(/UK implied real spot curve/),
    ).not.toBeInTheDocument();
    expect(
      within(chart).queryByText(/UK OIS spot curve/),
    ).not.toBeInTheDocument();
    expect(within(chart).queryByText(/forward/i)).not.toBeInTheDocument();
  });

  // AC-2
  it('titles the chart by rate type with a "{date}, long end" subtitle and matching y axis, for spot and forward curves', async () => {
    const user = userEvent.setup();
    mockService();

    renderYieldCurves();
    await openAcrossFamilies(user);

    const spotChart = await screen.findByRole('figure', {
      name: 'Spot curves by family',
    });
    expect(
      within(spotChart).getByText(`${LATEST_AVAILABLE_DATE}, long end`),
    ).toBeInTheDocument();
    expect(within(spotChart).getByText('Spot rate (%)')).toBeInTheDocument();
    expect(
      within(spotChart).queryByText('Forward rate (%)'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Curve' }));
    await user.click(
      await screen.findByRole('option', {
        name: 'UK instantaneous nominal forward curve',
      }),
    );

    const forwardChart = await screen.findByRole('figure', {
      name: 'Forward curves by family',
    });
    expect(
      screen.queryByRole('figure', { name: 'Spot curves by family' }),
    ).not.toBeInTheDocument();
    expect(
      within(forwardChart).getByText(`${LATEST_AVAILABLE_DATE}, long end`),
    ).toBeInTheDocument();
    expect(
      within(forwardChart).getByText('Forward rate (%)'),
    ).toBeInTheDocument();
    expect(
      within(forwardChart).queryByText('Spot rate (%)'),
    ).not.toBeInTheDocument();
    // The forward family series were fetched and drawn for the new curve.
    expect(firstTextStartingWith(forwardChart, 'OIS')).toBeInTheDocument();
  });

  // AC-3
  it('leaves out a family curve with no data on the date and names it in the subtitle', async () => {
    const user = userEvent.setup();
    const ois = createCurves().find(
      (c) =>
        c.Family === 'OIS' && c.RateType === 'Spot' && c.Segment === 'Long',
    );
    const oisCode = ois?.Code ?? '';
    const oisName = ois?.Name ?? '';
    mockService([oisCode]);

    renderYieldCurves();
    await openAcrossFamilies(user);

    const chart = await screen.findByRole('figure', {
      name: 'Spot curves by family',
    });
    expect(
      await within(chart).findByText(
        `No data has been imported for ${oisName} on ${LATEST_AVAILABLE_DATE}.`,
      ),
    ).toBeInTheDocument();
    expect(
      within(chart).queryByText(`${LATEST_AVAILABLE_DATE}, long end`),
    ).not.toBeInTheDocument();

    // The families with data are still drawn, in order; OIS is not.
    const drawn = ['Nominal', 'Real', 'Inflation'].map((name) =>
      firstTextStartingWith(chart, name),
    );
    expect(inDocumentOrder(drawn)).toBe(true);
    expect(within(chart).queryByText(/^OIS\b/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
