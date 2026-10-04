'use client';

import { useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { TENOR_LIST_MESSAGE } from '@/lib/curves/rate-matrix';
import { OBSERVATION_DATE_MESSAGE } from '@/lib/validation/iso-date';

import type { CommittedField, RatesByDateInputs } from './useRatesByDateInputs';

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

interface RatesByDateFieldsProps {
  inputs: RatesByDateInputs;
  /** The key tenors used while Tenors is empty. */
  keyTenors: readonly string[];
}

/** The By date view's "From", "To" and "Tenors" fields. */
export function RatesByDateFields({
  inputs,
  keyTenors,
}: RatesByDateFieldsProps) {
  return (
    <>
      <CommittedTextField
        label="From"
        field={inputs.from}
        placeholder="YYYY-MM-DD"
        message={OBSERVATION_DATE_MESSAGE}
        className="w-36"
      />
      <CommittedTextField
        label="To"
        field={inputs.to}
        placeholder="YYYY-MM-DD"
        message={OBSERVATION_DATE_MESSAGE}
        className="w-36"
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
