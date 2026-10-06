'use client';

import { ArrowLeft, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useId } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { NotFoundMessage } from '@/components/data-state/NotFoundMessage';
import {
  StatusChip,
  type StatusTone,
} from '@/components/status-chip/StatusChip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { workflowMonitorSelectionPath } from '@/components/workflow-monitor/useSelectedInstance';
import { getImport } from '@/lib/api/endpoints';
import { lookUp } from '@/lib/api/not-found';
import { fileStatusTone, formatCount, NO_VALUE } from '@/lib/files/file-format';
import { runStatusDisplay } from '@/lib/workflow/process-status';
import type {
  FileDetailRead,
  ImportRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

export const IMPORT_NOT_FOUND = 'Import not found';
/** The rate load section's text when RateLoad has not picked the file up yet. */
export const NOT_STARTED = 'Not started yet';
const FILE_LIST_PATH = '/file-log';

type Field = { label: string; value: React.ReactNode; mono?: boolean };

function text(value: string | undefined): string {
  return value && value.trim() !== '' ? value : NO_VALUE;
}

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

function statusChip(
  status: string | undefined,
  tone: (status: string) => StatusTone,
): React.ReactNode {
  return present(status) ? (
    <StatusChip tone={tone(status)} label={status} />
  ) : (
    NO_VALUE
  );
}

/**
 * A run's status chip, as on the Workflow monitor: a RateLoad run Finished on
 * its Error activity reads "Finished (Error)" in danger.
 */
function runStatusChip(
  instance: ProcessInstanceDetailRead | undefined,
): React.ReactNode {
  const display = instance ? runStatusDisplay(instance) : null;
  return display ? (
    <StatusChip tone={display.tone} label={display.label} />
  ) : (
    NO_VALUE
  );
}

/** A titled section exposed as a named region; `children` follow the field list. */
function TraceSection({
  title,
  fields = [],
  children,
}: {
  title: string;
  fields?: Field[];
  children?: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm"
    >
      <h2 id={titleId} className="text-base font-semibold">
        {title}
      </h2>
      {fields.length > 0 && (
        <dl className="grid grid-cols-[170px_1fr]">
          {fields.map(({ label, value, mono }) => (
            <div
              key={label}
              className="col-span-2 grid grid-cols-subgrid border-b border-border-subtle py-2 last:border-b-0"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={mono ? 'font-mono text-xs break-all' : undefined}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

function fileFields(file: FileDetailRead | undefined): Field[] {
  const failedStep: Field[] =
    file?.Status === 'Failed'
      ? [{ label: 'Failed step', value: text(file.FailedStep) }]
      : [];
  return [
    { label: 'File name', value: text(file?.FileName), mono: true },
    { label: 'Curve family', value: text(file?.CurveFamily) },
    { label: 'Received', value: text(file?.ReceivedAt), mono: true },
    { label: 'Status', value: statusChip(file?.Status, fileStatusTone) },
    { label: 'Stage', value: text(file?.Stage) },
    ...failedStep,
  ];
}

/**
 * One run's section (staging or rate load): its fields and an "Open workflow"
 * link to that run alone, carrying the file Id; "Not started yet" without a run.
 */
function RunSection({
  title,
  instance,
  fileId,
}: {
  title: string;
  instance: ProcessInstanceDetailRead | undefined;
  fileId: number | undefined;
}) {
  if (!instance) {
    return (
      <TraceSection title={title}>
        <p className="text-muted-foreground">{NOT_STARTED}</p>
      </TraceSection>
    );
  }
  const runId = present(instance.ProcessInstanceId)
    ? instance.ProcessInstanceId.trim()
    : null;
  return (
    <TraceSection title={title} fields={workflowFields(instance)}>
      {runId !== null && (
        <Button asChild variant="secondary" className="self-start">
          <Link
            href={workflowMonitorSelectionPath(runId, {
              single: true,
              fileId,
            })}
          >
            <Workflow aria-hidden="true" />
            Open workflow
          </Link>
        </Button>
      )}
    </TraceSection>
  );
}

/** Workflow instance fields; the end timestamps appear only when the service has them. */
function workflowFields(
  instance: ProcessInstanceDetailRead | undefined,
): Field[] {
  const endings: Array<[string, string | undefined]> = [
    ['Finished at', instance?.FinishedAt],
    ['Faulted at', instance?.FaultedAt],
    ['Cancelled at', instance?.CancelledAt],
  ];
  return [
    { label: 'Process', value: text(instance?.ProcessName) },
    {
      label: 'Instance ID',
      value: text(instance?.ProcessInstanceId),
      mono: true,
    },
    { label: 'Status', value: runStatusChip(instance) },
    { label: 'Created', value: text(instance?.CreatedAt), mono: true },
    {
      label: 'Last executed',
      value: text(instance?.LastExecutedAt),
      mono: true,
    },
    ...endings
      .filter((ending): ending is [string, string] => present(ending[1]))
      .map(([label, value]) => ({ label, value, mono: true })),
    {
      label: 'Last activity',
      value: text(instance?.LastExecutedActivityName),
    },
  ];
}

function countFields(trace: ImportRead): Field[] {
  return [
    {
      label: 'Rates',
      value: formatCount(trace.RatesCount ?? null),
      mono: true,
    },
    {
      label: 'Curves',
      value: formatCount(trace.CurvesCount ?? null),
      mono: true,
    },
  ];
}

function TraceSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="gap-3 p-5">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  );
}

/** The loaded trace: file log entry, staging and rate load runs, rates and curves (R17, R18). */
function TraceDetails({ trace }: { trace: ImportRead }) {
  return (
    <div className="flex flex-col gap-5">
      <Link
        href={FILE_LIST_PATH}
        className="focus-ring inline-flex items-center gap-1 self-start rounded-sm text-primary underline underline-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to the file log
      </Link>
      <TraceSection title="File log entry" fields={fileFields(trace.File)} />
      <RunSection
        title="Staging run"
        instance={trace.StagingProcessInstance ?? trace.ProcessInstance}
        fileId={trace.File?.Id}
      />
      <RunSection
        title="Rate load run"
        instance={trace.RateLoadProcessInstance}
        fileId={trace.File?.Id}
      />
      <TraceSection title="Rates and curves" fields={countFields(trace)} />
    </div>
  );
}

/** Loads `GET /v1/imports/{woid}` through DataState; a 404 shows "Import not found" (BR6). */
export function ImportTrace({ woid }: { woid: string }) {
  return (
    <DataState
      load={() => lookUp(() => getImport(encodeURIComponent(woid)))}
      skeleton={<TraceSkeleton />}
    >
      {(lookup) =>
        lookup.found ? (
          <TraceDetails trace={lookup.value} />
        ) : (
          <NotFoundMessage
            message={IMPORT_NOT_FOUND}
            backHref={FILE_LIST_PATH}
            backLabel="Back to the file list"
          />
        )
      }
    </DataState>
  );
}
