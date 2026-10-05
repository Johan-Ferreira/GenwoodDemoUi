/**
 * Story Metadata:
 * - Route: /overview
 * - Target File: web/src/app/(app)/overview/page.tsx
 * - Page Action: modify_existing
 *
 * Epic overview-and-yield-curves, Story 2: Overview spot curves chart and
 * recent loads.
 *
 * Production contracts these tests define (implement to them):
 * - The Overview page loads everything from the one GET /v1/overview call
 *   (`getOverview()` -> `get` in @/lib/api/client) inside DataState.
 * - The spot curves chart card and the Recent loads card are each a labelled
 *   region named by their visible title (e.g. `<section aria-labelledby=...>`):
 *   "Spot curves on latest valuation date" and "Recent loads".
 * - The chart card shows the subtitle "Nominal, real, implied inflation and
 *   OIS, long end", a legend naming "Nominal spot", "Real spot",
 *   "Inflation spot" and "OIS spot" (only the families the service returned,
 *   in that order — OIS is the fourth chart colour), the axis labels
 *   "Maturity (years)" and "Spot rate (%)", and X ticks 0 to 40 in fives.
 *   Built on the Shadcn chart primitive (Recharts) — tests read visible text
 *   only, never SVG internals.
 * - No spot curves -> the card keeps its title and shows only
 *   "No spot curves have been imported yet." (no axes, no legend).
 * - Some families missing -> the others are drawn and the subtitle adds
 *   "No data for {family}." for each missing one (e.g. "No data for OIS.").
 * - Recent loads reuses FileTable + StatusChip: the five newest RecentFiles by
 *   ReceivedAt, newest first (the app sorts; the service order is not
 *   trusted), with the File log columns and `data-tone` status badges.
 *   No files -> "No files have been received yet." and no table.
 *
 * Test environment shim: jsdom has no layout, so Recharts' ResponsiveContainer
 * would measure 0x0 and draw nothing. ResizeObserver and element sizes are
 * stubbed below (test environment only — no production code is touched) so the
 * chart renders its legend, axis labels and ticks as real text.
 *
 * Only the API boundary (`get`) is mocked; next/navigation is stubbed because
 * the App Router is not mounted under jsdom. Payloads come from the
 * project-wide factories in @/mocks/data.
 *
 * Hover tooltip (AC-3), row click navigation (AC-5) and the accessibility scan
 * plus chart text summary (AC-6) are covered by the Playwright spec.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import OverviewPage from '@/app/(app)/overview/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { createFiles } from '@/mocks/data/file';
import { createOverview, createSpotCurves } from '@/mocks/data/overview';

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

// ---------------------------------------------------------------------------
// Layout shim for the chart (jsdom has no layout engine)
// ---------------------------------------------------------------------------

const CHART_WIDTH = 800;
const CHART_HEIGHT = 280;
const SIZE_PROPS = [
  ['clientWidth', CHART_WIDTH],
  ['clientHeight', CHART_HEIGHT],
  ['offsetWidth', CHART_WIDTH],
  ['offsetHeight', CHART_HEIGHT],
] as const;

class SizedResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const contentRect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: CHART_WIDTH,
      bottom: CHART_HEIGHT,
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      toJSON: () => ({}),
    };
    const entry = { target, contentRect } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }

  unobserve() {}

  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', SizedResizeObserver);
  for (const [prop, value] of SIZE_PROPS) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => value,
    });
  }
});

afterAll(() => {
  vi.unstubAllGlobals();
  for (const [prop] of SIZE_PROPS) {
    Reflect.deleteProperty(HTMLElement.prototype, prop);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHART_TITLE = 'Spot curves on latest valuation date';
const CHART_SUBTITLE = 'Nominal, real, implied inflation and OIS, long end';

/** The page inside the app's ToastProvider (mounted by the root layout). */
function renderOverview() {
  return render(
    <ToastProvider>
      <OverviewPage />
    </ToastProvider>,
  );
}

/** The spot curves chart card, once the overview has loaded. */
function findChartCard(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: CHART_TITLE });
}

/** The Recent loads card, once the overview has loaded. */
function findRecentLoadsCard(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Recent loads' });
}

/** Body rows only (rows that contain data cells, not header cells). */
function bodyRows(scope: HTMLElement): HTMLElement[] {
  return within(scope)
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0);
}

/**
 * The first element in `scope` whose full text is `text`. Series names and axis
 * labels may also appear in the chart's text summary, so more than one match is
 * allowed; the first one must be visible.
 */
