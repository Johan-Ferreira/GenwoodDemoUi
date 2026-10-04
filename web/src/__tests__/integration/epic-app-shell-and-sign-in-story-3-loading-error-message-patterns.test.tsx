/**
 * Story Metadata:
 * - Route: null (infrastructure only — shared building blocks for later views)
 * - Target File: web/src/components/data-state/DataState.tsx
 * - Page Action: create_new
 *
 * Epic app-shell-and-sign-in, Story 3: shared loading, error and message patterns.
 *
 * Production contracts these tests define (implement to them):
 * - `DataState` (web/src/components/data-state/DataState.tsx)
 *     <DataState load={() => get<T>('/v1/...')}>{(data: T) => ...}</DataState>
 *   Loading thresholds (R9): nothing for the first 300 ms; then a skeleton inside an
 *   element with role="status" and accessible name "Loading"; after 3 s the skeleton
 *   stays and a "taking longer than usual" line shows. Content replaces it on arrival.
 *   A rejected load with `kind: 'service-error'` shows a persistent role="alert"
 *   message containing the error description plus a "Retry" button (R7, BR6).
 *   A rejected load with `kind: 'not-authorised'` (401/403) shows an in-page
 *   role="alert" message saying the request was not authorised and how to request
 *   access (R8). The service-error shape comes from Story 2:
 *   `{ status, description, retryable, kind: 'not-authorised' | 'service-error' }`.
 * - Toast (existing ToastContext / ToastContainer, restyled + retimed — R10):
 *   the notifications region carries `data-position="bottom-right"`; the default
 *   duration is about 2600 ms; `showToast({ ..., persistent: true })` never
 *   auto-dismisses and stays until the user dismisses it.
 * - `StatusChip` (web/src/components/status-chip/StatusChip.tsx):
 *     <StatusChip tone="success|warning|danger|info|neutral" label="..." />
 *   Always renders its text label; exposes its tone as `data-tone` (R11).
 * - `IconButton` (web/src/components/icon-button/IconButton.tsx):
 *     <IconButton label="..."><LucideIcon aria-hidden /></IconButton>
 *   Required `label` becomes the button's accessible name (R12).
 *
 * Copy follows R16: says what happened then what to do, no exclamation marks.
 *
 * Timers: the 300 ms / 3 s loading thresholds and the 2.6 s toast lifetime are
 * component-local timers with no routable flow in this story, so they use Vitest
 * fake timers (testing-policy § Time-dependent behaviour, last-resort case).
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import {
  act,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataState } from '@/components/data-state/DataState';
import { IconButton } from '@/components/icon-button/IconButton';
import { StatusChip } from '@/components/status-chip/StatusChip';
import { ToastContainer } from '@/components/toast/ToastContainer';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ get: vi.fn() }));
const mockGet = get as ReturnType<typeof vi.fn>;

/** Subset of OverviewRead (documentation/CurveData.yaml) used as the loaded payload. */
interface OverviewSlice {
  LatestValuationDate: string;
}

const overview: OverviewSlice = { LatestValuationDate: '2026-09-30' };

const serviceError = {
  status: 500,
  description: 'The data service could not complete the request.',
  retryable: true,
  kind: 'service-error' as const,
};

const notAuthorisedError = {
  status: 403,
  description: 'The data service refused the request.',
  retryable: false,
  kind: 'not-authorised' as const,
};

function renderOverviewState() {
  return render(
    <DataState load={() => get<OverviewSlice>('/v1/overview')}>
      {(data: OverviewSlice) => (
        <p>Latest valuation date {data.LatestValuationDate}</p>
      )}
    </DataState>,
  );
}

