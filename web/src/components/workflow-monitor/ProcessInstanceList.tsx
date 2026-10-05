'use client';

import { useId, useMemo, useState } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { TablePagination } from '@/components/table-pagination/TablePagination';
import { DEFAULT_PAGE_SIZE } from '@/components/table-pagination/useClientPagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getProcessInstance, getProcessInstances } from '@/lib/api/endpoints';
import { lookUp } from '@/lib/api/not-found';
import { nextSort } from '@/lib/utils/sort';
import {
  sortProcessInstances,
  type ProcessInstanceSort,
  type ProcessInstanceSortKey,
} from '@/lib/workflow/process-instances';
import type {
  ProcessInstanceRead,
  ProcessInstanceReadList,
} from '@/types/api-generated';

import { ProcessInstanceFilters } from './ProcessInstanceFilters';
import { ProcessInstanceTable } from './ProcessInstanceTable';
import {
  useProcessInstanceFilters,
  type ActiveFilter,
} from './useProcessInstanceFilters';

export const NO_PROCESS_INSTANCES = 'No process instances found.';
const NO_MATCHES_MESSAGE = 'No process instances match these filters.';

function ProcessInstancesSkeleton() {
  return (
    <Card className="gap-3 p-4">
      <Skeleton className="h-6 w-full" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </Card>
  );
}

