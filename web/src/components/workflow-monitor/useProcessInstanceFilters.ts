'use client';

import { useState } from 'react';

import { ALL_OPTION } from '@/components/filter-select/FilterSelect';
import { FINISHED_ON_ERROR_LABEL } from '@/lib/workflow/process-status';
import type { ProcessInstanceListQueryParams } from '@/types/api-generated';

export interface ActiveFilter {
  label: string;
  value: string;
}

/** The service's filter parameters for `GET /v1/process-instances` (paging is separate). */
export type ProcessInstanceFilters = Pick<
  ProcessInstanceListQueryParams,
  'Status' | 'ProcessName'
>;

/**
 * Process-instance filter state: a Status select and a Process name select;
 * their "All ..." option omits the parameter. Status "Finished (Error)" asks the
 * service for `Status=Finished` and sets `finishedOnErrorOnly`, so the list
 * narrows (and pages) the result on the page.
 */
export function useProcessInstanceFilters() {
  const [status, setStatus] = useState<string>(ALL_OPTION);
  const [processName, setProcessName] = useState<string>(ALL_OPTION);

  const finishedOnErrorOnly = status === FINISHED_ON_ERROR_LABEL;
  const filters: ProcessInstanceFilters = {};
  if (finishedOnErrorOnly) filters.Status = 'Finished';
  else if (status !== ALL_OPTION) filters.Status = status;
  if (processName !== ALL_OPTION) filters.ProcessName = processName;

  const activeFilters: ActiveFilter[] = [];
  if (status !== ALL_OPTION) {
    activeFilters.push({ label: 'Status', value: status });
  }
  if (filters.ProcessName) {
    activeFilters.push({ label: 'Process name', value: filters.ProcessName });
  }

  return {
    status,
    processName,
    filters,
    /** True for "Finished (Error)": keep only Finished runs whose last activity is Error. */
    finishedOnErrorOnly,
    /** Stable identity of the applied filters; changes only when the request would. */
    filtersKey: JSON.stringify({ ...filters, finishedOnErrorOnly }),
    activeFilters,
    setStatus,
    setProcessName,
    clearAll: () => {
      setStatus(ALL_OPTION);
      setProcessName(ALL_OPTION);
    },
  };
}

export type ProcessInstanceFiltersState = ReturnType<
  typeof useProcessInstanceFilters
>;
