/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Epic quality-check-and-clean-up, Story 3: Curve data import-trace links and
 * Yield curves date filter spacing.
 *
 * Production contracts these tests define (implement to them, in
 * web/src/components/curve-data/RatesByMaturity.tsx):
 * - The By maturity table's last column has no visible heading text, but its
 *   header cell still carries a visually hidden label so the column header's
 *   accessible name is exactly "Source import" (NFR-3). The column stays last.
 * - Each row with an import shows a link whose text (and accessible name) is the
 *   fixed "View Import Trace" (BR6). Its href is unchanged:
 *   importTracePath(rate.Woid) -> /file-log/imports/{Woid}.
 * - A row with no import still shows the em dash and no link.
 *
 * Manual-test fixes:
 * - By date "From" / "To" stay typeable and each get a calendar button
 *   ("Choose from date" / "Choose to date") opening a dialog ("From date
 *   calendar" / "To date calendar") on the chosen date's month; a picked day
 *   fills the field and applies exactly like a typed date.
 * - The compact "Dates with data" note (Yield curves, Across dates) reads as
 *   three pieces: "Dates with data:", "earliest {date},", "latest {date}.".
 *
 * AC-3 (clicking the link opens the import trace) is covered by the Playwright
 * spec for this story. AC-4 (Yield curves filter spacing) is a visual layout
 * change checked manually.
 *
 * Only the API boundary (`get` in @/lib/api/client) is mocked; next/navigation
 * is stubbed because the App Router is not mounted under jsdom. Payloads come
 * from the project-wide factories in @/mocks/data.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ValuationDateField } from '@/components/curve-data/ValuationDateField';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import {
  createAvailability,
  LATEST_AVAILABLE_DATE,
} from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import { createFiles } from '@/mocks/data/file';
import {
  CANONICAL_RATE_WOID,
  createRateList,
  createRates,
} from '@/mocks/data/rate';
import { createRateMatrix } from '@/mocks/data/rate-matrix';
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
const LINK_TEXT = 'View Import Trace';
const NO_IMPORT_TENOR = '30Y';

/** Woid of a second imported file (98), so rows trace to different imports. */
const OTHER_WOID = requiredWoid(
  createFiles().find((file) => file.Id === 98)?.Woid,
);

function requiredWoid(woid: string | undefined): string {
  if (!woid) throw new Error('Mock factory is missing file 98 Woid');
  return woid;
}

/**
 * Canonical rates with: the 0.5Y rate traced to a different import, and the
 * 30Y rate missing (so the 30Y row has no import).
 */
function ratesWithMixedImports(): RateReadList {
  return createRateList(
    createRates()
      .filter((rate) => rate.TenorLabel !== NO_IMPORT_TENOR)
      .map((rate) =>
        rate.TenorLabel === '0.5Y' ? { ...rate, Woid: OTHER_WOID } : rate,
      ),
  );
}

function mockService(rates: () => RateReadList = () => createRateList()) {
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
      if (endpoint === `/v1/curves/${CODE}/rates`) {
        return rates();
      }
      throw new Error(`Unexpected GET ${endpoint}`);
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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The table row for a tenor, found by its leading tenor label. */
function rowForTenor(label: string): HTMLElement {
  return screen.getByRole('row', {
    name: new RegExp(`^${escapeRegExp(label)}\\s`),
  });
}

describe('Epic quality-check-and-clean-up, Story 3: Curve data import-trace links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-1
  it('announces the last By maturity column as "Source import" without the old "(WOID)" heading', async () => {
    mockService();

    renderCurveData();

    const table = await screen.findByRole('table');
    await screen.findByRole('row', { name: /^10Y\s/ });

    const headers = within(table).getAllByRole('columnheader');
    const sourceHeader = within(table).getByRole('columnheader', {
      name: 'Source import',
    });
    // Still the last column.
    expect(headers[headers.length - 1]).toBe(sourceHeader);
    // The old visible heading text is gone.
    expect(
      within(table).queryByText('Source import (WOID)'),
    ).not.toBeInTheDocument();
    expect(within(table).queryByText(/WOID/)).not.toBeInTheDocument();
  });

  // AC-2
  it('shows a "View Import Trace" link to each row\'s own import, and a dash where there is no import', async () => {
    mockService(ratesWithMixedImports);

    renderCurveData();
    await screen.findByRole('row', { name: /^10Y\s/ });

    const tenYearLink = within(rowForTenor('10Y')).getByRole('link', {
      name: LINK_TEXT,
    });
    expect(tenYearLink).toHaveAttribute(
      'href',
      `/file-log/imports/${CANONICAL_RATE_WOID}`,
    );
    // The raw WOID is not shown in the link.
    expect(tenYearLink).not.toHaveTextContent(CANONICAL_RATE_WOID.slice(0, 8));

    // Same fixed text for a row from a different import; its target differs.
    const halfYearLink = within(rowForTenor('0.5Y')).getByRole('link', {
      name: LINK_TEXT,
    });
    expect(halfYearLink).toHaveAttribute(
      'href',
      `/file-log/imports/${OTHER_WOID}`,
    );

    // A row without an import: its Source import cell (the last column) is a
    // dash, and the row has no link.
    const noImportRow = rowForTenor(NO_IMPORT_TENOR);
    expect(within(noImportRow).queryByRole('link')).not.toBeInTheDocument();
    const cells = within(noImportRow).getAllByRole('cell');
    expect(cells[cells.length - 1]).toHaveTextContent(/^—$/);
  });
});

