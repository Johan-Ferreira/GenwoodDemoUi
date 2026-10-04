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
}

/**
 * The valuation date for one curve: starts at the latest date with data and is
 * applied on commit (blur / Enter) when it is a real YYYY-MM-DD date. Picking
 * one of the offered available dates applies it straight away.
 */
export function useValuationDate(
  availability: AvailabilityRead,
): ValuationDateState {
  const initial = availability.MaxDate ?? '';
  const [draft, setDraft] = useState(initial);
  const [applied, setApplied] = useState<string | null>(
    isIsoDate(initial) ? initial : null,
  );
  const [invalid, setInvalid] = useState(false);

  const apply = useCallback((value: string) => {
    const date = value.trim();
    if (!isIsoDate(date)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setApplied(date);
  }, []);

  const type = useCallback(
    (value: string) => {
      setDraft(value);
      // A pick from the available dates (datalist) applies without a blur.
      if (availability.Dates?.includes(value)) apply(value);
    },
    [availability.Dates, apply],
  );

  const commit = useCallback(() => apply(draft), [apply, draft]);

  return { draft, applied, invalid, type, commit };
}
