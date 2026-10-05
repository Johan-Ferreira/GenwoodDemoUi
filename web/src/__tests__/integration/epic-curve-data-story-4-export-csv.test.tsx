/**
 * Story Metadata:
 * - Route: /curve-data
 * - Target File: web/src/app/(app)/curve-data/page.tsx
 * - Page Action: modify_existing
 *
 * Epic curve-data, Story 4: export rates as CSV.
 *
 * Production contracts these tests define (implement to them):
 * - The Curve data page default export renders synchronously in jsdom (a server
 *   page that renders a client component is fine; do not make it async). It
 *   loads the catalogue, availability, tenors and rates through the endpoint
 *   functions in `@/lib/api/endpoints` (which call `get`). The "Curve" select
 *   starts on the first curve in the catalogue and the "Valuation date" text
 *   input starts on the latest available date (Story 1).
 * - "Export CSV" is a button in the filter row that calls `downloadFile` from
 *   `@/lib/api/download` with `/v1/curves/{Code}/rates.csv` and
 *   `{ ObservationDate }`, passing the fallback name "{Code}-{date}.csv" (used
 *   when the service sends no Content-Disposition header).
 * - Success shows the transient (non-persistent) toast "CSV export prepared."
 *   via `useToast()` — a `role="status"` toast in the Notifications region.
 * - A failure shows a persistent `role="alert"` message carrying the error
 *   description and a "Retry" button that re-runs the export; no confirmation
 *   toast is shown for the failed attempt.
 * - The button is disabled while the valuation date is not a valid YYYY-MM-DD
 *   date (isIsoDate).
 *
 * Mocks: only the API boundary (`@/lib/api/client` `get` and `requestFromService`)
 * and Next navigation hooks. The real `downloadFile` runs; the saved filename is
 * observed where the browser saves it (the download anchor's `download` name).
 * Payloads come from the shared project-wide factories in `@/mocks/data/`.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CurveDataPage from '@/app/(app)/curve-data/page';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider } from '@/contexts/ToastContext';
import { get, requestFromService } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createAvailability } from '@/mocks/data/availability';
import { createCurves } from '@/mocks/data/curve';
import { createRateMatrix } from '@/mocks/data/rate-matrix';
import { CANONICAL_OBSERVATION_DATE, createRateList } from '@/mocks/data/rate';
import { createTenors } from '@/mocks/data/tenor';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/curve-data',
  useSearchParams: () => new URLSearchParams(''),
}));

const mockGet = get as ReturnType<typeof vi.fn>;
const mockRequestFromService = requestFromService as ReturnType<typeof vi.fn>;

const CONFIRMATION = 'CSV export prepared.';

/** The first curve in the catalogue — the page's starting selection. */
const FIRST_CURVE_CODE = createCurves()[0].Code as string;

/** Names the browser was asked to save files under, in order. */
let savedNames: string[] = [];

/** CSV body as the live service sends it: text/csv, no Content-Disposition. */
function csvWithoutFilenameHeader(): Response {
  return new Response(
    new Blob(['TenorLabel,TenorYears,RatePercent\n10Y,10,3.55752926323083\n']),
    { status: 200, headers: { 'content-type': 'text/csv' } },
  );
}

/** Serves the curve-data JSON endpoints from the shared factories. */
function serveCurveData() {
  mockGet.mockImplementation((endpoint: string) => {
    if (endpoint === '/v1/curves') {
      return Promise.resolve({ Curves: createCurves() });
    }
    if (/^\/v1\/curves\/[^/]+\/availability$/.test(endpoint)) {
      return Promise.resolve(createAvailability());
    }
    if (/^\/v1\/curves\/[^/]+\/tenors$/.test(endpoint)) {
      return Promise.resolve({ Tenors: createTenors() });
    }
    if (/^\/v1\/curves\/[^/]+\/rates$/.test(endpoint)) {
      return Promise.resolve(createRateList());
    }
    if (/^\/v1\/curves\/[^/]+\/rate-matrix$/.test(endpoint)) {
      return Promise.resolve(createRateMatrix());
    }
    return Promise.reject(
      new ServiceError({
        status: 404,
        description: `Unexpected request in test: ${endpoint}`,
        retryable: true,
        kind: 'service-error',
      }),
    );
  });
}

function renderCurveData() {
  return render(
    <ToastProvider>
      <CurveDataPage />
      <ToastContainer />
    </ToastProvider>,
  );
}

/** Waits until the export is available (curve + latest valid date loaded). */
async function readyExportButton(): Promise<HTMLElement> {
  const button = await screen.findByRole('button', { name: 'Export CSV' });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

describe('Epic curve-data, Story 4: export rates as CSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedNames = [];
    serveCurveData();
    // jsdom has no object-URL support — supply inert stand-ins.
    URL.createObjectURL = () => 'blob:mock-download';
    URL.revokeObjectURL = () => undefined;
    // Record the name each file is saved under instead of navigating.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      if (this.download) savedNames.push(this.download);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // AC-2
  it('shows the brief confirmation "CSV export prepared." after a successful export and saves the CSV', async () => {
    const user = userEvent.setup();
    mockRequestFromService.mockResolvedValueOnce(csvWithoutFilenameHeader());

    renderCurveData();
    await user.click(await readyExportButton());

    const notifications = await screen.findByRole('region', {
      name: 'Notifications',
    });
    // A transient status toast (not a persistent alert).
    const toast = await within(notifications).findByRole('status');
    expect(toast).toHaveTextContent(CONFIRMATION);

    // With no filename header, the file is saved as "{Code}-{date}.csv".
    expect(savedNames).toEqual([
      `${FIRST_CURVE_CODE}-${CANONICAL_OBSERVATION_DATE}.csv`,
    ]);
  });

  // AC-3
  it('shows a persistent error with Retry and no confirmation when the export fails, and Retry exports again', async () => {
    const user = userEvent.setup();
    const failure =
      'The data service could not complete the request (500 Internal Server Error).';
    mockRequestFromService
      .mockRejectedValueOnce(
        new ServiceError({
          status: 500,
          description: failure,
          retryable: true,
          kind: 'service-error',
        }),
      )
      .mockResolvedValueOnce(csvWithoutFilenameHeader());

    renderCurveData();
    await user.click(await readyExportButton());

    const retry = await screen.findByRole('button', { name: 'Retry' });
    const alert = retry.closest('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert).toHaveTextContent(failure);
    expect(screen.queryByText(CONFIRMATION)).not.toBeInTheDocument();
    expect(savedNames).toEqual([]);

    await user.click(retry);

    const notifications = await screen.findByRole('region', {
      name: 'Notifications',
    });
    expect(
      await within(notifications).findByText(CONFIRMATION),
    ).toBeInTheDocument();
    expect(savedNames).toEqual([
      `${FIRST_CURVE_CODE}-${CANONICAL_OBSERVATION_DATE}.csv`,
    ]);
  });

  // AC-4
  it('makes Export CSV unavailable while the valuation date is not a valid YYYY-MM-DD date', async () => {
    const user = userEvent.setup();

    renderCurveData();
    const button = await readyExportButton();

    const dateInput = screen.getByLabelText('Valuation date');
    await user.clear(dateInput);
    await user.type(dateInput, '04/10/2026');

    expect(button).toBeDisabled();

    // A valid date makes it available again.
    await user.clear(dateInput);
    await user.type(dateInput, CANONICAL_OBSERVATION_DATE);

    await waitFor(() => expect(button).toBeEnabled());
  });
});
