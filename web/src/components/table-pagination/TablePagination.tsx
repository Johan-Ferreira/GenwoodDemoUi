'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { PAGE_SIZE_OPTIONS } from './useClientPagination';

export interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  firstItem: number;
  lastItem: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** What the items are, for the range line, e.g. "files". */
  itemLabel?: string;
}

/** "Rows per page" select, the shown range and Previous / Next page buttons. */
export function TablePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  firstItem,
  lastItem,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = 'rows',
}: TablePaginationProps) {
  const sizeId = useId();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Label htmlFor={sizeId} className="font-normal text-muted-foreground">
          Rows per page
        </Label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger id={sizeId} size="sm" className="focus-ring">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="font-mono text-muted-foreground" aria-live="polite">
        {firstItem}–{lastItem} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Previous<span className="sr-only"> page</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next<span className="sr-only"> page</span>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
