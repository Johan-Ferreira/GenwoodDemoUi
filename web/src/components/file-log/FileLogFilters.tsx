'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ISO_DATE_MESSAGE } from '@/lib/validation/iso-date';
import { CURVE_FAMILIES, FILE_STATUSES } from '@/types/files';

import {
  ALL_OPTION,
  type DateFilterField,
  type FileLogFiltersState,
} from './useFileLogFilters';

interface FilterSelectProps {
  label: string;
  value: string;
  allLabel: string;
  options: readonly string[];
  onChange: (value: string) => void;
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  onChange,
}: FilterSelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="focus-ring w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface DateFilterProps {
  label: string;
  field: DateFilterField;
  onType: (value: string) => void;
  onCommit: () => void;
}

/** A YYYY-MM-DD text field applied when committed (blur or Enter). */
function DateFilter({ label, field, onType, onCommit }: DateFilterProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        placeholder="YYYY-MM-DD"
        className="focus-ring w-40 font-mono"
        value={field.draft}
        aria-invalid={field.invalid || undefined}
        aria-describedby={field.invalid ? errorId : undefined}
        onChange={(event) => onType(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onCommit();
        }}
      />
      {field.invalid && (
        <p id={errorId} className="text-danger">
          {ISO_DATE_MESSAGE}
        </p>
      )}
    </div>
  );
}

/** Status, curve family and received-date filters for the file log (R2, R3). */
export function FileLogFilters({ state }: { state: FileLogFiltersState }) {
  return (
    <div
      role="group"
      aria-label="Filter files"
      className="flex flex-wrap items-start gap-4"
    >
      <FilterSelect
        label="Status"
        value={state.status}
        allLabel="All statuses"
        options={FILE_STATUSES}
        onChange={state.setStatus}
      />
      <FilterSelect
        label="Curve family"
        value={state.curveFamily}
        allLabel="All"
        options={CURVE_FAMILIES}
        onChange={state.setCurveFamily}
      />
      <DateFilter
        label="Received from"
        field={state.receivedFrom}
        onType={state.typeReceivedFrom}
        onCommit={state.commitReceivedFrom}
      />
      <DateFilter
        label="Received to"
        field={state.receivedTo}
        onType={state.typeReceivedTo}
        onCommit={state.commitReceivedTo}
      />
    </div>
  );
}
