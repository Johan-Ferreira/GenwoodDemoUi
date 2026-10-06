'use client';

import { FilterSelect } from '@/components/filter-select/FilterSelect';
import { PROCESS_NAMES } from '@/lib/workflow/process-instances';
import { PROCESS_STATUS_FILTER_OPTIONS } from '@/lib/workflow/process-status';

import type { ProcessInstanceFiltersState } from './useProcessInstanceFilters';

/** Status and Process name selects for the process instances (R1). */
export function ProcessInstanceFilters({
  state,
}: {
  state: ProcessInstanceFiltersState;
}) {
  return (
    <div
      role="group"
      aria-label="Filter process instances"
      className="flex flex-wrap items-start gap-4"
    >
      <FilterSelect
        label="Status"
        value={state.status}
        allLabel="All statuses"
        options={PROCESS_STATUS_FILTER_OPTIONS}
        onChange={state.setStatus}
      />
      <FilterSelect
        label="Process name"
        value={state.processName}
        allLabel="All processes"
        options={PROCESS_NAMES}
        onChange={state.setProcessName}
      />
    </div>
  );
}