function firstText(scope: HTMLElement, text: string): HTMLElement {
  return within(scope).getAllByText(text)[0];
}

describe('Epic overview-and-yield-curves, Story 2: spot curves chart and recent loads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('draws the four spot series with a legend, both axis labels and maturity ticks 0 to 40 in fives', async () => {
    mockGet.mockResolvedValue(createOverview());

    renderOverview();

    const chart = await findChartCard();
    expect(within(chart).getByText(CHART_SUBTITLE)).toBeVisible();

    for (const series of [
      'Nominal spot',
      'Real spot',
      'Inflation spot',
      'OIS spot',
    ]) {
      expect(firstText(chart, series)).toBeVisible();
    }

    expect(firstText(chart, 'Maturity (years)')).toBeVisible();
    expect(firstText(chart, 'Spot rate (%)')).toBeVisible();

    for (const tick of ['0', '5', '10', '15', '20', '25', '30', '35', '40']) {
      expect(firstText(chart, tick)).toBeVisible();
    }

    expect(
      within(chart).queryByText('No spot curves have been imported yet.'),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('replaces the plot with one empty message when there are no spot curves, and names missing families when only some exist', async () => {
    mockGet.mockResolvedValue(createOverview({ SpotCurves: [] }));

    const { unmount } = renderOverview();

    const emptyChart = await findChartCard();
    expect(
      within(emptyChart).getByText('No spot curves have been imported yet.'),
    ).toBeVisible();
    expect(
      within(emptyChart).queryByText('Maturity (years)'),
    ).not.toBeInTheDocument();
    expect(
      within(emptyChart).queryByText('Spot rate (%)'),
    ).not.toBeInTheDocument();
    expect(
      within(emptyChart).queryByText('Nominal spot'),
    ).not.toBeInTheDocument();

    unmount();

    // OIS is missing: Nominal, Real and Inflation are drawn, the subtitle names OIS.
    mockGet.mockResolvedValue(
      createOverview({
        SpotCurves: createSpotCurves(['Nominal', 'Real', 'Inflation']),
      }),
    );

    renderOverview();

    const partialChart = await findChartCard();
    expect(within(partialChart).getByText(/No data for OIS\./)).toBeVisible();
    for (const series of ['Nominal spot', 'Real spot', 'Inflation spot']) {
      expect(firstText(partialChart, series)).toBeVisible();
    }
    expect(
      within(partialChart).queryByText('OIS spot'),
    ).not.toBeInTheDocument();
    expect(
      within(partialChart).queryByText(
        /No data for (Nominal|Real|Inflation)\./,
      ),
    ).not.toBeInTheDocument();
    expect(
      within(partialChart).queryByText(
        'No spot curves have been imported yet.',
      ),
    ).not.toBeInTheDocument();
  });

  // AC-4
  it('lists the five newest files newest first with the File log columns and labelled status badges, or says none have been received', async () => {
    // Six files, oldest first: the card must keep only the five newest, newest first.
    mockGet.mockResolvedValue(
      createOverview({ RecentFiles: [...createFiles()].reverse() }),
    );

    const { unmount } = renderOverview();

    const recent = await findRecentLoadsCard();
    const table = within(recent).getByRole('table');
    for (const header of [
      /^ID/,
      /^File/,
      /^Curve family/,
      /^Received/,
      /^Size/,
      /^Records inserted/,
      /^WOID/,
      /^Status/,
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }

    // Newest first by ReceivedAt; file 95 (2026-09-28) is the sixth and dropped.
    const leadingIds = bodyRows(table).map((row) =>
      within(row).getAllByRole('cell')[0].textContent?.trim(),
    );
    expect(leadingIds).toEqual(['103', '102', '101', '98', '97']);

    const statusByFile: Array<[number, string, string]> = [
      [103, 'Processing', 'info'],
      [102, 'Failed', 'danger'],
      [101, 'Imported', 'success'],
    ];
    for (const [id, label, tone] of statusByFile) {
      const row = within(table).getByRole('row', {
        name: new RegExp(`^${id}\\b`),
      });
      expect(within(row).getByText(label)).toHaveAttribute('data-tone', tone);
    }

    unmount();

    mockGet.mockResolvedValue(createOverview({ RecentFiles: [] }));

    renderOverview();

    const emptyRecent = await findRecentLoadsCard();
    expect(
      within(emptyRecent).getByText('No files have been received yet.'),
    ).toBeVisible();
    expect(within(emptyRecent).queryByRole('table')).not.toBeInTheDocument();
  });
});
