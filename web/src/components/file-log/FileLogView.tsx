'use client';

import { useMemo, useState } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { FileTable } from '@/components/files/FileTable';
import { TablePagination } from '@/components/table-pagination/TablePagination';
import { useClientPagination } from '@/components/table-pagination/useClientPagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllFiles } from '@/lib/api/files';
import {
  sortFileRows,
  type FileSort,
  type FileSortKey,
} from '@/lib/files/file-sort';
import { nextSort } from '@/lib/utils/sort';
import type { FileRow } from '@/types/files';

import { FileLogFilters } from './FileLogFilters';
import { useFileLogFilters, type ActiveFilter } from './useFileLogFilters';

const EMPTY_MESSAGE = 'No files have been received yet.';
const NO_MATCHES_MESSAGE = 'No files match these filters.';
const SOURCE_NOTE =
  'Source: Bank of England yield curves, picked up from the Inbox folder.';

function FileLogSkeleton() {
  return (
    <Card className="gap-3 p-4">
      <Skeleton className="h-6 w-full" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </Card>
  );
}

/** Filters matched nothing: name the active filters and offer Clear all (R11). */
function NoMatchingFiles({
  activeFilters,
  onClearAll,
}: {
  activeFilters: readonly ActiveFilter[];
  onClearAll: () => void;
}) {
  return (
    <Card className="items-start gap-3 p-6">
      <p className="font-medium">{NO_MATCHES_MESSAGE}</p>
      <ul aria-label="Active filters" className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <li
            key={filter.label}
            className="rounded-full border bg-muted px-2.5 py-0.5 text-muted-foreground"
          >
            {filter.label}: {filter.value}
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
        Clear all
      </Button>
    </Card>
  );
}

/** The loaded list: a flush table card with sorting, paging and the source note. */
function FileLogTableCard({
  files,
  sort,
  onSortChange,
}: {
  files: readonly FileRow[];
  sort: FileSort | null;
  onSortChange: (key: FileSortKey) => void;
}) {
  const sorted = useMemo(() => sortFileRows(files, sort), [files, sort]);
  const pagination = useClientPagination(sorted);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <FileTable
        rows={pagination.pageItems}
        sort={sort}
        onSortChange={onSortChange}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted px-3 py-2.5">
        <p className="text-muted-foreground">{SOURCE_NOTE}</p>
        <TablePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          firstItem={pagination.firstItem}
          lastItem={pagination.lastItem}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="files"
        />
      </div>
    </Card>
  );
}

/**
 * Every received file matching the filters, loaded once per filter change
 * (newest first), then sorted and paged in the browser over the whole list.
 */
export function FileLogView() {
  const filterState = useFileLogFilters();
  const { filters, filtersKey, activeFilters, clearAll } = filterState;
  const hasFilters = activeFilters.length > 0;
  const [sort, setSort] = useState<FileSort | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <FileLogFilters state={filterState} />
      {/* Keyed by the applied filters: a change reloads and returns to page 1. */}
      <DataState
        key={filtersKey}
        load={() => getAllFiles(filters)}
        skeleton={<FileLogSkeleton />}
        isEmpty={hasFilters ? undefined : (files) => files.length === 0}
        empty={EMPTY_MESSAGE}
      >
        {(files) =>
          files.length === 0 ? (
            <NoMatchingFiles
              activeFilters={activeFilters}
              onClearAll={clearAll}
            />
          ) : (
            <FileLogTableCard
              files={files}
              sort={sort}
              onSortChange={(key) =>
                setSort((current) => nextSort(current, key))
              }
            />
          )
        }
      </DataState>
    </div>
  );
}
