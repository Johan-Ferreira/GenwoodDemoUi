/**
 * Story Metadata:
 * - Route: /api-reference
 * - Target File: web/src/app/(app)/api-reference/page.tsx
 * - Page Action: modify_existing
 *
 * Epic workflow-monitor-and-api, Story 4: API reference
 * (vitest-tagged ACs: 1, 2, 3, 4, 5; AC-6 is covered by the Playwright spec).
 *
 * Production contracts these tests define (implement to them):
 * - The page loads the catalogue (GET /v1/curves) into the shared "Curve" select
 *   (CurveSelect) defaulting to "UK nominal spot curve" (GlcNominalSpotCurve), and
 *   the curve's availability (GET /v1/curves/{Code}/availability) into the shared
 *   "Valuation date" field (ValuationDateField: typeable YYYY-MM-DD text input
 *   starting at MaxDate, plus a "Choose valuation date" calendar button).
 * - An "Endpoints" table (accessible name "Endpoints", e.g. via aria-labelledby on
 *   its heading) with columns Method and Path lists exactly four rows, in order:
 *   curves, tenors, rates, import trace — each GET with its live `/v1/...` path
 *   (`/v1/curves`, `/v1/curves/{Code}/tenors`, `/v1/curves/{Code}/rates`
 *   (optionally `?ObservationDate=...`), `/v1/imports/{Woid}`).
 * - An "Example request and response" section (a region with that accessible
 *   name, e.g. `<section aria-labelledby>`) shows the request line
 *   `GET <service base>/v1/curves/{Code}/rates?ObservationDate={date}` where the
 *   service base is the real absolute service address (http(s)://...), and the
 *   response as JSON in RateReadList shape (`{ "Rates": [ { "TenorLabel", ... } ] }`)
 *   taken from a live GET /v1/curves/{Code}/rates call for the chosen curve and date.
 * - The prototype's example address (genwood-demo.example, /yield-curves/v1) and
 *   its illustrative wrapper (curve / source / count / note) never appear.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation is
 * stubbed because the App Router is not mounted under jsdom. Payloads come from
 * the project-wide factories in @/mocks/data.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ApiReferencePage from '@/app/(app)/api-reference/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  DATE_WITHOUT_DATA,
  createAvailability,
} from '@/mocks/data/availability';
import { createCurves } from '@/mocks/data/curve';
import {
  CANONICAL_OBSERVATION_DATE,
  CANONICAL_RATE_WOID,
  createEmptyRates,
  createRateList,
  createShortEndRates,
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
  usePathname: () => '/api-reference',
  useSearchParams: () => new URLSearchParams(),
}));

const DEFAULT_CODE = 'GlcNominalSpotCurve';
const OIS_CODE = 'OisSpotCurve';
const OIS_NAME = 'UK OIS spot curve';
const EXAMPLE_REGION = 'Example request and response';

type RatesHandler = (
  code: string,
  observationDate: string | undefined,
) => RateReadList;

/** Default rates: canonical rates for the default curve, short-end set for OIS. */
const defaultRates: RatesHandler = (code) =>
  code === OIS_CODE ? createRateList(createShortEndRates()) : createRateList();

/** Route GET calls to the shared factories, the way the live service answers. */
function mockService(rates: RatesHandler = defaultRates) {
  mockGet.mockImplementation(
    async (endpoint: string, params?: Record<string, unknown>) => {
      if (endpoint === '/v1/curves') {
        return { Curves: createCurves() };
      }
      const match = /^\/v1\/curves\/([^/]+)\/(tenors|availability|rates)$/.exec(
        endpoint,
      );
      if (match) {
        const [, code, resource] = match;
        if (resource === 'tenors') return { Tenors: createTenors() };
        if (resource === 'availability') return createAvailability();
        return rates(code, params?.ObservationDate as string | undefined);
      }
      throw new Error(`Unexpected GET ${endpoint}`);
    },
  );
}

function renderApiReference() {
  return render(
    <ToastProvider>
      <ApiReferencePage />
    </ToastProvider>,
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The request line regex for a curve and date under an absolute service address. */
function requestLine(code: string, date: string): RegExp {
  return new RegExp(
    `GET\\s+https?://\\S+/v1/curves/${escapeRegExp(code)}/rates\\?ObservationDate=${escapeRegExp(date)}`,
  );
}

async function exampleRegion(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: EXAMPLE_REGION });
}

function valuationDateInput(): HTMLInputElement {
  return screen.getByRole('textbox', {
    name: 'Valuation date',
  }) as HTMLInputElement;
}

async function typeValuationDate(
  user: ReturnType<typeof userEvent.setup>,
  date: string,
): Promise<void> {
  const input = valuationDateInput();
  await user.clear(input);
  await user.type(input, date);
  await user.tab();
}

async function chooseCurve(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
): Promise<void> {
  await user.click(await screen.findByRole('combobox', { name: 'Curve' }));
  const listbox = await screen.findByRole('listbox');
  await user.click(within(listbox).getByRole('option', { name }));
}

