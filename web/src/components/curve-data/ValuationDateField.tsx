'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OBSERVATION_DATE_MESSAGE } from '@/lib/validation/iso-date';
import type { AvailabilityRead } from '@/types/api-generated';

interface ValuationDateFieldProps {
  availability: AvailabilityRead;
  /** The text as typed. */
  draft: string;
  /** True when the committed text is not a YYYY-MM-DD date. */
  invalid: boolean;
  onType: (value: string) => void;
  /** Apply the typed text (blur or Enter). */
  onCommit: () => void;
}

function rangeText(availability: AvailabilityRead): string {
  const { MinDate, MaxDate } = availability;
  if (MinDate && MaxDate) {
    return `Dates with data: earliest ${MinDate}, latest ${MaxDate}.`;
  }
  return 'No dates with data yet.';
}

/**
 * "Valuation date": a YYYY-MM-DD text input that offers the curve's available
 * dates (datalist) and names the earliest and latest dates in its description.
 */
export function ValuationDateField({
  availability,
  draft,
  invalid,
  onType,
  onCommit,
}: ValuationDateFieldProps) {
  const id = useId();
  const listId = `${id}-dates`;
  const rangeId = `${id}-range`;
  const errorId = `${id}-error`;
  const dates = availability.Dates ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Valuation date</Label>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        placeholder="YYYY-MM-DD"
        className="focus-ring w-44 font-mono"
        // A `list` attribute would otherwise expose the field as a combobox;
        // it is a typed date field whose suggestions are optional.
        role="textbox"
        list={listId}
        value={draft}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${rangeId} ${errorId}` : rangeId}
        onChange={(event) => onType(event.target.value)}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onCommit();
        }}
      />
      <datalist id={listId}>
        {dates.map((date) => (
          <option key={date} value={date} />
        ))}
      </datalist>
      <p id={rangeId} className="text-xs text-muted-foreground">
        {rangeText(availability)}
      </p>
      {invalid && (
        <p id={errorId} className="text-danger">
          {OBSERVATION_DATE_MESSAGE}
        </p>
      )}
    </div>
  );
}
