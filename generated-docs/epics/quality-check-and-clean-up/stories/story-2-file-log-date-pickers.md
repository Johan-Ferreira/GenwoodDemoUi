# Story 2: Date pickers on the File log received-date filters

**Slug:** story-2-file-log-date-pickers
**Requirement IDs:** R5, BR3, NFR-2, NFR-4, NFR-5
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The "Received from" and "Received to" filters on the File log each get a calendar button. With no date chosen, the calendar opens on the current month. Picking a day filters the list exactly as typing that date did, and typing a date still works.

## Summary

`FileLogFilters.tsx` `DateFilter` gets the same text input plus calendar button pattern as `curve-data/ValuationDateField.tsx`, built from the Popover and Calendar primitives already installed, with no data-date markers and no min/max bounds. The calendar opens on today's month when the field is empty (BR3) and on the chosen date's month otherwise. Picking a day writes YYYY-MM-DD into the field, applies it at once, and closes the calendar. The applied value and request parameter (`ReceivedFrom`/`ReceivedTo`) are the same as a typed date. `useFileLogFilters.ts` gains `pickReceivedFrom`/`pickReceivedTo`. Typed entry, blur/Enter commit, invalid-date message, active-filter chips and Clear all are unchanged (NFR-4). The calendar button has an accessible name ("Choose received-from date" / "Choose received-to date"), the calendar is a labelled dialog, and both are keyboard operable (NFR-2).

## Acceptance criteria

- **AC-1** (coverage: vitest): Opening the "Received from" or "Received to" calendar with no date chosen shows the current month; with a date already chosen it shows that date's month.
- **AC-2** (coverage: playwright): Picking a day in the "Received from" calendar fills the field with that date, closes the calendar, and narrows the file list to files received from that date.
- **AC-3** (coverage: vitest): Typing a date and pressing Enter still filters the list, and an invalid typed date still shows the existing date message without refiltering.
- **AC-4** (coverage: playwright): Each calendar button has a clear name and the calendar can be opened, navigated and used to pick a day with the keyboard alone.

## Manual test checklist

- On the File log, click the calendar button next to Received from → a calendar opens on this month
- Pick a day → the field shows that date, the calendar closes, and the list shows only files received from that day
- Open the Received to calendar after choosing a date there → it opens on the chosen date's month
- Type a date into Received to and press Enter → the list filters as before
- Using only the keyboard, Tab to a calendar button, press Enter, move with the arrow keys and press Enter → the date is chosen

## Additional technical checks

1 technical check verified automatically.
