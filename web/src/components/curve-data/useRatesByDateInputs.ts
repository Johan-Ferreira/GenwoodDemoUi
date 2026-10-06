'use client';

import { useCallback, useState } from 'react';

import { parseTenorList } from '@/lib/curves/rate-matrix';
import { isIsoDate } from '@/lib/validation/iso-date';
import type { AvailabilityRead } from '@/types/api-generated';

/** A text field applied on commit (blur / Enter) when its text parses. */
export interface CommittedField<T> {
  /** The text as typed. */
  draft: string;
  /** The last valid value applied. */
  applied: T;
  /** True when the last committed text did not parse. */
  invalid: boolean;
  type: (value: string) => void;
  commit: () => void;
  /** Set the text and apply it at once, exactly as typing it and committing. */
  pick: (text: string) => void;
}

function useCommittedField<T>(
  initialText: string,
  initialValue: T,
  parse: (text: string) => T | null,
): CommittedField<T> {
  const [draft, setDraft] = useState(initialText);
  const [applied, setApplied] = useState<T>(initialValue);
  const [invalid, setInvalid] = useState(false);

  const apply = useCallback(
    (text: string) => {
      const value = parse(text);
      if (value === null) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      setApplied(value);
    },
    [parse],
  );

  const commit = useCallback(() => apply(draft), [apply, draft]);

  const pick = useCallback(
    (text: string) => {
      setDraft(text);
      apply(text);
    },
    [apply],
  );

  return { draft, applied, invalid, type: setDraft, commit, pick };
}

function parseDate(text: string): string | null {
  const date = text.trim();
  return isIsoDate(date) ? date : null;
}

/** An available-range bound as a valid date, or null (no bound) when absent. */
function initialBound(value: string | undefined): string | null {
  return value && isIsoDate(value) ? value : null;
}

export interface RatesByDateInputs {
  from: CommittedField<string | null>;
  to: CommittedField<string | null>;
  /** Applied tenor labels; `[]` means none entered (use the key tenors). */
  tenors: CommittedField<string[]>;
}

/**
 * The By date view's inputs for one curve: From / To start at the curve's
 * available range (MinDate / MaxDate) and Tenors starts empty (key tenors).
 * Each applies on commit only when valid, so an invalid entry never reaches
 * the service.
 */
export function useRatesByDateInputs(
  availability: AvailabilityRead,
): RatesByDateInputs {
  const from = useCommittedField<string | null>(
    availability.MinDate ?? '',
    initialBound(availability.MinDate),
    parseDate,
  );
  const to = useCommittedField<string | null>(
    availability.MaxDate ?? '',
    initialBound(availability.MaxDate),
    parseDate,
  );
  const tenors = useCommittedField<string[]>('', [], parseTenorList);
  return { from, to, tenors };
}
