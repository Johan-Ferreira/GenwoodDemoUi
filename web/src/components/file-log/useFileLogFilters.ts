'use client';

import { useState } from 'react';

import { ALL_OPTION } from '@/components/filter-select/FilterSelect';
import type { FileFilters } from '@/lib/api/files';
import { isIsoDate } from '@/lib/validation/iso-date';

export { ALL_OPTION };

/** A received-date field: what is typed, what is applied, and whether the entry is invalid. */
export interface DateFilterField {
  draft: string;
  applied: string;
  invalid: boolean;
}

export interface ActiveFilter {
  label: string;
  value: string;
}

const EMPTY_DATE: DateFilterField = { draft: '', applied: '', invalid: false };

/**
 * Applies the typed date: empty clears the filter, a YYYY-MM-DD date is
 * applied, anything else is flagged invalid and the applied value is kept
 * (so the list is not refiltered — R3).
 */
function commitDate(field: DateFilterField): DateFilterField {
  const value = field.draft.trim();
  if (value === '') return EMPTY_DATE;
  if (isIsoDate(value)) return { draft: value, applied: value, invalid: false };
  return { ...field, invalid: true };
}

/** File-log filter state: status, curve family and the received-date range. */
export function useFileLogFilters() {
  const [status, setStatus] = useState<string>(ALL_OPTION);
  const [curveFamily, setCurveFamily] = useState<string>(ALL_OPTION);
  const [receivedFrom, setReceivedFrom] = useState<DateFilterField>(EMPTY_DATE);
  const [receivedTo, setReceivedTo] = useState<DateFilterField>(EMPTY_DATE);

  // Sent as the service's query parameters (BR1); "All" omits the parameter.
  const filters: FileFilters = {};
  if (status !== ALL_OPTION) filters.Status = status;
  if (curveFamily !== ALL_OPTION) filters.CurveFamily = curveFamily;
  if (receivedFrom.applied) filters.ReceivedFrom = receivedFrom.applied;
  if (receivedTo.applied) filters.ReceivedTo = receivedTo.applied;

  const activeFilters: ActiveFilter[] = [];
  if (filters.Status) {
    activeFilters.push({ label: 'Status', value: filters.Status });
  }
  if (filters.CurveFamily) {
    activeFilters.push({ label: 'Curve family', value: filters.CurveFamily });
  }
  if (filters.ReceivedFrom) {
    activeFilters.push({ label: 'Received from', value: filters.ReceivedFrom });
  }
  if (filters.ReceivedTo) {
    activeFilters.push({ label: 'Received to', value: filters.ReceivedTo });
  }

  return {
    status,
    curveFamily,
    receivedFrom,
    receivedTo,
    filters,
    /** Stable identity of the applied filters; changes only when the request would. */
    filtersKey: JSON.stringify(filters),
    activeFilters,
    setStatus,
    setCurveFamily,
    typeReceivedFrom: (draft: string) =>
      setReceivedFrom((field) => ({ ...field, draft })),
    typeReceivedTo: (draft: string) =>
      setReceivedTo((field) => ({ ...field, draft })),
    commitReceivedFrom: () => setReceivedFrom(commitDate),
    commitReceivedTo: () => setReceivedTo(commitDate),
    /** Set and apply a date picked from the calendar (same as a typed date). */
    pickReceivedFrom: (date: string) =>
      setReceivedFrom(commitDate({ draft: date, applied: '', invalid: false })),
    pickReceivedTo: (date: string) =>
      setReceivedTo(commitDate({ draft: date, applied: '', invalid: false })),
    clearAll: () => {
      setStatus(ALL_OPTION);
      setCurveFamily(ALL_OPTION);
      setReceivedFrom(EMPTY_DATE);
      setReceivedTo(EMPTY_DATE);
    },
  };
}

export type FileLogFiltersState = ReturnType<typeof useFileLogFilters>;
