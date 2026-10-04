# Story 3: File details and original download

**Slug:** story-3-file-details-and-download
**Requirement IDs:** R12, R13, R14, R15, R16, R21, BR3, BR5, BR6, NFR-1, NFR-2
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Click a file to open its details below the table: its audit history, where it was picked up and backed up, its content hash, and why it failed if it did. You can also download the original source file.

## Summary

Row click selects the file (Forest-50 fill + 2px inset bar) and sets `?file=<Id>` in the URL so the selection is linkable (the Overview epic's "Recent loads" row will link here). The detail card loads GET /v1/files/{Id} through DataState. Title is the file name, subtitle "File log entry {id} · {status}" plus " · current" only when IsCurrent is true (BR3). The key/value grid shows WOID, Workflow instance, Received, Size (bytes with thousands separators), Inbox location, Backup file, SHA-256 ("Not recorded" when absent), Record count, Records inserted, Created by. Failed files get a danger alert with the ExceptionNote then "Fix the source file or re-import once the Bank of England republishes it." (BR5). A 404 shows "File not found" with a link back to the file list (BR6); other failures show the persistent error with Retry. "Download original" (ghost, download icon) calls downloadFile on /v1/files/{Id}/original, shows the transient toast "Original file downloaded from the Backup folder." on success, and on 404 shows "File not found" (not a generic error). A "Trace import" action is added by story 4. "Open workflow" and "View data" are NOT rendered (their epics don't exist yet; no dead links).

## Acceptance criteria

- **AC-1** (coverage: playwright): Selecting a file highlights its row and shows its details with the fields listed in the brief (R12, R13), with "Not recorded" when the content hash is absent
- **AC-2** (coverage: vitest): The details subtitle reads "File log entry {id} · {status}" and adds " · current" only when the service marks the file as current
- **AC-3** (coverage: vitest): A failed file's details show its exception note followed by "Fix the source file or re-import once the Bank of England republishes it."; files that did not fail show neither
- **AC-4** (coverage: playwright): Opening the details of a file that does not exist shows "File not found" with a way back to the file list, not a generic error
- **AC-5** (coverage: playwright): Choosing "Download original" saves the original source file and shows "Original file downloaded from the Backup folder."
- **AC-6** (coverage: vitest): When the original file is missing, "Download original" shows "File not found"; any other download failure shows a persistent error with a way to try again

## Manual test checklist

- Click a row in the file log → the row is highlighted and the file's details appear below the table
- Check the details → you see WOID, Workflow instance, Received, Size in bytes, Inbox location, Backup file, SHA-256, Record count, Records inserted and Created by
- Open the current version of a file → the subtitle ends with "· current"; open an older version → it doesn't
- Open a Failed file → a red box shows why it failed, followed by "Fix the source file or re-import once the Bank of England republishes it."
- Click Download original → the source spreadsheet downloads and a message confirms it
- Change the file number in the address bar to one that doesn't exist (for example ?file=999999) → you see "File not found" with a link back to the file list

## Additional technical checks

Count: 1

## Reuse notes

- Use downloadFile (web/src/lib/api/download.ts); do not add a second binary path.
- DataState / ServiceError (404 → specific message). StatusChip for the status; toast via useToast().
- Verify the real service's behaviour for 404 on /v1/files/{Id} during BUILD.
