/**
 * Story Metadata:
 * - Route: /workflow-monitor
 * - Target File: web/src/app/(app)/workflow-monitor/page.tsx
 * - Page Action: modify_existing
 * - Role: Demo presenter
 *
 * Epic quality-check-and-clean-up, Story 4: Workflow monitor run selection and
 * exception note in Audit history (R9, BR4, NFR-4). Row selection (R8, BR5) is
 * covered by the Playwright spec.
 *
 * Production contracts these tests define (implement to them):
 * - The selected run (`?instance=<Id>`) already resolves its import through
 *   `GET /v1/imports/{ProcessInstanceId}` (ProcessInstanceDetail's `trace`); a
 *   failed lookup yields no file. AuditHistory receives the resolved file's note.
 * - Audit history (region "Audit history", a `<dl>` of `<dt>`/`<dd>` pairs) adds
 *   one extra row, `<dt>` exactly "Exception note" with the note's plain text in
 *   its `<dd>`, only when BR4 holds (predicate in lib/workflow/process-status.ts):
 *   ProcessName is "ImportFile"; the import lookup returned a file; the run did
 *   not finish successfully (CurrentStatus other than Finished, or FaultedAt set,
 *   or the file's Status is Failed at Stage ImportPro); File.ExceptionNote is
 *   non-blank.
 * - Otherwise the `<dt>` labels stay exactly: Status, Created, Last executed,
 *   Finished, Cancelled, Faulted, Last executed activity (no empty row).
 *
 * Only the API boundary (`@/lib/api/client`) and Next navigation hooks are mocked.
 * Payloads come from the project-wide factories in web/src/mocks/data/.
 *
 * These tests WILL FAIL until implemented (TDD red).
 */
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WorkflowMonitorPage from '@/app/(app)/workflow-monitor/page';
import { ToastProvider } from '@/contexts/ToastContext';
import { get } from '@/lib/api/client';
import { ServiceError } from '@/lib/api/service-error';
import { createEmptyExecutionLogList } from '@/mocks/data/execution-log';
import {
  createFailedFileDetail,
  createFileDetail,
} from '@/mocks/data/file-detail';
import { createImport, createStagingFailedImport } from '@/mocks/data/import';
import { createProcessInstanceList } from '@/mocks/data/process-instance';
import {
  createCancelledProcessInstanceDetail,
  createFaultedProcessInstanceDetail,
  createHoldStoppedImportFileProcessInstanceDetail,
  createProcessInstanceDetail,
} from '@/mocks/data/process-instance-detail';
import type {
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

vi.mock('@/lib/api/client', () => ({
  get: vi.fn(),
  requestFromService: vi.fn(),
}));
const mockGet = get as ReturnType<typeof vi.fn>;

let currentSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/workflow-monitor',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

/** The Audit history rows every run shows, in order. */
const USUAL_AUDIT_LABELS = [
  'Status',
  'Created',
  'Last executed',
  'Finished',
  'Cancelled',
  'Faulted',
  'Last executed activity',
];

const EXCEPTION_NOTE_LABEL = 'Exception note';

/** The faulted ImportFile run of file 102 — its ProcessInstanceId is that file's Woid. */
const STAGING_FAILED_RUN_ID = '3c9d5e7f1a2b4c6d8e0f1a2b3c4d5e6f';

function serviceError(status: number, description: string): ServiceError {
  return new ServiceError({
    status,
    description,
    retryable: true,
    kind: 'service-error',
  });
}

interface RunScenario {
  detail: ProcessInstanceDetailRead;
  trace: ImportRead | ServiceError;
}

/** Serves the list, the selected run, an empty log and the run's import lookup. */
function renderSelectedRun({ detail, trace }: RunScenario) {
  const id = detail.ProcessInstanceId ?? '';
  mockGet.mockImplementation((endpoint: unknown) => {
    if (endpoint === '/v1/process-instances') {
      return Promise.resolve(createProcessInstanceList());
    }
    if (endpoint === `/v1/process-instances/${id}`) {
      return Promise.resolve(detail);
    }
    if (endpoint === `/v1/process-instances/${id}/execution-logs`) {
      return Promise.resolve(createEmptyExecutionLogList());
    }
    if (endpoint === `/v1/imports/${id}`) {
      return trace instanceof ServiceError
        ? Promise.reject(trace)
        : Promise.resolve(trace);
    }
    return Promise.reject(
      serviceError(500, `Unexpected request in test: ${String(endpoint)}`),
    );
  });
  currentSearch = `instance=${id}`;
  return render(
    <ToastProvider>
      <WorkflowMonitorPage />
    </ToastProvider>,
  );
}

async function auditHistory(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: /audit history/i });
}

