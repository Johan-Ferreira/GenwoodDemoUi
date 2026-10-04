import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success-surface text-success border-success-border',
  warning: 'bg-warning-surface text-warning border-warning-border',
  danger: 'bg-danger-surface text-danger border-danger-border',
  info: 'bg-info-surface text-info border-info-border',
  neutral: 'bg-neutral-surface text-neutral border-neutral-border',
};

export interface StatusChipProps {
  tone: StatusTone;
  /** Always shown, so colour is never the only cue (R11). */
  label: string;
  className?: string;
}

/** A pill status label tinted by intent; the text label is always present. */
export function StatusChip({ tone, label, className }: StatusChipProps) {
  return (
    <Badge
      variant="outline"
      data-tone={tone}
      className={cn(TONE_CLASSES[tone], className)}
    >
      {label}
    </Badge>
  );
}
