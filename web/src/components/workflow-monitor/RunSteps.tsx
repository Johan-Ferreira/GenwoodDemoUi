import { useId } from 'react';

import { StatusChip } from '@/components/status-chip/StatusChip';
import type { StatusTone } from '@/components/status-chip/StatusChip';
import { NO_VALUE } from '@/lib/files/file-format';
import {
  displayRunSteps,
  runStatusDisplay,
  stagingExceptionNote,
} from '@/lib/workflow/process-status';
import type {
  FileDetailRead,
  ProcessInstanceDetailRead,
} from '@/types/api-generated';

const CARD_CLASS =
  'flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm';

const TILE_TONE_CLASS: Record<StatusTone, string> = {
  success: 'border-success-border bg-success-surface text-success',
  danger: 'border-danger-border bg-danger-surface text-danger',
  info: 'border-info-border bg-info-surface text-info',
  warning: 'border-warning-border bg-warning-surface text-warning',
  neutral: 'border-border bg-muted text-foreground',
};

function text(value: string | undefined): string {
  return value !== undefined && value.trim() !== '' ? value : NO_VALUE;
}

/**
 * The steps card (R2, R3, BR1): titled by the process name, subtitle
 * "{id} · {status chip} · {file name}", one tile per shown step
 * (displayRunSteps: real order, stopping where the run stopped).
 */
export function RunSteps({
  instance,
  fileName,
}: {
  instance: ProcessInstanceDetailRead;
  fileName: string | undefined;
}) {
  const titleId = useId();
  const steps = displayRunSteps(instance);
  const status = runStatusDisplay(instance);

  return (
    <section aria-labelledby={titleId} className={CARD_CLASS}>
      <div>
        <h2 id={titleId} className="text-base font-semibold">
          {text(instance.ProcessName)}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs break-all text-muted-foreground">
          <span>{text(instance.ProcessInstanceId)}</span>
          <span aria-hidden="true">·</span>
          {status ? (
            <StatusChip
              tone={status.tone}
              label={status.label}
              className="font-sans"
            />
          ) : (
            <span>{NO_VALUE}</span>
          )}
          <span aria-hidden="true">·</span>
          <span>{text(fileName)}</span>
        </p>
      </div>
      <ol
        aria-label="Steps"
        className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2"
      >
        {steps.map((step, index) => (
          <li
            key={`${index}-${step.name ?? ''}`}
            data-tone={step.tone}
            className={`flex flex-col gap-1 rounded-lg border p-3 ${TILE_TONE_CLASS[step.tone]}`}
          >
            <span className="text-overline font-semibold uppercase tracking-overline">
              {`${index + 1} · ${step.state}`}
            </span>
            <span className="font-semibold break-words">{text(step.name)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The run's audit history (R8, NFR-5): status, every timestamp, last activity,
 * plus the file's exception note when `stagingExceptionNote` returns one (BR4).
 */
export function AuditHistory({
  instance,
  file,
}: {
  instance: ProcessInstanceDetailRead;
  /** The run's resolved import file; undefined when the lookup failed. */
  file?: FileDetailRead;
}) {
  const titleId = useId();
  const status = runStatusDisplay(instance);
  const fields: Array<{
    label: string;
    value: React.ReactNode;
    mono?: boolean;
  }> = [
    {
      label: 'Status',
      value: status ? (
        <StatusChip tone={status.tone} label={status.label} />
      ) : (
        NO_VALUE
      ),
    },
    { label: 'Created', value: text(instance.CreatedAt), mono: true },
    {
      label: 'Last executed',
      value: text(instance.LastExecutedAt),
      mono: true,
    },
    { label: 'Finished', value: text(instance.FinishedAt), mono: true },
    { label: 'Cancelled', value: text(instance.CancelledAt), mono: true },
    { label: 'Faulted', value: text(instance.FaultedAt), mono: true },
    {
      label: 'Last executed activity',
      value: text(instance.LastExecutedActivityName),
    },
  ];
  const exceptionNote = stagingExceptionNote(instance, file);
  if (exceptionNote !== null) {
    fields.push({
      label: 'Exception note',
      value: (
        <span className="whitespace-pre-wrap break-words">{exceptionNote}</span>
      ),
    });
  }

  return (
    <section aria-labelledby={titleId} className={CARD_CLASS}>
      <h2 id={titleId} className="text-base font-semibold">
        Audit history
      </h2>
      <dl className="grid grid-cols-[180px_1fr]">
        {fields.map(({ label, value, mono }) => (
          <div
            key={label}
            className="col-span-2 grid grid-cols-subgrid border-b border-border-subtle py-2 last:border-b-0"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={mono ? 'font-mono text-xs' : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