function ToastHarness({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}

describe('Story 3: shared loading, error and message patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // AC-1
  it('shows nothing for 300 ms, then a skeleton, then a taking-longer message after 3 s, and the content on arrival', async () => {
    let resolveLoad: (value: OverviewSlice) => void = () => undefined;
    mockGet.mockReturnValue(
      new Promise<OverviewSlice>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    renderOverviewState();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(
      screen.getByRole('status', { name: /loading/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/taking longer than usual/i),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(
      screen.getByRole('status', { name: /loading/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();

    await act(async () => {
      resolveLoad(overview);
    });
    expect(
      screen.getByText('Latest valuation date 2026-09-30'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/taking longer than usual/i),
    ).not.toBeInTheDocument();
  });

  // AC-2
  it('shows a persistent service-error message with Retry, and clears it when the retried read succeeds', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockGet.mockRejectedValueOnce(serviceError).mockResolvedValueOnce(overview);

    renderOverviewState();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(serviceError.description);
    expect(alert.textContent).not.toMatch(/!/);
    expect(screen.queryByText(/Latest valuation date/)).not.toBeInTheDocument();

    // Persistent: still showing well after any toast-style lifetime.
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      serviceError.description,
    );

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByText('Latest valuation date 2026-09-30'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // AC-3
  it('shows an in-page not-authorised message that names how to request access', async () => {
    mockGet.mockRejectedValue(notAuthorisedError);

    renderOverviewState();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not authorised/i);
    expect(alert).toHaveTextContent(/request access/i);
    expect(alert.textContent).not.toMatch(/!/);
    expect(screen.queryByText(/Latest valuation date/)).not.toBeInTheDocument();
  });

  // AC-4
  it('shows a completed-action message at the bottom right that leaves after about 2.6 s, while a persistent one stays until dismissed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { result } = renderHook(() => useToast(), { wrapper: ToastHarness });

    act(() => {
      result.current.showToast({
        variant: 'success',
        title: 'CSV export downloaded.',
      });
    });

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('data-position', 'bottom-right');
    expect(
      within(region).getByText('CSV export downloaded.'),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(screen.getByText('CSV export downloaded.')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(
      screen.queryByText('CSV export downloaded.'),
    ).not.toBeInTheDocument();

    act(() => {
      result.current.showToast({
        variant: 'warning',
        title: 'The file could not be saved. Choose a folder and try again.',
        persistent: true,
      });
    });

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    const persistentRegion = screen.getByRole('region', {
      name: 'Notifications',
    });
    expect(
      within(persistentRegion).getByText(
        'The file could not be saved. Choose a folder and try again.',
      ),
    ).toBeInTheDocument();

    await user.click(
      within(persistentRegion).getByRole('button', {
        name: /dismiss notification/i,
      }),
    );
    expect(
      screen.queryByText(
        'The file could not be saved. Choose a folder and try again.',
      ),
    ).not.toBeInTheDocument();
  });

  // AC-4 (code-review fix): a message waiting on the user is not pushed out by newer ones
  it('keeps a persistent message on screen when more completed-action messages arrive than fit', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastHarness });

    act(() => {
      result.current.showToast({
        variant: 'warning',
        title: 'The file could not be saved. Choose a folder and try again.',
        persistent: true,
      });
    });
    act(() => {
      result.current.showToast({ variant: 'success', title: 'Export 1 done.' });
      result.current.showToast({ variant: 'success', title: 'Export 2 done.' });
      result.current.showToast({ variant: 'success', title: 'Export 3 done.' });
    });

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(
      within(region).getByText(
        'The file could not be saved. Choose a folder and try again.',
      ),
    ).toBeInTheDocument();
    expect(within(region).getByText('Export 3 done.')).toBeInTheDocument();
    expect(
      within(region).queryByText('Export 1 done.'),
    ).not.toBeInTheDocument();
  });

  // AC-5
  it('always shows a text label on status chips, with the tone carried for each intent', () => {
    vi.useRealTimers();
    render(
      <ul>
        <li>
          <StatusChip tone="success" label="Published" />
        </li>
        <li>
          <StatusChip tone="warning" label="Awaiting review" />
        </li>
        <li>
          <StatusChip tone="danger" label="Failed" />
        </li>
        <li>
          <StatusChip tone="info" label="Processing" />
        </li>
        <li>
          <StatusChip tone="neutral" label="Superseded" />
        </li>
      </ul>,
    );

    expect(
      screen.getByText('Published').closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'success');
    expect(
      screen.getByText('Awaiting review').closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByText('Failed').closest('[data-tone]')).toHaveAttribute(
      'data-tone',
      'danger',
    );
    expect(
      screen.getByText('Processing').closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'info');
    expect(
      screen.getByText('Superseded').closest('[data-tone]'),
    ).toHaveAttribute('data-tone', 'neutral');
  });

  // AC-6
  it('announces an icon-only button to screen readers by its text label', () => {
    vi.useRealTimers();
    render(
      <IconButton label="Download original file">
        <Download aria-hidden="true" />
      </IconButton>,
    );

    expect(
      screen.getByRole('button', { name: 'Download original file' }),
    ).toBeInTheDocument();
  });
});
