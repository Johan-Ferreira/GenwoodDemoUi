import { useId, type ReactNode } from 'react';

import type { StatusTone } from '@/components/status-chip/StatusChip';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONE_TEXT: Record<StatusTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-neutral',
};

export interface StatCardProps {
  /** The card label; also the group's accessible name. */
  label: string;
  /** The headline value (rendered in the mono face), or plain text such as "No data". */
  value: ReactNode;
  /** Optional unit after the value, e.g. "%". */
  unit?: string;
  /** Optional detail line under the value; `tone` colours it (text always carries the meaning). */
  detail?: { text: string; tone?: StatusTone };
  /** True when `value` is a number/date (mono, tabular figures). */
  numeric?: boolean;
}

/** A labelled stat card: label, value (+ unit) and an optional toned detail line. */
export function StatCard({
  label,
  value,
  unit,
  detail,
  numeric = true,
}: StatCardProps) {
  const labelId = useId();
  return (
    <Card
      role="group"
      aria-labelledby={labelId}
      className="gap-1 px-5 py-4 shadow-xs"
    >
      <p id={labelId} className="text-sm text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'text-stat-value font-medium',
          numeric ? 'font-mono text-brand' : 'text-foreground',
        )}
      >
        {value}
        {unit && <span className="ml-0.5 text-base">{unit}</span>}
      </p>
      {detail && (
        <p
          data-tone={detail.tone ?? 'neutral'}
          className={cn('text-xs', TONE_TEXT[detail.tone ?? 'neutral'])}
        >
          {detail.text}
        </p>
      )}
    </Card>
  );
}
