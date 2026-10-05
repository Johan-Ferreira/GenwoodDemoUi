'use client';

import { useId, useState } from 'react';
import { CalendarDays } from 'lucide-react';

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
  isoDateToUtc,
  OBSERVATION_DATE_MESSAGE,
  utcToIsoDate,
} from '@/lib/validation/iso-date';
import type { AvailabilityRead } from '@/types/api-generated';

/** Accessible name of the button that opens the calendar. */
export const OPEN_VALUATION_CALENDAR = 'Choose valuation date';
/** Accessible name of the calendar dialog. */
export const VALUATION_CALENDAR = 'Valuation date calendar';
/** Suffix on a calendar day's accessible name when it has imported data. */
export const DAY_HAS_DATA = 'data imported';

interface ValuationDateFieldProps {
  availability: AvailabilityRead;
  /** Field label; defaults to "Valuation date". */
  label?: string;
  /** Accessible name of the calendar button; defaults to "Choose valuation date". */
  calendarButtonLabel?: string;
  /** Accessible name of the calendar dialog; defaults to "Valuation date calendar". */
  calendarLabel?: string;
  /** Show the "Dates with data: earliest …, latest …" line (default true). */
  showRange?: boolean;
  /** The text as typed. */
  draft: string;
  /** The last valid date applied; the calendar falls back to it. */
  applied: string | null;
  /** True when the committed text is not a YYYY-MM-DD date. */
  invalid: boolean;
  onType: (value: string) => void;
  /** Apply the typed text (blur or Enter). */
  onCommit: () => void;
  /** Set and apply a date picked from the calendar. */
  onPick: (date: string) => void;
}

function rangeText(availability: AvailabilityRead): string {
  const { MinDate, MaxDate } = availability;
  if (MinDate && MaxDate) {
    return `Dates with data: earliest ${MinDate}, latest ${MaxDate}.`;
  }
  return 'No dates with data yet.';
}

const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Marks a day with data: a dot under the number and a bolder number. */
const HAS_DATA_CLASS =
  "[&>button]:font-semibold after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[''] data-[selected=true]:after:bg-primary-foreground";

/**
 * "Valuation date": a typeable YYYY-MM-DD text input with a calendar button.
 * The calendar (UTC days) is bounded by the curve's earliest and latest dates,
 * marks the dates with imported data, and applies a picked date at once. The
 * description names the earliest and latest dates.
 */
export function ValuationDateField({
  availability,
  label = 'Valuation date',
  calendarButtonLabel = OPEN_VALUATION_CALENDAR,
  calendarLabel = VALUATION_CALENDAR,
  showRange = true,
  draft,
  applied,
  invalid,
  onType,
  onCommit,
  onPick,
}: ValuationDateFieldProps) {
  const id = useId();
  const rangeId = `${id}-range`;
  const errorId = `${id}-error`;
  const [open, setOpen] = useState(false);

  const minDate = isoDateToUtc(availability.MinDate ?? '');
  const maxDate = isoDateToUtc(availability.MaxDate ?? '');
  const dataDates = (availability.Dates ?? [])
    .map(isoDateToUtc)
    .filter((date): date is Date => date !== null);
  const dataDays = new Set(dataDates.map(utcToIsoDate));
  const selected =
    isoDateToUtc(draft.trim()) ?? isoDateToUtc(applied ?? '') ?? undefined;
  const canPick = minDate !== null && maxDate !== null;
  const describedBy =
    [showRange ? rangeId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        <Input
          id={id}
          type="text"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          className="focus-ring w-36 font-mono"
          value={draft}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onType(event.target.value)}
          onBlur={onCommit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onCommit();
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <IconButton
              label={calendarButtonLabel}
              variant="outline"
              disabled={!canPick}
            >
              <CalendarDays aria-hidden="true" />
            </IconButton>
          </PopoverTrigger>
          {canPick && (
            <PopoverContent
              align="start"
              className="w-auto p-0"
              role="dialog"
              aria-label={calendarLabel}
            >
              <Calendar
                mode="single"
                required
                timeZone="UTC"
                selected={selected}
                defaultMonth={selected ?? maxDate}
                startMonth={minDate}
                endMonth={maxDate}
                disabled={[{ before: minDate }, { after: maxDate }]}
                modifiers={{ hasData: dataDates }}
                modifiersClassNames={{ hasData: HAS_DATA_CLASS }}
                labels={{
                  labelDayButton: (date, modifiers) => {
                    const parts = [DAY_LABEL.format(date)];
                    if (dataDays.has(utcToIsoDate(date))) {
                      parts.push(DAY_HAS_DATA);
                    }
                    if (modifiers.selected) parts.push('selected');
                    return parts.join(', ');
                  },
                }}
                onSelect={(date: Date | undefined) => {
                  if (date) onPick(utcToIsoDate(date));
                  setOpen(false);
                }}
              />
              <p className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary"
                />
                Dates with imported data
              </p>
            </PopoverContent>
          )}
        </Popover>
      </div>
      {showRange && (
        <p id={rangeId} className="text-xs text-muted-foreground">
          {rangeText(availability)}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-danger">
          {OBSERVATION_DATE_MESSAGE}
        </p>
      )}
    </div>
  );
}
