'use client';

import {
  CircleAlert,
  Download,
  Route,
  TableProperties,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { NotFoundMessage } from '@/components/data-state/NotFoundMessage';
import { toServiceErrorShape } from '@/components/data-state/useDataState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  HIDE_ROW_LEVEL_ERRORS,
  RowLevelErrors,
  VIEW_ROW_LEVEL_ERRORS,
} from '@/components/file-log/RowLevelErrors';
import { StatusChip } from '@/components/status-chip/StatusChip';
import { Skeleton } from '@/components/ui/skeleton';
import { workflowMonitorSelectionPath } from '@/components/workflow-monitor/useSelectedInstance';
import { useToast } from '@/contexts/ToastContext';
import { downloadFile } from '@/lib/api/download';
import { getFile } from '@/lib/api/endpoints';
import { lookUp } from '@/lib/api/not-found';
import { parseNullableNumber } from '@/lib/api/nullable-number';
import { isServiceError } from '@/lib/api/service-error';
import {
  fileStatusTone,
  formatCount,
  importTracePath,
  NO_VALUE,
} from '@/lib/files/file-format';
import type { ServiceErrorShape } from '@/types/api';
import type { FileDetailRead } from '@/types/api-generated';

export const FILE_NOT_FOUND = 'File not found';
export const FAILED_FILE_GUIDANCE =
  'Fix the source file or re-import once the Bank of England republishes it.';
export const ORIGINAL_DOWNLOADED =
  'Original file downloaded from the Backup folder.';
const FILE_LIST_PATH = '/file-log';

function text(value: string | undefined): string {
  return value && value.trim() !== '' ? value : NO_VALUE;
}