/** Serves the curve catalogue, availability, tenors and the rate matrix for By date. */
function mockByDateService() {
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
      if (endpoint === `/v1/curves/${CODE}/rates`) {
        return createRateList();
      }
      if (endpoint === `/v1/curves/${CODE}/rate-matrix`) {
        const from = String(params?.ObservationDateFrom ?? '');
        const to = String(params?.ObservationDateTo ?? '');
        const matrix = createRateMatrix();
        return {
          ...matrix,
          Rows: (matrix.Rows ?? []).filter(
            (row) =>
              (!from || (row.ObservationDate ?? '') >= from) &&
              (!to || (row.ObservationDate ?? '') <= to),
          ),
        };
      }
      throw new Error(`Unexpected GET ${endpoint}`);
    },
  );
}

/** Observation dates shown as rows in the By date matrix, oldest first. */
function matrixDates(): string[] {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length > 0)
    .map((row) => /\d{4}-\d{2}-\d{2}/.exec(row.textContent ?? '')?.[0] ?? '')
    .sort();
}

/** The element whose whole text (across nested elements) is exactly `text`. */
function wholeText(text: string): HTMLElement {
  return screen.getByText(
    (_content, element) =>
      element?.textContent === text &&
      Array.from(element.children).every((child) => child.textContent !== text),
  );
}

/** Click a calendar button and return the calendar dialog named `dialogName`. */
async function openCalendar(
  user: ReturnType<typeof userEvent.setup>,
  buttonName: string,
  dialogName: string,
): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: buttonName }));
  return screen.findByRole('dialog', { name: dialogName });
}

/** A September 2026 day in an open calendar, by day of the month. */
function septemberDay(calendar: HTMLElement, day: number): HTMLElement {
  return within(calendar).getByRole('button', {
    name: new RegExp(`^\\w+, ${day} September 2026`),
  });
}

describe('Epic quality-check-and-clean-up, Story 3: Curve data By date pickers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Manual-test fix: From / To get calendars, and a picked date applies like a typed one.
  it('keeps From and To typeable and adds calendars that open on the chosen date and apply a picked day like a typed date', async () => {
    const user = userEvent.setup();
    mockByDateService();

    renderCurveData();
    await user.click(await screen.findByRole('tab', { name: 'By date' }));
    const from = await screen.findByRole('textbox', { name: 'From' });
    await waitFor(() => {
      expect(matrixDates()).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    });

    // To opens on its chosen date's month with that day selected.
    const toCalendar = await openCalendar(
      user,
      'Choose to date',
      'To date calendar',
    );
    expect(septemberDay(toCalendar, 30)).toHaveAccessibleName(/selected/);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Typed From still applies on Enter.
    await user.clear(from);
    await user.type(from, '2026-09-29{Enter}');
    await waitFor(() => {
      expect(matrixDates()).toEqual(['2026-09-29', '2026-09-30']);
    });

    // Picking a From day from the calendar fills the field and narrows the rows.
    const fromCalendar = await openCalendar(
      user,
      'Choose from date',
      'From date calendar',
    );
    expect(septemberDay(fromCalendar, 29)).toHaveAccessibleName(/selected/);
    await user.click(septemberDay(fromCalendar, 30));

    expect(from).toHaveValue('2026-09-30');
    await waitFor(() => {
      expect(matrixDates()).toEqual(['2026-09-30']);
    });
  });
});

describe('Epic quality-check-and-clean-up, Story 3: Yield curves dates-with-data note', () => {
  // Manual-test fix: the compact note runs over three lines and never splits a date.
  it('shows the compact note as "Dates with data:", "earliest …," and "latest …." with each date kept whole', () => {
    const availability = createAvailability();
    render(
      <ValuationDateField
        availability={availability}
        compactRange
        draft={LATEST_AVAILABLE_DATE}
        applied={LATEST_AVAILABLE_DATE}
        invalid={false}
        onType={vi.fn()}
        onCommit={vi.fn()}
        onPick={vi.fn()}
      />,
    );

    expect(wholeText('Dates with data:')).toBeInTheDocument();
    expect(wholeText(`earliest ${availability.MinDate},`)).toBeInTheDocument();
    expect(wholeText(`latest ${availability.MaxDate}.`)).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Valuation date' }),
    ).toHaveAccessibleDescription(
      `Dates with data: earliest ${availability.MinDate}, latest ${availability.MaxDate}.`,
    );
  });
});
