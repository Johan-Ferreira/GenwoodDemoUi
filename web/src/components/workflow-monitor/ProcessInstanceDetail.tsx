'use client';

import { DataState } from '@/components/data-state/DataState';
import { NotFoundMessage } from '@/components/data-state/NotFoundMessage';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getImport,
  getProcessInstance,
  getProcessInstanceExecutionLogs,
} from '@/lib/api/endpoints';
import { lookUp, type Lookup } from '@/lib/api/not-found';
import { WORKFLOW_MONITOR_PATH } from '@/lib/navigation/nav-items';
import type {
  ExecutionLogRead,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

import { ExecutionLogCard } from './ExecutionLogCard';
import { OpenFileLogEntry } from './OpenFileLogEntry';
import { AuditHistory, RunSteps } from './RunSteps';

export const PROCESS_INSTANCE_NOT_FOUND = 'Process instance not found';

/** Everything the selected-run view shows, loaded together. */
export interface RunDetail {
  instance: ProcessInstanceDetailRead;
  logs: ExecutionLogRead[];
  /**
   * The run's import (`/v1/imports/{ProcessInstanceId}` — an ImportFile run's ID
   * is its file's Woid); null when it cannot be resolved (e.g. LoadYieldCurves).
   */
  trace: ImportRead | null;
}

/**
 * The run's import, or null when it cannot be resolved. Any failure here (404
 * or otherwise) only drops the file name and file route; it never hides the run.
 */
async function loadTrace(woid: string | undefined): Promise<ImportRead | null> {
  if (woid === undefined || woid.trim() === '') return null;
  try {
    return await getImport(encodeURIComponent(woid));
  } catch {
    return null;
  }
}

/**
 * The run, its log and its import. A 404 on the run is "not found" (R6); any
 * other failure of the run or its log is the persistent error with Retry. An
 * unresolvable import (any failure) only leaves the file name and file route absent.
 */
async function loadRunDetail(id: string): Promise<Lookup<RunDetail>> {
  const encoded = encodeURIComponent(id);
  const lookup = await lookUp(() => getProcessInstance(encoded));
  if (!lookup.found) return lookup;
  const instance = lookup.value;
  const [logList, trace] = await Promise.all([
    getProcessInstanceExecutionLogs(encoded),
    loadTrace(instance.ProcessInstanceId ?? id),
  ]);
  return {
    found: true,
    value: { instance, logs: logList.ExecutionLogs ?? [], trace },
  };
}

function RunDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-3 p-5">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </Card>
      <Card className="gap-3 p-5">
        <Skeleton className="h-5 w-1/4" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </Card>
    </div>
  );
}

/** The selected run: steps card, audit history and execution log. */
function RunDetailView({ run }: { run: RunDetail }) {
  const fileId = run.trace?.File?.Id ?? null;
  return (
    <div className="flex flex-col gap-4">
      <RunSteps instance={run.instance} fileName={run.trace?.File?.FileName} />
      <AuditHistory instance={run.instance} />
      <ExecutionLogCard logs={run.logs} fileId={fileId} />
      <OpenFileLogEntry
        instanceId={run.instance.ProcessInstanceId}
        fileId={fileId}
      />
    </div>
  );
}

/** Loads the selected run through DataState (NFR-2, NFR-3); 404 → "Process instance not found". */
export function ProcessInstanceDetail({ instanceId }: { instanceId: string }) {
  return (
    <DataState
      load={() => loadRunDetail(instanceId)}
      skeleton={<RunDetailSkeleton />}
    >
      {(lookup) =>
        lookup.found ? (
          <RunDetailView run={lookup.value} />
        ) : (
          <NotFoundMessage
            message={PROCESS_INSTANCE_NOT_FOUND}
            backHref={WORKFLOW_MONITOR_PATH}
            backLabel="Back to the process instance list"
          />
        )
      }
    </DataState>
  );
}
