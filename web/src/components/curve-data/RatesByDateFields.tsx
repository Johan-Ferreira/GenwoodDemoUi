'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TENOR_LIST_MESSAGE } from '@/lib/curves/rate-matrix';
import type { AvailabilityRead } from '@/types/api-generated';

import type { CommittedField, RatesByDateInputs } from './useRatesByDateInputs';
import { ValuationDateField } from './ValuationDateField';

interface CommittedTextFieldProps<T> {
  label: string;
  field: CommittedField<T>;
  placeholder: string;
  /** Shown under the field while it is invalid. */
  message: string;
  /** Always-on hint under the field. */
  description?: string;
  className?: string;
}

/** A labelled text input applied on blur or Enter, with an inline message. */
function CommittedTextField<T>({
  label,
  field,
  placeholder,
  message,
  description,
  className,
}: CommittedTextFieldProps<T>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [description ? hintId : null, field.invalid ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        className={cn('focus-ring font-mono', className)}
        value={field.draft}
        aria-invalid={field.invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => field.type(event.target.value)}
        onBlur={field.commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') field.commit();
        }}
      />
      {description && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {field.invalid && (
        <p id={errorId} className="text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

/** Accessible name of the "From" field's calendar button. */
export const OPEN_FROM_CALENDAR = 'Choose from date';
/** Accessible name of the "To" field's calendar button. */
export const OPEN_TO_CALENDAR = 'Choose to date';

interface RatesByDateFieldsProps {
  inputs: RatesByDateInputs;
  /** The curve's dates with data: bounds and marks the From / To calendars. */
  availability: AvailabilityRead;
  /** The key tenors used while Tenors is empty. */
  keyTenors: readonly string[];
}

/**
 * The By date view's "From", "To" and "Tenors" fields. From and To are typed
 * YYYY-MM-DD dates with a calendar each (as the Valuation date: bounded by and
 * marking the curve's dates with data); a picked date applies like a typed one.
 */
export function RatesByDateFields({
  inputs,
  availability,
  keyTenors,
}: RatesByDateFieldsProps) {
  return (
    <>
      <ValuationDateField
        availability={availability}
        label="From"
        calendarButtonLabel={OPEN_FROM_CALENDAR}
        calendarLabel="From date calendar"
        showRange={false}
        draft={inputs.from.draft}
        applied={inputs.from.applied}
        invalid={inputs.from.invalid}
        onType={inputs.from.type}
        onCommit={inputs.from.commit}
        onPick={inputs.from.pick}
      />
      <ValuationDateField
        availability={availability}
        label="To"
        calendarButtonLabel={OPEN_TO_CALENDAR}
        calendarLabel="To date calendar"
        showRange={false}
        draft={inputs.to.draft}
        applied={inputs.to.applied}
        invalid={inputs.to.invalid}
        onType={inputs.to.type}
        onCommit={inputs.to.commit}
        onPick={inputs.to.pick}
      />
      <CommittedTextField
        label="Tenors"
        field={inputs.tenors}
        placeholder="1Y,5Y,10Y"
        message={TENOR_LIST_MESSAGE}
        description={`Comma-separated. Empty shows the key tenors (${keyTenors.join(', ')}).`}
        className="w-56"
      />
    </>
  );
}
