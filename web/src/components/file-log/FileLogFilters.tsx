'use client';

import { useId, useState } from 'react';
import { CalendarDays } from 'lucide-react';

import { FilterSelect } from '@/components/filter-select/FilterSelect';
import { IconButton } from '@/components/icon-button/IconButton';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ISO_DATE_MESSAGE,
  isoDateToLocal,
  localToIsoDate,
} from '@/lib/validation/iso-date';
import { CURVE_FAMILIES, FILE_STATUSES } from '@/types/files';

import type { DateFilterField, FileLogFiltersState } from './useFileLogFilters';

interface DateFilterProps {
  label: string;
  /** Accessible name of the button that opens the calendar. */
  calendarButtonLabel: string;
  field: DateFilterField;
  onType: (value: string) => void;
  onCommit: () => void;
  /** Set and apply a date picked from the calendar. */
  onPick: (date: string) => void;
}

/**
 * A YYYY-MM-DD text field applied when committed (blur or Enter), with a
 * calendar button. The calendar (the user's local days, no bounds) opens on
 * the chosen date's month, else today's month; a picked day applies at once.
 */
function DateFilter({
  label,
  calendarButtonLabel,
  field,
  onType,
  onCommit,
  onPick,
}: DateFilterProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);

  const selected =
    isoDateToLocal(field.draft.trim()) ??
    isoDateToLocal(field.applied) ??
    undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <IconButton label={calendarButtonLabel} variant="outline">
              <CalendarDays aria-hidden="true" />
            </IconButton>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto p-0"
            role="dialog"
            aria-label={`${label} calendar`}
          >
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(date: Date | undefined) => {
                if (date) onPick(localToIsoDate(date));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
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
        calendarButtonLabel="Choose received-from date"
        field={state.receivedFrom}
        onType={state.typeReceivedFrom}
        onCommit={state.commitReceivedFrom}
        onPick={state.pickReceivedFrom}
      />
      <DateFilter
        label="Received to"
        calendarButtonLabel="Choose received-to date"
        field={state.receivedTo}
        onType={state.typeReceivedTo}
        onCommit={state.commitReceivedTo}
        onPick={state.pickReceivedTo}
      />
    </div>
  );
}