/** Filters matched nothing: name the active filters and offer Clear all (NFR-6). */
function NoMatchingInstances({
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

interface Paging {
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** The loaded page of runs: a flush "Process instances" card with sorting and paging. */
function ProcessInstancesCard({
  list,
  paging,
  sort,
  onSortChange,
  selectedId,
  onSelect,
}: {
  list: ProcessInstanceReadList;
  paging: Paging;
  sort: ProcessInstanceSort | null;
  onSortChange: (key: ProcessInstanceSortKey) => void;
  selectedId?: string | null;
  onSelect?: (instance: ProcessInstanceRead) => void;
}) {
  const titleId = useId();
  const sorted = useMemo(
    () => sortProcessInstances(list.ProcessInstances ?? [], sort),
    [list, sort],
  );
  const shown = sorted.length;
  const totalItems = list.TotalItems ?? shown;
  const pageCount = Math.max(1, Math.ceil(totalItems / paging.pageSize));
  const firstItem = shown === 0 ? 0 : (paging.page - 1) * paging.pageSize + 1;
  const lastItem = shown === 0 ? 0 : firstItem + shown - 1;

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="gap-0 overflow-hidden py-0"
    >
      <h2 id={titleId} className="border-b px-3 py-2.5 font-semibold">
        Process instances
      </h2>
      <ProcessInstanceTable
        instances={sorted}
        sort={sort}
        onSortChange={onSortChange}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <div className="flex flex-wrap items-center justify-end gap-4 border-t bg-muted px-3 py-2.5">
        <TablePagination
          page={paging.page}
          pageCount={pageCount}
          pageSize={paging.pageSize}
          totalItems={totalItems}
          firstItem={firstItem}
          lastItem={lastItem}
          onPageChange={paging.onPageChange}
          onPageSizeChange={paging.onPageSizeChange}
          itemLabel="process instances"
        />
      </div>
    </Card>
  );
}

/** The selected run as a list row; null when the service has no such run. */
async function loadSingleInstance(
  id: string,
): Promise<ProcessInstanceRead | null> {
  const lookup = await lookUp(() => getProcessInstance(encodeURIComponent(id)));
  if (!lookup.found) return null;
  const row: ProcessInstanceRead & { Steps?: unknown } = { ...lookup.value };
  delete row.Steps;
  return row;
}

/**
 * `view=single`: the "Process instances" card lists only the selected run, with
 * "Show all process instances" to return to the full list (selection kept).
 */
function SingleInstanceCard({
  instanceId,
  onSelect,
  onShowAll,
}: {
  instanceId: string;
  onSelect?: (instance: ProcessInstanceRead) => void;
  onShowAll: () => void;
}) {
  const titleId = useId();
  const [sort, setSort] = useState<ProcessInstanceSort | null>(null);

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="gap-0 overflow-hidden py-0"
    >
      <h2 id={titleId} className="border-b px-3 py-2.5 font-semibold">
        Process instances
      </h2>
      <DataState
        key={instanceId}
        load={() => loadSingleInstance(instanceId)}
        skeleton={<ProcessInstancesSkeleton />}
      >
        {(instance) =>
          instance === null ? (
            <p className="px-3 py-4 text-muted-foreground">
              {NO_PROCESS_INSTANCES}
            </p>
          ) : (
            <ProcessInstanceTable
              instances={[instance]}
              sort={sort}
              onSortChange={(key) =>
                setSort((current) => nextSort(current, key))
              }
              selectedId={instanceId}
              onSelect={onSelect}
            />
          )
        }
      </DataState>
      <div className="flex flex-wrap items-center justify-end gap-4 border-t bg-muted px-3 py-2.5">
        <Button type="button" variant="outline" size="sm" onClick={onShowAll}>
          Show all process instances
        </Button>
      </div>
    </Card>
  );
}

export interface ProcessInstanceListProps {
  /** ID of the selected run, highlighted in the table. */
  selectedId?: string | null;
  /** When given, rows are selectable and report the chosen run. */
  onSelect?: (instance: ProcessInstanceRead) => void;
  /** List only the selected run (`view=single`); needs `selectedId` and `onShowAll`. */
  singleView?: boolean;
  /** Leaves the single-run view, keeping the selection. */
  onShowAll?: () => void;
}

/**
 * Every workflow run (R1): filters and paging are sent to the service as
 * Status / ProcessName / Page / Size; the loaded page shows newest first and
 * sorts in the browser. A filter change returns to page 1. In the single-run
 * view only the selected run is listed.
 */
export function ProcessInstanceList({
  selectedId,
  onSelect,
  singleView = false,
  onShowAll,
}: ProcessInstanceListProps) {
  if (singleView && selectedId && onShowAll) {
    return (
      <SingleInstanceCard
        instanceId={selectedId}
        onSelect={onSelect}
        onShowAll={onShowAll}
      />
    );
  }
  return <AllInstancesList selectedId={selectedId} onSelect={onSelect} />;
}

function AllInstancesList({
  selectedId,
  onSelect,
}: Pick<ProcessInstanceListProps, 'selectedId' | 'onSelect'>) {
  const filterState = useProcessInstanceFilters();
  const { filters, filtersKey, activeFilters, clearAll } = filterState;
  const hasFilters = activeFilters.length > 0;

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  // The page belongs to the filters it was chosen under; new filters start at 1.
  const [paging, setPaging] = useState({ filtersKey, page: 1 });
  const page = paging.filtersKey === filtersKey ? paging.page : 1;

  // Kept across page and filter changes; applies to the loaded page.
  const [sort, setSort] = useState<ProcessInstanceSort | null>(null);

  const query = { ...filters, Page: page, Size: pageSize };

  return (
    <div className="flex flex-col gap-4">
      <ProcessInstanceFilters state={filterState} />
      {/* Keyed by the request: a filter or page change reloads. */}
      <DataState
        key={JSON.stringify(query)}
        load={() => getProcessInstances(query)}
        skeleton={<ProcessInstancesSkeleton />}
        isEmpty={
          hasFilters
            ? undefined
            : (list) => (list.ProcessInstances ?? []).length === 0
        }
        empty={NO_PROCESS_INSTANCES}
      >
        {(list) =>
          (list.ProcessInstances ?? []).length === 0 ? (
            <NoMatchingInstances
              activeFilters={activeFilters}
              onClearAll={clearAll}
            />
          ) : (
            <ProcessInstancesCard
              list={list}
              paging={{
                page,
                pageSize,
                onPageChange: (next) => setPaging({ filtersKey, page: next }),
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setPaging({ filtersKey, page: 1 });
                },
              }}
              sort={sort}
              onSortChange={(key) =>
                setSort((current) => nextSort(current, key))
              }
              selectedId={selectedId}
              onSelect={onSelect}
            />
          )
        }
      </DataState>
    </div>
  );
}
