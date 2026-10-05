'use client';

import { useCallback, useState } from 'react';

import { isIsoDate } from '@/lib/validation/iso-date';
import type { AvailabilityRead } from '@/types/api-generated';

export interface ValuationDateState {
  /** The text as typed. */
  draft: string;
  /** The last valid date applied (rates are read for it); null when none yet. */
  applied: string | null;
  /** True when the last committed text was not a YYYY-MM-DD date. */
  invalid: boolean;
  type: (value: string) => void;
  commit: () => void;
  /** Set and apply a YYYY-MM-DD date at once (a pick from the calendar). */
  pick: (date: string) => void;
}

export interface DateFieldOptions {
  /** An empty field is allowed and applies "no date" (null) rather than an error. */
  optional?: boolean;
}

/**
 * A typed date field starting at `initial`: applied on commit (blur / Enter)
 * when it is a real YYYY-MM-DD date (or, when `optional`, empty). A date
 * picked from the calendar applies straight away.
 */
export function useDateField(
  initial: string,
  { optional = false }: DateFieldOptions = {},
): ValuationDateState {
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState<string | null>(
    isIsoDate(initial) ? initial : null,
  );
  const [invalid, setInvalid] = useState(false);

  const apply = useCallback(
    (value: string) => {
      const date = value.trim();
      if (optional && date === '') {
        setInvalid(false);
        setApplied(null);
        return;
      }
      if (!isIsoDate(date)) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      setApplied(date);
    },
    [optional],
  );

  const type = useCallback((value: string) => setDraft(value), []);

  const commit = useCallback(() => apply(draft), [apply, draft]);

  const pick = useCallback(
    (date: string) => {
      setDraft(date);
      apply(date);
    },
    [apply],
  );

  return { draft, applied, invalid, type, commit, pick };
}

/**
 * The valuation date for one curve: starts at the latest date with data
 * (`MaxDate`); see `useDateField`.
 */
export function useValuationDate(
  availability: AvailabilityRead,
): ValuationDateState {
  return useDateField(availability.MaxDate ?? '');
}
