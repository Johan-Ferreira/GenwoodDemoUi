'use client';

import { useId } from 'react';

import { FilterSelect } from '@/components/filter-select/FilterSelect';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PROCESS_STATUSES } from '@/lib/workflow/process-status';

import type { ProcessInstanceFiltersState } from './useProcessInstanceFilters';

/** Status select and free-text process name filter for the process instances (R1). */
export function ProcessInstanceFilters({
  state,
}: {
  state: ProcessInstanceFiltersState;
}) {
  const nameId = useId();
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
        options={PROCESS_STATUSES}
        onChange={state.setStatus}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Process name</Label>
        <Input
          id={nameId}
          type="text"
          autoComplete="off"
          className="focus-ring w-56"
          value={state.processNameDraft}
          onChange={(event) => state.typeProcessName(event.target.value)}
          onBlur={state.commitProcessName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') state.commitProcessName();
          }}
        />
      </div>
    </div>
  );
}
