/** Inline message for a date not entered as YYYY-MM-DD (R3). */
export const ISO_DATE_MESSAGE = 'Enter the date as YYYY-MM-DD.';

/** Inline message for an observation (valuation) date not entered as YYYY-MM-DD. */
export const OBSERVATION_DATE_MESSAGE =
  'Enter the observation date as YYYY-MM-DD.';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * True when `value` is a real calendar date written as YYYY-MM-DD
 * (so "2026-02-30" and "04/10/2026" are both rejected).
 */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The UTC-midnight instant of a YYYY-MM-DD date, or `null` when `value` is not
 * a real YYYY-MM-DD date. UTC throughout, so no local time zone shifts the day.
 */
export function isoDateToUtc(value: string): Date | null {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** The YYYY-MM-DD calendar day of `date` in UTC. */
export function utcToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The local-midnight `Date` of a YYYY-MM-DD date, or `null` when `value` is
 * not a real YYYY-MM-DD date. For calendars that work in the user's own days.
 */
export function isoDateToLocal(value: string): Date | null {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** The YYYY-MM-DD calendar day of `date` in the local time zone. */
export function localToIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