/** The `<dt>` labels shown in Audit history, in order. */
function auditLabels(region: HTMLElement): string[] {
  return Array.from(region.querySelectorAll('dt')).map(
    (term) => term.textContent?.trim() ?? '',
  );
}

/** The `<dd>` value that follows the audit-history `<dt>` with exactly `label`. */
function auditValue(region: HTMLElement, label: string): string {
  const term = within(region).getByText(label, { selector: 'dt' });
  return term.nextElementSibling?.textContent?.trim() ?? '';
}

/** A failed (ImportPro) staging file for `woid` with its exception note removed. */
function failedFileWithoutNote(woid: string) {
  const file = createFailedFileDetail({ Woid: woid });
  delete file.ExceptionNote;
  return file;
}

describe('Epic quality-check-and-clean-up, Story 4: exception note in Audit history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  // AC-3
  it('shows an "Exception note" row with the file\'s note for a staging run that did not finish successfully', async () => {
    // Faulted ImportFile run of the ImportPro-failed file 102.
    const faulted = renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      trace: createStagingFailedImport(),
    });
    const faultedHistory = await auditHistory();
    expect(auditValue(faultedHistory, EXCEPTION_NOTE_LABEL)).toBe(
      'Row 12: invalid rate',
    );
    faulted.unmount();

    // A stalled ImportFile run (Suspended on a Hold step) whose file has a note.
    const stalled = createHoldStoppedImportFileProcessInstanceDetail();
    const stalledNote = 'Duplicate file: this file was already imported';
    const suspended = renderSelectedRun({
      detail: stalled,
      trace: createStagingFailedImport({
        File: createFailedFileDetail({
          Woid: stalled.ProcessInstanceId,
          ExceptionNote: stalledNote,
        }),
      }),
    });
    const suspendedHistory = await auditHistory();
    expect(auditValue(suspendedHistory, EXCEPTION_NOTE_LABEL)).toBe(
      stalledNote,
    );
    suspended.unmount();

    // A run reported Finished, but its file Failed at the ImportPro (staging) stage.
    renderSelectedRun({
      detail: createProcessInstanceDetail({
        ProcessInstanceId: STAGING_FAILED_RUN_ID,
      }),
      trace: createStagingFailedImport(),
    });
    const finishedHistory = await auditHistory();
    expect(auditValue(finishedHistory, EXCEPTION_NOTE_LABEL)).toBe(
      'Row 12: invalid rate',
    );
  });

  // AC-4
  it('shows no exception-note row for a successful staging run, a rate load run, or a failed staging run without a note', async () => {
    // Successful staging run: Finished, file Imported — a leftover note is not shown.
    const successful = renderSelectedRun({
      detail: createProcessInstanceDetail(),
      trace: createImport({
        File: createFileDetail({
          ExceptionNote: 'Note left from an earlier attempt',
        }),
      }),
    });
    expect(auditLabels(await auditHistory())).toEqual(USUAL_AUDIT_LABELS);
    expect(
      screen.queryByText('Note left from an earlier attempt'),
    ).not.toBeInTheDocument();
    successful.unmount();

    // Rate load (LoadYieldCurves) run that did not finish: never shows a note,
    // even if a file with a note were resolved for it.
    const rateLoad = renderSelectedRun({
      detail: createCancelledProcessInstanceDetail(),
      trace: createStagingFailedImport(),
    });
    expect(auditLabels(await auditHistory())).toEqual(USUAL_AUDIT_LABELS);
    expect(screen.queryByText('Row 12: invalid rate')).not.toBeInTheDocument();
    rateLoad.unmount();

    // Failed staging run whose file has no exception note: no empty row.
    renderSelectedRun({
      detail: createFaultedProcessInstanceDetail(),
      trace: createStagingFailedImport({
        File: failedFileWithoutNote(STAGING_FAILED_RUN_ID),
      }),
    });
    expect(auditLabels(await auditHistory())).toEqual(USUAL_AUDIT_LABELS);
  });

  // AC-5
  it("still shows the usual Audit history rows, with no note and no error, when the run's file cannot be looked up", async () => {
    const failures = [
      serviceError(
        404,
        'The data service could not complete the request (404 Not Found). The service said: Import not found',
      ),
      serviceError(500, 'The import service is unavailable.'),
    ];

    for (const failure of failures) {
      const view = renderSelectedRun({
        detail: createFaultedProcessInstanceDetail(),
        trace: failure,
      });
      const history = await auditHistory();
      expect(auditLabels(history)).toEqual(USUAL_AUDIT_LABELS);
      expect(auditValue(history, 'Status')).toBe('Faulted');
      expect(auditValue(history, 'Last executed activity')).toBe('ParseRates');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(failure.description)).not.toBeInTheDocument();
      view.unmount();
    }
  });
});
