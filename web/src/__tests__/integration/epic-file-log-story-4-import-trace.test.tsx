/**
 * Story Metadata:
 * - Route: /file-log/imports/[woid]
 * - Target File: web/src/app/(app)/file-log/imports/[woid]/page.tsx
 * - Page Action: create_new
 *
 * Epic file-log, Story 4: trace a file to its import.
 *
 * Production contracts these tests define (implement to them):
 * - The page is the Next.js 16 App Router default export taking async params:
 *     export default async function ImportTracePage(
 *       { params }: { params: Promise<{ woid: string }> },
 *     )
 *   It awaits `params` and renders the trace for that WOID (typically by handing
 *   `woid` to a client component). Tests render `await ImportTracePage({ params })`.
 * - The trace loads `GET /v1/imports/{woid}` via `getImport` (endpoints.ts → `get`)
 *   through `DataState`.
 * - Three labelled sections (e.g. `<section aria-labelledby>` with a heading), so
 *   each exposes role="region" with an accessible name matching:
 *     /file log entry/i       — File: FileName, CurveFamily, ReceivedAt, Status
 *     /workflow instance/i    — ProcessName, CurrentStatus (StatusChip),
 *                               CreatedAt, LastExecutedAt, FinishedAt / FaultedAt /
 *                               CancelledAt only when present, LastExecutedActivityName
 *     /rates and curves/i     — RatesCount and CurvesCount, each next to its label
 * - Non-404 failures show DataState's persistent role="alert" with Retry (BR6).
 *
 * Only the API boundary (`@/lib/api/client`) is mocked. Payloads come from the
 * project-wide factories in web/src/mocks/data/.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ImportTracePage from '@/app/(app)/file-log/imports/[woid]/page';
import { get } from '@/lib/api/client';
import { createFaultedProcessInstanceDetail } from '@/mocks/data/process-instance-detail';
import { createFailedImport } from '@/mocks/data/import';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

/** A failed import with distinct timestamps so each one is individually observable. */
const failedImport = createFailedImport({
  ProcessInstance: createFaultedProcessInstanceDetail({
    CreatedAt: '2026-09-30 18:05:41',
    LastExecutedAt: '2026-09-30 18:05:43',
    FaultedAt: '2026-09-30 18:05:44',
  }),
  RatesCount: 130,
  CurvesCount: 5,
});
const woid = failedImport.File?.Woid ?? '';

const serviceError = {
  status: 500,
  description: 'The data service could not complete the request.',
  retryable: true,
  kind: 'service-error' as const,
};

async function renderTrace() {
  const page = await ImportTracePage({ params: Promise.resolve({ woid }) });
  return render(page);
}

describe('Epic file-log, Story 4: import trace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // AC-2
  // Data-contract: full chain verified during manual checklist
  it('shows the file log entry, the workflow instance with its status and timestamps, and the rates and curves counts', async () => {
    mockGet.mockImplementation((path: unknown) =>
      path === `/v1/imports/${woid}`
        ? Promise.resolve(failedImport)
        : Promise.reject(serviceError),
    );

    await renderTrace();

    const fileEntry = await screen.findByRole('region', {
      name: /file log entry/i,
    });
    expect(
      within(fileEntry).getByText(
        'GLC Inflation daily data current month.xlsx',
      ),
    ).toBeInTheDocument();
    expect(within(fileEntry).getByText('Inflation')).toBeInTheDocument();
    expect(
      within(fileEntry).getByText('2026-09-30 18:05:40'),
    ).toBeInTheDocument();
    expect(within(fileEntry).getByText('Failed')).toBeInTheDocument();

    const workflow = screen.getByRole('region', { name: /workflow instance/i });
    expect(within(workflow).getByText('ImportCurveFile')).toBeInTheDocument();
    expect(within(workflow).getByText('Faulted')).toBeInTheDocument();
    expect(
      within(workflow).getByText('2026-09-30 18:05:41'),
    ).toBeInTheDocument();
    expect(
      within(workflow).getByText('2026-09-30 18:05:43'),
    ).toBeInTheDocument();
    expect(
      within(workflow).getByText('2026-09-30 18:05:44'),
    ).toBeInTheDocument();
    expect(within(workflow).getByText('ParseRates')).toBeInTheDocument();
    // FinishedAt is absent on a faulted instance, so no "Finished" timestamp row.
    expect(within(workflow).queryByText(/finished/i)).not.toBeInTheDocument();

    const counts = screen.getByRole('region', { name: /rates and curves/i });
    expect(counts).toHaveTextContent(/rates\D*130/i);
    expect(counts).toHaveTextContent(/curves\D*5\b/i);
  });

  // AC-4
  it('shows a persistent error with Retry when the trace cannot be loaded, and shows the trace once Retry succeeds', async () => {
    const user = userEvent.setup();
    mockGet
      .mockRejectedValueOnce(serviceError)
      .mockResolvedValueOnce(failedImport);

    await renderTrace();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(serviceError.description);
    expect(screen.queryByText('Import not found')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /workflow instance/i }),
    ).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Retry' }));

    expect(
      await screen.findByRole('region', { name: /workflow instance/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
