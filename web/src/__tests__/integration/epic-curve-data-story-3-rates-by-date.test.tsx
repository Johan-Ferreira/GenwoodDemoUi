/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Epic curve-data, Story 3: rates by date across a date range
 * (vitest-tagged ACs: 2, 3, 4, 5, 6).
 *
 * Production contracts these tests define (implement to them):
 * - The Curve data page offers a segmented "By maturity" / "By date" switch rendered
 *   as tabs (role `tab`, names exactly "By maturity" and "By date"). Only the active
 *   view's table is rendered.
 * - The By date view has text inputs labelled exactly "From", "To" and "Tenors".
 *   From / To default to the curve's available range (availability MinDate / MaxDate);
 *   an empty Tenors input means the key tenors. A field is applied when committed
 *   (blur / Enter) — the tests type, then tab away.
 * - From / To not in YYYY-MM-DD form show "Enter the observation date as YYYY-MM-DD."
 *   and NO matrix is requested; the fake service below rejects a malformed date, so a
 *   leaked request would surface as a service error and break the matrix.
 * - Tenors not entered as comma-separated labels show
 *   "Separate tenor labels with commas, for example 1Y,5Y,10Y.".
 * - The matrix comes from `get('/v1/curves/{Code}/rate-matrix', { ObservationDateFrom,
 *   ObservationDateTo, Tenors })`. Rows are observation dates (first column), then one
 *   column per entry in the response's `Tenors[]`, headed "{label} (%)". Each cell is
 *   matched to its column by `TenorLabel`, not by position; a missing cell shows a dash.
 *   Rates show 4 decimal places.
 * - A range with no rows shows "No data imported" (not an error).
 *
 * Mock data comes from the project-wide factories in `@/mocks/data/` (the canonical
 * rate matrix deliberately lists each row's cells in 10Y/1Y/5Y order).
 * Only the API client is mocked. These tests WILL FAIL until implemented (TDD red).
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { createAvailability } from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import { createRateList } from '@/mocks/data/rate';
import {
  createEmptyRateMatrix,
  createRateMatrix,
} from '@/mocks/data/rate-matrix';
import { createTenors } from '@/mocks/data/tenor';
import type { RateMatrixRead } from '@/types/api-generated';
import type { QueryParams } from '@/types/api';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/curve-data',
  useSearchParams: () => new URLSearchParams(),
}));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_FORMAT_MESSAGE = 'Enter the observation date as YYYY-MM-DD.';
const TENOR_FORMAT_MESSAGE =
  'Separate tenor labels with commas, for example 1Y,5Y,10Y.';

function paramAsString(
  params: QueryParams | undefined,
  key: string,
): string | undefined {
  const value = params?.[key];
  return value === undefined ? undefined : String(value);
}

function serviceError() {
  return {
    status: 400,
    description:
      'The data service could not complete the request (400 Bad Request).',
    retryable: true,
    kind: 'service-error' as const,
  };
}

/**
 * Behaves like the curve-data service: catalogue, tenors, availability and rates
 * from the shared factories; the rate matrix is `matrix` narrowed to the requested
 * date range and tenors. A malformed date or tenor list is rejected the way the
 * service would reject it.
 */
function serveCurveData(matrix: RateMatrixRead = createRateMatrix()) {
  return async (endpoint: string, params?: QueryParams): Promise<unknown> => {
    if (endpoint === '/v1/curves') {
      return {
        Curves: filterCurves(createCurves(), {
          Family: paramAsString(params, 'Family'),
          RateType: paramAsString(params, 'RateType'),
          Segment: paramAsString(params, 'Segment'),
        }),
      };
    }
    if (endpoint.endsWith('/tenors')) {
      return { Tenors: createTenors() };
    }
    if (endpoint.endsWith('/availability')) {
      return createAvailability();
    }
    if (endpoint.endsWith('/rates')) {
      return createRateList();
    }
    if (endpoint.endsWith('/rate-matrix')) {
      const from = paramAsString(params, 'ObservationDateFrom');
      const to = paramAsString(params, 'ObservationDateTo');
      const tenors = paramAsString(params, 'Tenors');
      for (const date of [from, to]) {
        if (date !== undefined && date !== '' && !ISO_DATE.test(date)) {
          throw serviceError();
        }
      }
      if (tenors !== undefined && /\s/.test(tenors)) {
        throw serviceError();
      }
      const requested =
        tenors === undefined || tenors === ''
          ? (matrix.Tenors ?? [])
          : tenors.split(',');
      return {
        Tenors: requested,
        Rows: (matrix.Rows ?? [])
          .filter(
            (row) =>
              (!from || (row.ObservationDate ?? '') >= from) &&
              (!to || (row.ObservationDate ?? '') <= to),
          )
          .map((row) => ({
            ...row,
            Rates: (row.Rates ?? []).filter((cell) =>
              requested.includes(cell.TenorLabel ?? ''),
            ),
          })),
      } satisfies RateMatrixRead;
    }
    throw new Error(`Unexpected endpoint in test: ${endpoint}`);
  };
}

function renderCurveData() {
  return render(
    <ToastProvider>
      <CurveDataPage />
    </ToastProvider>,
  );
}

async function switchToByDate(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('tab', { name: 'By date' }));
  return screen.findByRole('textbox', { name: 'Tenors' });
}

async function commit(field: HTMLElement, value: string): Promise<void> {
  const user = userEvent.setup();
  await user.clear(field);
  await user.type(field, value);
  await user.tab();
}

/** Column header labels of the matrix, left to right. */
function matrixHeaders(): string[] {
  return within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((header) => (header.textContent ?? '').trim());
}

