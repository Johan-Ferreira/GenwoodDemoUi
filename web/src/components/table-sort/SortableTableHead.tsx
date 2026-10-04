import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortState } from '@/lib/utils/sort';

export interface SortableTableHeadProps<K extends string> {
  /** Visible column name; also the header's accessible name. */
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onSortChange: (key: K) => void;
  className?: string;
}

/**
 * A column header whose label is a button. The active column carries
 * `aria-sort` and an arrow showing the direction; other columns show a
 * neutral arrow and no `aria-sort`.
 */
export function SortableTableHead<K extends string>({
  label,
  sortKey,
  sort,
  onSortChange,
  className,
}: SortableTableHeadProps<K>) {
  const direction = sort?.key === sortKey ? sort.direction : undefined;
  const Icon =
    direction === 'ascending'
      ? ArrowUp
      : direction === 'descending'
        ? ArrowDown
        : ArrowUpDown;

  return (
    <TableHead aria-sort={direction} className={className}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSortChange(sortKey)}
        className={cn(
          '-mx-1.5 h-7 gap-1 px-1.5 text-overline font-semibold tracking-wide uppercase hover:bg-transparent hover:text-foreground',
          direction ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn('size-3.5', !direction && 'opacity-50')}
        />
      </Button>
    </TableHead>
  );
}
