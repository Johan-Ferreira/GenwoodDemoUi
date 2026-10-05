'use client';

import { useState } from 'react';

import { ALL_OPTION } from '@/components/filter-select/FilterSelect';
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
 * their "All ..." option omits the parameter.
 */
export function useProcessInstanceFilters() {
  const [status, setStatus] = useState<string>(ALL_OPTION);
  const [processName, setProcessName] = useState<string>(ALL_OPTION);

  const filters: ProcessInstanceFilters = {};
  if (status !== ALL_OPTION) filters.Status = status;
  if (processName !== ALL_OPTION) filters.ProcessName = processName;

  const activeFilters: ActiveFilter[] = [];
  if (filters.Status) {
    activeFilters.push({ label: 'Status', value: filters.Status });
  }
  if (filters.ProcessName) {
    activeFilters.push({ label: 'Process name', value: filters.ProcessName });
  }

  return {
    status,
    processName,
    filters,
    /** Stable identity of the applied filters; changes only when the request would. */
    filtersKey: JSON.stringify(filters),
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
