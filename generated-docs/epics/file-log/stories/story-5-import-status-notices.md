# Story 5: Import finished and failed notices

**Slug:** story-5-import-status-notices
**Requirement IDs:** R19, R20, NFR-2, NFR-5
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

While a file is Processing, the file log checks for updates on its own. When the file finishes you see "Import complete.", and if it fails you see "Import failed. See the file log for details." Each appears once, with the row's status updated.

## Summary

While the File log is visible and at least one loaded file is Processing, the list re-fetches the current query (same filters) every 10 s, and stops when nothing is Processing or the tab is hidden (resumes when visible). Each file's status is compared against the previously seen status. Processing→Imported raises the transient toast "Import complete.", Processing→Failed raises "Import failed. See the file log for details." Nothing appears on first load or on repeat polls with no change. Background refreshes don't flash the loading skeleton (add a silent-refresh option to useDataState), and an open detail panel refreshes its status.

## Acceptance criteria

- **AC-1** (coverage: playwright): When a Processing file becomes Imported while the file log is open, its badge updates and "Import complete." appears once
- **AC-2** (coverage: vitest): When a Processing file becomes Failed while the file log is open, its badge updates and "Import failed. See the file log for details." appears once
- **AC-3** (coverage: vitest): Opening the file log with files already Imported, Failed or Processing shows no import notices, and unchanged statuses never repeat a notice
- **AC-4** (coverage: vitest): The list stops checking for updates when no file is Processing or the tab is hidden, and background checks do not show the loading skeleton

## Manual test checklist

- Drop a valid Bank of England file into the Inbox and keep File log open → the new row shows Processing, then changes to Imported and "Import complete." appears
- Drop a faulty file into the Inbox and keep File log open → the row changes to Failed and "Import failed. See the file log for details." appears
- Reload File log when nothing is Processing → no import messages appear

## Additional technical checks

Count: 2

## Reuse notes

- useDataState / DataState: add a silent-refresh option rather than a second fetching mechanism. Toasts via useToast(). Playwright for AC-1 mocks the files endpoint with a status transition (no live Inbox needed).
