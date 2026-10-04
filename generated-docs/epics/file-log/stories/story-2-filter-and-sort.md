# Story 2: Filter and sort the file log

**Slug:** story-2-filter-and-sort
**Requirement IDs:** R2, R3, R9, R11, BR1, BR4
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Narrow the file log by status, curve family and a received-date range, and sort any column ascending or descending. When nothing matches, you see which filters are active and can clear them all at once.

## Summary

Adds a filter bar to the File log: status Select ("All statuses", Imported, Failed, Processing), curve family Select (All, Nominal, Real, Inflation, OIS), Received from / Received to text inputs validated as YYYY-MM-DD, sent as the Status, CurveFamily, ReceivedFrom and ReceivedTo query parameters (BR1). An invalid date shows "Enter the date as YYYY-MM-DD." inline and does not send a request. Clicking a column header sorts ascending first, descending second, with an aria-sort indicator. Sorting runs in the browser over the **whole loaded list** (user decision from story 1), and null numbers sort without breaking. Changing filters resets to page 1. No matches shows "No files match these filters.", the active filters and a "Clear all" action. Verify during BUILD whether `ReceivedTo` includes the whole end day.

## Acceptance criteria

- **AC-1** (coverage: playwright): Choosing a status, a curve family, or a received from/to date narrows the list to matching files only and returns to the first page
- **AC-2** (coverage: vitest): A received date not in YYYY-MM-DD form shows "Enter the date as YYYY-MM-DD." and the list is not refiltered
- **AC-3** (coverage: playwright): When the filters match nothing, the list says "No files match these filters.", names the active filters, and "Clear all" restores the full list
- **AC-4** (coverage: vitest): Choosing a column header sorts by that column ascending, choosing it again sorts descending, and the active column and direction are indicated
- **AC-5** (coverage: vitest): Files with a missing size or records inserted stay in the list and sort consistently without breaking the order of the other rows

## Manual test checklist

- Choose Failed in the status filter → only failed files are listed
- Choose a curve family (for example Nominal) → only that family's files are listed
- Type "04/10/2026" into Received from → you see "Enter the date as YYYY-MM-DD." and the list doesn't change
- Enter a Received from date in the future → you see "No files match these filters." with your active filters listed; click Clear all → the full list comes back
- Click the Received column header twice → the list sorts oldest first, then newest first, and the header shows which way it's sorted

## Additional technical checks

Count: 1

## Reuse notes

- Builds on story 1's page, files endpoint module and table. Shadcn `select` / `input` / `label` as needed.