function present(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The failed-file alert's first line: the exception note when there is one,
 * otherwise "Failed at the {step} step of {stage}." (RateLoad failures carry no
 * note). `null` when the service sent neither a note nor a stage or step.
 */
export function failureLine(detail: FileDetailRead): string | null {
  const note = present(detail.ExceptionNote);
  if (note) return note;
  const step = present(detail.FailedStep);
  const stage = present(detail.Stage);
  if (step && stage) return `Failed at the ${step} step of ${stage}.`;
  if (step) return `Failed at the ${step} step.`;
  if (stage) return `Failed during ${stage}.`;
  return null;
}

/** The key/value grid, in the design's order. */
function detailFields(detail: FileDetailRead): Array<[string, string]> {
  const failedStep: Array<[string, string]> =
    detail.Status === 'Failed'
      ? [['Failed step', text(detail.FailedStep)]]
      : [];
  return [
    ['Staging instance ID', text(detail.Woid)],
    ['Rate load instance ID', text(detail.WorkflowInstanceId)],
    ['Stage', text(detail.Stage)],
    ...failedStep,
    ['Received', text(detail.ReceivedAt)],
    ['Inbox location', text(detail.InboxLocation)],
    ['Record count', formatCount(parseNullableNumber(detail.RecordCount))],
    [
      'Records inserted',
      formatCount(parseNullableNumber(detail.RecordsInserted)),
    ],
    ['Created by', text(detail.CreatedBy)],
  ];
}

function DetailSkeleton() {
  return (
    <Card className="gap-3 p-5">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </Card>
  );
}

/** The requested file does not exist: say so and offer the way back (R16, BR6). */
export function FileNotFound() {
  return (
    <NotFoundMessage
      message={FILE_NOT_FOUND}
      backHref={FILE_LIST_PATH}
      backLabel="Back to the file list"
    />
  );
}

type DownloadState =
  | { status: 'idle' }
  | { status: 'downloading' }
  | { status: 'not-found' }
  | { status: 'error'; error: ServiceErrorShape };

/** "Download original": transient toast on success, specific 404, persistent error with Retry. */
function useOriginalDownload(fileId: number, fileName?: string | null) {
  const { showToast } = useToast();
  const [state, setState] = useState<DownloadState>({ status: 'idle' });

  const download = async () => {
    setState({ status: 'downloading' });
    try {
      // The service sends no Content-Disposition here, so name it after the file.
      await downloadFile(
        `/v1/files/${fileId}/original`,
        undefined,
        fileName ?? undefined,
      );
      setState({ status: 'idle' });
      showToast({ variant: 'success', title: ORIGINAL_DOWNLOADED });
    } catch (error) {
      if (isServiceError(error) && error.status === 404) {
        setState({ status: 'not-found' });
      } else {
        setState({ status: 'error', error: toServiceErrorShape(error) });
      }
    }
  };

  return { state, download };
}

function DownloadFailure({
  state,
  onRetry,
}: {
  state: DownloadState;
  onRetry: () => void;
}) {
  if (state.status === 'not-found') {
    return (
      <Alert className="border-danger-border bg-danger-surface text-danger">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{FILE_NOT_FOUND}</AlertTitle>
      </Alert>
    );
  }
  if (state.status !== 'error') return null;
  return (
    <Alert className="border-danger-border bg-danger-surface text-danger">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>The original file could not be downloaded.</AlertTitle>
      <AlertDescription className="text-danger">
        <p>{state.error.description}</p>
        <p>Choose Retry to try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** One file's audit detail (R12–R15, R21, BR3, BR5). */
function FileDetails({
  detail,
  fileId,
}: {
  detail: FileDetailRead;
  fileId: number;
}) {
  const titleId = useId();
  const { state: downloadState, download } = useOriginalDownload(
    fileId,
    detail.FileName,
  );
  const id = detail.Id ?? fileId;
  const status = text(detail.Status);
  const failed = detail.Status === 'Failed';
  const firstLine = failed ? failureLine(detail) : null;
  // The file's ImportPro (ImportFile) staging run has the file's Woid as its ID
  // (R7, BR3); the WorkflowInstanceId is its RateLoad (LoadYieldCurves) run,
  // present only once RateLoad has picked the file up.
  const woid = present(detail.Woid);
  const rateLoadRunId = present(detail.WorkflowInstanceId);
  // Row-level errors: Failed files only, read with the full Woid (BR3, BR5).
  const [rowLevelErrorsOpen, setRowLevelErrorsOpen] = useState(false);
  const showRowLevelErrorsAction = failed && woid !== null;

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="font-mono text-base font-semibold">
            {text(detail.FileName)}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {`File log entry ${id} · ${status}${detail.IsCurrent === true ? ' · current' : ''}`}
          </p>
        </div>
        {present(detail.Status) && (
          <StatusChip
            tone={fileStatusTone(status)}
            label={status}
            className="shrink-0"
          />
        )}
      </div>

      {failed && (
        <Alert className="border-danger-border bg-danger-surface text-danger">
          <CircleAlert aria-hidden="true" />
          {firstLine && (
            <AlertTitle className="line-clamp-none font-semibold">
              {firstLine}
            </AlertTitle>
          )}
          <AlertDescription className="text-danger">
            <p>{FAILED_FILE_GUIDANCE}</p>
          </AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-[150px_1fr]">
        {detailFields(detail).map(([label, value]) => (
          <div
            key={label}
            className="col-span-2 grid grid-cols-subgrid border-b border-border-subtle py-2 last:border-b-0"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono text-xs break-all">{value}</dd>
          </div>
        ))}
      </dl>

      <DownloadFailure state={downloadState} onRetry={download} />

      <div className="flex flex-wrap gap-2">
        {woid !== null && (
          <Button asChild variant="secondary">
            <Link
              href={workflowMonitorSelectionPath(woid, {
                single: true,
                fileId: id,
              })}
            >
              <Workflow aria-hidden="true" />
              Open staging run
            </Link>
          </Button>
        )}
        {rateLoadRunId !== null && (
          <Button asChild variant="secondary">
            <Link
              href={workflowMonitorSelectionPath(rateLoadRunId, {
                single: true,
                fileId: id,
              })}
            >
              <Workflow aria-hidden="true" />
              Open import run
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={download}
          disabled={downloadState.status === 'downloading'}
        >
          <Download aria-hidden="true" />
          Download original
        </Button>
        {woid !== null && (
          <Button asChild variant="ghost">
            <Link href={importTracePath(woid)}>
              <Route aria-hidden="true" />
              Trace import
            </Link>
          </Button>
        )}
        {showRowLevelErrorsAction && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRowLevelErrorsOpen((open) => !open)}
          >
            <TableProperties aria-hidden="true" />
            {rowLevelErrorsOpen ? HIDE_ROW_LEVEL_ERRORS : VIEW_ROW_LEVEL_ERRORS}
          </Button>
        )}
      </div>

      {showRowLevelErrorsAction && rowLevelErrorsOpen && (
        <RowLevelErrors woid={woid} />
      )}
    </section>
  );
}

/** Loads `GET /v1/files/{Id}` through DataState and shows the file, or "File not found". */
export function FileDetailCard({
  fileId,
  refreshKey,
}: {
  fileId: number;
  /** When this changes (e.g. the file's status in the list), re-read silently. */
  refreshKey?: string | number | null;
}) {
  return (
    <DataState
      load={() => lookUp(() => getFile(fileId))}
      skeleton={<DetailSkeleton />}
      refreshKey={refreshKey}
    >
      {(lookup) =>
        lookup.found ? (
          <FileDetails detail={lookup.value} fileId={fileId} />
        ) : (
          <FileNotFound />
        )
      }
    </DataState>
  );
}
