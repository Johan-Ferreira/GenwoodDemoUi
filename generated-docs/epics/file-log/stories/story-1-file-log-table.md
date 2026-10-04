# Story 1: File log table with paging

**Slug:** story-1-file-log-table
**Requirement IDs:** R1, R4, R5, R6, R7, R8, R10, BR1, BR2, BR4, NFR-1, NFR-3, NFR-4, NFR-5
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Open File log and see every received file, newest first, with its ID, file, curve family, received time, size, records inserted, WOID and an Imported / Failed / Processing status badge. Choose 5, 10, 20 or 50 files per page and move between pages.

## Summary

Replaces the File log placeholder with the page header (title, subtitle), a flush table card with the eight brief columns and the footer note "Source: Bank of England yield curves, picked up from the Inbox folder." Data comes from GET /v1/files through a typed endpoint function (FileRead/FileReadList types) using `get`, wrapped in DataState for the loading thresholds, the persistent error with Retry, and the empty state "No files have been received yet." SizeBytes/RecordsInserted go through parseNullableNumber (size formatted as e.g. "238.8 KB", null shown as a neutral placeholder), WOID is cut to its first 8 characters, mono tabular figures where the brief says, and Status uses StatusChip (Imported=success, Failed=danger, Processing=info). Page size 5/10/20/50 (default 20) with paging controls.

**User decision (sorting scope): load ALL matching files once, then page, sort and filter-display in the browser** (volume is small). The developer must confirm a large `Size` works against the live service (the spec gives no maximum; example 50) — if there's a limit, fetch in successive pages and merge.

## Acceptance criteria

- **AC-1** (coverage: vitest): The file list shows the columns specified in the brief (R1), newest first, with size human-readable, WOID shortened to 8 characters, and a neutral placeholder where size or records inserted is missing
- **AC-2** (coverage: vitest): Each file shows exactly one status as a labelled badge (Imported, Failed or Processing) whose colour follows its meaning and is never the only cue
- **AC-3** (coverage: playwright): The page size offers 5, 10, 20 and 50 with 20 selected by default, and moving to the next or previous page shows the matching set of files
- **AC-4** (coverage: vitest): When no files exist, the list shows "No files have been received yet." instead of an empty table
- **AC-5** (coverage: vitest): When the file list cannot be loaded, a persistent error message explains what happened and offers Retry, which reloads the list
- **AC-6** (coverage: playwright): The File log page passes an automated accessibility scan in a real browser

## Manual test checklist

- Click File log in the side navigation → you see the file table with ID, File, Curve family, Received, Size, Records inserted, WOID and Status columns, newest file at the top
- Look at the Status column → every row shows a coloured badge with the word Imported, Failed or Processing
- Look at the Size and WOID columns → sizes read like "238.8 KB" and each WOID shows only its first 8 characters
- Change the page size to 5 → at most 5 files show and you can move to the next page
- Stop the data service and reload File log → you see an error message with a Retry button; start the service again and click Retry → the files appear

## Additional technical checks

Count: 2

## Reuse notes

- App shell (AppFrame, side nav, PageHeader) already wraps /file-log; replace only the placeholder content.
- All reads go through DataState / useDataState (web/src/components/data-state/). Story 5's polling needs a silent-refresh option on useDataState.
- Use `get` from web/src/lib/api/client.ts; rejections are ServiceError (branch on status 404 for specific messages).
- parseNullableNumber (web/src/lib/api/nullable-number.ts) for SizeBytes / RecordsInserted.
- StatusChip for status badges; IconButton for icon-only controls; useToast().showToast for toasts.
- Add Shadcn `table`, `select` (and possibly `pagination`) via the CLI; fix cn/Slot imports per architecture.md conventions.
- Put endpoint functions and types in web/src/lib/api/files.ts and web/src/types/files.ts so the Overview epic reuses row types, formatting and status-tone mapping.

## Design choices

- Sorting scope: whole list (load all matching files, sort/page in the app) — user decision.