describe('Epic workflow-monitor-and-api, Story 4: API reference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('lists the four design endpoints (curves, tenors, rates, import trace) as GET with live /v1 paths', async () => {
    mockService();

    renderApiReference();

    const table = await screen.findByRole('table', { name: 'Endpoints' });
    expect(
      within(table).getByRole('columnheader', { name: 'Method' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Path' }),
    ).toBeInTheDocument();

    const rows = within(table)
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('columnheader').length === 0);
    const cells = rows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => (cell.textContent ?? '').trim()),
    );

    expect(cells.map(([method]) => method)).toEqual([
      'GET',
      'GET',
      'GET',
      'GET',
    ]);
    expect(cells.map(([, path]) => path)).toEqual([
      '/v1/curves',
      expect.stringMatching(/^\/v1\/curves\/\{code\}\/tenors$/i),
      expect.stringMatching(
        /^\/v1\/curves\/\{code\}\/rates(\?ObservationDate=\S+)?$/i,
      ),
      expect.stringMatching(/^\/v1\/imports\/\{woid\}$/i),
    ]);
  });

  // AC-2
  it('offers all 16 curves and lets the valuation date be picked from the calendar or typed', async () => {
    const user = userEvent.setup();
    mockService();

    renderApiReference();

    const curveSelect = await screen.findByRole('combobox', { name: 'Curve' });
    expect(curveSelect).toHaveTextContent(/UK nominal spot curve$/);
    await user.click(curveSelect);
    const listbox = await screen.findByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => (option.textContent ?? '').trim()),
    ).toEqual(createCurves().map((curve) => curve.Name));
    await user.keyboard('{Escape}');

    expect(await screen.findByDisplayValue(CANONICAL_OBSERVATION_DATE)).toBe(
      valuationDateInput(),
    );

    // Picked from the calendar.
    await user.click(
      screen.getByRole('button', { name: 'Choose valuation date' }),
    );
    const calendar = await screen.findByRole('dialog', {
      name: 'Valuation date calendar',
    });
    await user.click(
      within(calendar).getByRole('button', {
        name: /^\w+, 28 September 2026/,
      }),
    );
    expect(valuationDateInput()).toHaveValue('2026-09-28');

    // Typed.
    await typeValuationDate(user, '2026-09-25');
    expect(valuationDateInput()).toHaveValue('2026-09-25');
    expect(
      screen.queryByText('Enter the observation date as YYYY-MM-DD.'),
    ).not.toBeInTheDocument();
  });

  // AC-3
  it('shows the example request at the service address for the chosen curve and date, and updates it when either changes', async () => {
    const user = userEvent.setup();
    mockService();

    renderApiReference();

    const region = await exampleRegion();
    await waitFor(() => {
      expect(region).toHaveTextContent(
        requestLine(DEFAULT_CODE, CANONICAL_OBSERVATION_DATE),
      );
    });

    await chooseCurve(user, OIS_NAME);
    await waitFor(() => {
      expect(region).toHaveTextContent(
        requestLine(OIS_CODE, CANONICAL_OBSERVATION_DATE),
      );
    });
    expect(region).not.toHaveTextContent(`/v1/curves/${DEFAULT_CODE}/rates`);

    await typeValuationDate(user, '2026-09-28');
    await waitFor(() => {
      expect(region).toHaveTextContent(requestLine(OIS_CODE, '2026-09-28'));
    });
    expect(region).not.toHaveTextContent(
      `ObservationDate=${CANONICAL_OBSERVATION_DATE}`,
    );
  });

  // AC-4
  it('shows the live rates for the chosen curve and date in RateReadList shape, or an empty list when there is no data', async () => {
    const user = userEvent.setup();
    mockService((code, date) => {
      if (date === DATE_WITHOUT_DATA) return createEmptyRates();
      return defaultRates(code, date);
    });

    renderApiReference();

    const region = await exampleRegion();
    // Canonical 10Y rate on the default curve, full service precision.
    await waitFor(() => {
      expect(region).toHaveTextContent(/"TenorLabel":\s*"10Y"/);
    });
    expect(region).toHaveTextContent(/"Rates":\s*\[/);
    expect(region).toHaveTextContent(/"TenorYears":\s*10\b/);
    expect(region).toHaveTextContent(/"RatePercent":\s*3\.55752926323083/);
    expect(region).toHaveTextContent(/"SourceRowId":\s*26\b/);
    expect(region).toHaveTextContent(
      new RegExp(`"Woid":\\s*"${escapeRegExp(CANONICAL_RATE_WOID)}"`),
    );

    // A different curve answers with its own rates.
    await chooseCurve(user, OIS_NAME);
    await waitFor(() => {
      expect(region).toHaveTextContent(/"TenorLabel":\s*"1M"/);
    });
    expect(region).not.toHaveTextContent(/"TenorLabel":\s*"10Y"/);

    // A date without data answers with an empty list.
    await typeValuationDate(user, DATE_WITHOUT_DATA);
    await waitFor(() => {
      expect(region).toHaveTextContent(/"Rates":\s*\[\s*\]/);
    });
    expect(region).not.toHaveTextContent(/"TenorLabel"/);
  });

  // AC-5
  it('never shows the prototype example address or its illustrative contract', async () => {
    mockService();

    const { container } = renderApiReference();

    const region = await exampleRegion();
    await waitFor(() => {
      expect(region).toHaveTextContent(/"TenorLabel":\s*"10Y"/);
    });
    await screen.findByRole('table', { name: 'Endpoints' });

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/genwood-demo\.example/i);
    expect(text).not.toMatch(/\/yield-curves\/v1/);
    expect(text).not.toMatch(/observationDate=/);
    for (const key of ['curve', 'source', 'count', 'note']) {
      expect(text).not.toMatch(new RegExp(`"${key}"\\s*:`));
    }
  });
});
