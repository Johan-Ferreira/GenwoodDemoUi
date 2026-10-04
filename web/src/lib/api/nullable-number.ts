/**
 * Parses the data service's nullable-text numbers (SizeBytes, RecordsInserted,
 * ChangeBp) into a finite number, or `null` as the explicit "no value" state.
 * Never yields NaN, so screens never show "null" or "NaN".
 */
export function parseNullableNumber(
  raw: string | number | null | undefined,
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const text = raw.trim();
  if (text === '') return null;

  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
