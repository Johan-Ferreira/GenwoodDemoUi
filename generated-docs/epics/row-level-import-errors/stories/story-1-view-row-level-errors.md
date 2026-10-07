# Story 1: View a failed file's row-level errors

**Slug:** story-1-view-row-level-errors
**Requirement IDs:** R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, BR1, BR2, BR3, BR4, BR5, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

In the File log details of a Failed file, choose "View row-level errors" to see each source row that failed, with its row number, observation date and the reason it failed. You can sort by any column, and download the original file from the same place to find each row.

## Summary

Adds a "View row-level errors" action to the file detail card. It is shown only when Status is Failed, sits next to Download original and Trace import, and opens a client-sorted grid loaded from GET /v1/imports/{Woid}/messages (ImportMessageGetList) using the file's full Woid. The grid has the columns SourceRowNumber, ObservationDate and Message. It starts sorted by row number ascending, shows a placeholder for a missing date, and has helper text on row-number semantics. Loading, empty, 404 and other failures go through the existing DataState, lookUp and NotFoundMessage patterns. Download original and a way back to the file's details stay one click away.

Changes land in `web/src/components/file-log/FileDetailCard.tsx` plus a new `web/src/components/file-log/RowLevelErrors.tsx`.

**Resolved design choice (placement):** inline in the file details. The grid opens as a section inside the file's details card, below the action buttons, with Download original right beside it and a "Hide row-level errors" control to close it.

## Reuse notes

- Add the action in `FileDetailCard.tsx`. The `failed` flag and the trimmed `woid` (full value, BR3) are already worked out there, and Download original (`useOriginalDownload`) is in the same card, which covers R6.
- Use the `DataState` + `lookUp(...)` + `NotFoundMessage` pattern from `ImportTrace.tsx` for loading, 404, and error with Retry. Reuse the `IMPORT_NOT_FOUND` copy and the "Back to the file list" link.
- Sortable headers: `web/src/components/table-sort/SortableTableHead.tsx` and `web/src/lib/utils/sort.ts` (`SortState`). Follow `web/src/lib/files/file-sort.ts` for a nulls-safe comparator.
- Use `NO_VALUE` from `web/src/lib/files/file-format.ts` as the missing observation-date placeholder.
- Add `getImportMessages(woid)` to `web/src/lib/api/endpoints.ts` through the API client, encoding the WOID with `encodeURIComponent` as `getImport` does.
- `ImportMessageGetList` / `ImportMessageReadList` are in `documentation/CurveData.yaml` but missing from `web/src/types/api-generated` and the canonical `generated-docs/specs` spec. Regenerate both before implementing.

## Acceptance criteria

- **AC-1** (coverage: vitest): The details of a Failed file show a "View row-level errors" action next to Download original and Trace import. Files with Imported or any other status do not show it, even when they have a WOID.
- **AC-2** (coverage: playwright): Choosing "View row-level errors" on a Failed file shows that file's failed rows in a grid with the row number, observation date and message columns. Row numbers appear exactly as returned and the grid starts in ascending row-number order. Rows with no observation date show a neutral placeholder, and helper text explains that the row number counts the header rows of the original file.
- **AC-3** (coverage: vitest): Choosing a column header sorts by that column ascending, and choosing it again sorts descending. The active column and its direction are shown by more than colour, and rows with no observation date stay in the grid when sorting by date.
- **AC-4** (coverage: vitest): A skeleton shows while the failed rows load. When the list comes back empty, "No failed rows." replaces the grid.
- **AC-5** (coverage: vitest): When the import does not exist, "Import not found" shows with a link back to the file list. Any other failure shows a persistent message saying what happened, with a Retry action that reloads the rows.
- **AC-6** (coverage: playwright): With the row-level errors open, the user can download the original file and return to the file's details without leaving the File log.

## Manual test checklist

- Open File log and select a Failed file → you see "View row-level errors" next to Download original and Trace import
- Select an Imported file → there is no "View row-level errors" action
- On a Failed file, choose "View row-level errors" → a grid of failed rows appears with row number, observation date and message, lowest row number first
- Choose the Message header, then choose it again → the rows sort A to Z, then Z to A, and the header shows the direction
- Note a row number, choose Download original, open the file → that row in the spreadsheet is the one the message describes
- Close the row-level errors → you are back at the file's details

## Additional technical checks

2 technical checks verified automatically.
