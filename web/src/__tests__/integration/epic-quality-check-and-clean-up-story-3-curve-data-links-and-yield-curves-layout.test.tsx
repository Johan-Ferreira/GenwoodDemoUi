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
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { createAvailability } from '@/mocks/data/availability';
import { createCurves, filterCurves } from '@/mocks/data/curve';
import { createFiles } from '@/mocks/data/file';
import {
  CANONICAL_RATE_WOID,
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
