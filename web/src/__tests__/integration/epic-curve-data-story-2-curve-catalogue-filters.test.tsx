/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Epic curve-data, Story 2: Filter the curve catalogue.
 *
 * Production contracts these tests define (implement to them):
 * - Beside the "Curve" select (Story 1) sit three Shadcn Select comboboxes
 *   labelled "Family", "Rate type" and "Segment". Each defaults to "All" and
 *   offers "All" plus the service values (Nominal/Real/Inflation/OIS,
 *   Spot/Forward, Long/ShortEnd).
 * - The filters narrow the curve catalogue (GET /v1/curves) — in memory or via
 *   its Family/RateType/Segment query parameters; the mock below answers both
 *   the same way. "All" means the parameter is omitted.
 * - If the selected curve drops out of the filtered list, the first matching
 *   curve (catalogue order) becomes selected and its rates load.
 * - When no curve matches, a message containing "No curves match" is shown.
 * - A single "Clear filters" button is shown while any filter is not "All"
 *   (including in the no-match state); it resets all three filters to "All"
 *   and the Curve list shows all 16 curves again.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Response bodies
 * come from the project-wide factories in @/mocks/data.
 *
 * AC-1 (filters combine to list only matching curves) is covered by the
 * Playwright spec for this story.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { createAvailability } from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import { createRate, createRateList, createRates } from '@/mocks/data/rate';
import { createTenors } from '@/mocks/data/tenor';
import type { CurveRead } from '@/types/api-generated';

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

// jsdom lacks the pointer-capture and scrollIntoView APIs Radix Select calls
// when it opens. Test-environment shims only — no production code touched.
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
});

/** The real-curve long-end rates: the nominal rates shifted down 3 points. */
const REAL_SPOT_RATES = createRates().map((rate) =>
  createRate({ ...rate, RatePercent: (rate.RatePercent ?? 0) - 3 }),
);

/**
 * Route the mocked API boundary like the data service: the catalogue honours
 * Family/RateType/Segment, the canonical tenors and availability serve every
 * curve, and rates differ between the nominal and real spot curves.
 */
function serveCatalogue(catalogue: CurveRead[] = createCurves()) {
  mockGet.mockImplementation(
    async (path: string, params?: Record<string, unknown>) => {
      if (path === '/v1/curves') {
        return {
          Curves: filterCurves(catalogue, {
            Family: params?.Family as string | undefined,
            RateType: params?.RateType as string | undefined,
            Segment: params?.Segment as string | undefined,
          }),
        };
      }
      if (path.endsWith('/tenors')) return { Tenors: createTenors() };
      if (path.endsWith('/availability')) return createAvailability();
      if (path === '/v1/curves/GlcRealSpotCurve/rates') {
        return createRateList(REAL_SPOT_RATES);
      }
      if (path.endsWith('/rates')) return createRateList();
      throw new Error(`Unexpected request in test: ${path}`);
    },
  );
}

function renderCurveData() {
  return render(
    <ToastProvider>
      <CurveDataPage />
    </ToastProvider>,
  );
}

/** Wait for the first curve and its by-maturity table to load. */
async function waitForInitialLoad() {
  const curve = await screen.findByRole('combobox', { name: 'Curve' });
  await within(await screen.findByRole('table')).findByRole('row', {
    name: /^10Y\b/,
  });
  return curve;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: string,
  optionName: string,
) {
  await user.click(screen.getByRole('combobox', { name: comboboxName }));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

/** Open the Curve select, read its option names, then close it again. */
async function listedCurveNames(
  user: ReturnType<typeof userEvent.setup>,
): Promise<string[]> {
  await user.click(screen.getByRole('combobox', { name: 'Curve' }));
  const listbox = await screen.findByRole('listbox');
  const names = within(listbox)
    .getAllByRole('option')
    .map((option) => option.textContent?.trim() ?? '');
  await user.keyboard('{Escape}');
  return names;
}

describe('Epic curve-data, Story 2: Curve catalogue filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-2
  it('selects the first matching curve and shows its rates when the selected curve no longer matches', async () => {
    const user = userEvent.setup();
    serveCatalogue();
    renderCurveData();

    const curve = await waitForInitialLoad();
    expect(curve).toHaveTextContent('UK nominal spot curve');
    expect(
      within(screen.getByRole('row', { name: /^10Y\b/ })).getByText('3.5575'),
    ).toBeInTheDocument();

    await chooseOption(user, 'Family', 'Real');

    // The new curve's table loads afresh, so wait for it rather than reading it at once.
    const realRow = await within(await screen.findByRole('table')).findByRole(
      'row',
      {
        name: /^10Y\b.*0\.5575/,
      },
    );
    expect(within(realRow).getByText('0.5575')).toBeInTheDocument();
    expect(within(realRow).queryByText('3.5575')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Curve' })).toHaveTextContent(
      'UK implied real spot curve',
    );
  });

  // AC-3
  it('says no curve matches and offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    // A catalogue with no OIS forward curves, so OIS + Forward matches nothing.
    serveCatalogue(
      createCurves().filter(
        (c) => !(c.Family === 'OIS' && c.RateType === 'Forward'),
      ),
    );
    renderCurveData();
    await waitForInitialLoad();

    await chooseOption(user, 'Family', 'OIS');
    await chooseOption(user, 'Rate type', 'Forward');

    expect(await screen.findByText(/no curves match/i)).toBeInTheDocument();
    const clear = screen.getByRole('button', { name: 'Clear filters' });

    await user.click(clear);

    expect(screen.queryByText(/no curves match/i)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Family' })).toHaveTextContent(
      'All',
    );
    expect(
      screen.getByRole('combobox', { name: 'Rate type' }),
    ).toHaveTextContent('All');
  });

  // AC-4
  it('lists all 16 curves again after the filters are cleared', async () => {
    const user = userEvent.setup();
    serveCatalogue();
    renderCurveData();
    await waitForInitialLoad();

    await chooseOption(user, 'Family', 'Inflation');
    await chooseOption(user, 'Segment', 'Long');
    expect(await listedCurveNames(user)).toEqual([
      'UK implied inflation spot curve',
      'UK instantaneous implied inflation forward curve',
    ]);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    for (const filter of ['Family', 'Rate type', 'Segment']) {
      expect(screen.getByRole('combobox', { name: filter })).toHaveTextContent(
        'All',
      );
    }
    expect(await listedCurveNames(user)).toEqual(
      createCurves().map((c) => c.Name),
    );
  });
});