/** Number of date rows in the matrix (rows that hold data cells). */
function matrixRowCount(): number {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0).length;
}

/** Text of the cell in the row for `date`, under the column headed `header`. */
function cellText(date: string, header: string): string {
  const table = screen.getByRole('table');
  const columnIndex = matrixHeaders().indexOf(header);
  expect(columnIndex).toBeGreaterThan(0);
  const row = within(table).getByRole('row', { name: new RegExp(date) });
  const cells = [
    ...within(row).queryAllByRole('rowheader'),
    ...within(row).getAllByRole('cell'),
  ];
  return (cells[columnIndex].textContent ?? '').trim();
}

/** Give any (wrongly) dispatched request time to settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

describe('Epic curve-data, Story 3: rates by date across a date range', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-2
  it('places each rate under the column of its own tenor label, even when a row lists its rates out of order or leaves one out', async () => {
    const canonical = createRateMatrix();
    const matrix: RateMatrixRead = {
      ...canonical,
      Rows: (canonical.Rows ?? []).map((row) =>
        row.ObservationDate === '2026-09-29'
          ? {
              ...row,
              Rates: (row.Rates ?? []).filter(
                (cell) => cell.TenorLabel !== '5Y',
              ),
            }
          : row,
      ),
    };
    mockGet.mockImplementation(serveCurveData(matrix));

    renderCurveData();
    const tenors = await switchToByDate();
    await commit(tenors, '1Y,5Y,10Y');

    await waitFor(() => {
      expect(matrixHeaders().slice(1)).toEqual(['1Y (%)', '5Y (%)', '10Y (%)']);
    });
    await waitFor(() => {
      expect(matrixRowCount()).toBe(3);
    });

    expect(cellText('2026-09-28', '1Y (%)')).toBe('3.8602');
    expect(cellText('2026-09-28', '5Y (%)')).toBe('3.5211');
    expect(cellText('2026-09-28', '10Y (%)')).toBe('3.6177');

    expect(cellText('2026-09-29', '1Y (%)')).toBe('3.8510');
    expect(cellText('2026-09-29', '5Y (%)')).toMatch(/^[-–—]$/);
    expect(cellText('2026-09-29', '10Y (%)')).toBe('3.5756');

    expect(cellText('2026-09-30', '1Y (%)')).toBe('3.8424');
    expect(cellText('2026-09-30', '5Y (%)')).toBe('3.4880');
    expect(cellText('2026-09-30', '10Y (%)')).toBe('3.5575');
  });

  // AC-3
  it('shows the tenor-format message when tenors are not entered as comma-separated labels', async () => {
    mockGet.mockImplementation(serveCurveData());

    renderCurveData();
    const tenors = await switchToByDate();
    await commit(tenors, '1Y 5Y');

    expect(await screen.findByText(TENOR_FORMAT_MESSAGE)).toBeInTheDocument();
  });

  // AC-4
  it('shows the date-format message for a From or To date not in YYYY-MM-DD form and requests no matrix', async () => {
    mockGet.mockImplementation(serveCurveData());

    renderCurveData();
    const tenors = await switchToByDate();
    await commit(tenors, '1Y,5Y,10Y');
    await waitFor(() => {
      expect(matrixRowCount()).toBe(3);
    });
    const headersBefore = matrixHeaders();

    await commit(screen.getByRole('textbox', { name: 'From' }), '28/09/2026');
    expect(await screen.findByText(DATE_FORMAT_MESSAGE)).toBeInTheDocument();
    await settle();

    expect(matrixHeaders()).toEqual(headersBefore);
    expect(matrixRowCount()).toBe(3);
    expect(cellText('2026-09-30', '10Y (%)')).toBe('3.5575');
    expect(
      screen.queryByText(/could not complete the request/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();

    await commit(screen.getByRole('textbox', { name: 'From' }), '2026-09-28');
    await commit(screen.getByRole('textbox', { name: 'To' }), '2026.09.30');
    expect(await screen.findByText(DATE_FORMAT_MESSAGE)).toBeInTheDocument();
    await settle();

    expect(matrixRowCount()).toBe(3);
    expect(
      screen.queryByText(/could not complete the request/i),
    ).not.toBeInTheDocument();
  });

  // AC-5
  it('shows "No data imported" instead of an error for a date range with no imported data', async () => {
    mockGet.mockImplementation(serveCurveData(createEmptyRateMatrix()));

    renderCurveData();
    const tenors = await switchToByDate();
    await commit(tenors, '1Y,5Y,10Y');
    await commit(screen.getByRole('textbox', { name: 'From' }), '2026-09-27');
    await commit(screen.getByRole('textbox', { name: 'To' }), '2026-09-27');

    expect(await screen.findByText('No data imported')).toBeInTheDocument();
    expect(
      screen.queryByText(/could not complete the request/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
  });

  // AC-6
  it('shows the single-date table for the same curve again when switching back to By maturity', async () => {
    const user = userEvent.setup();
    mockGet.mockImplementation(serveCurveData());

    renderCurveData();
    const tenors = await switchToByDate();
    await commit(tenors, '1Y,5Y,10Y');
    await waitFor(() => {
      expect(matrixRowCount()).toBe(3);
    });

    await user.click(screen.getByRole('tab', { name: 'By maturity' }));

    const table = await screen.findByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: 'Source column' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Rate (%)' }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('row', { name: /Years10/ }),
    ).toHaveTextContent('3.5575');
    expect(
      screen.queryByRole('textbox', { name: 'Tenors' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Curve' })).toHaveTextContent(
      /UK nominal spot curve$/,
    );
  });
});
