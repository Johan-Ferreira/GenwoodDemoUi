# Story 9: File log hides technical fields

**Slug:** story-9-file-log-hide-technical-fields
**Requirement IDs:** R1, NFR-5 (manual-test feedback 2026-10-05)
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/components/files/FileTable.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The File log no longer shows technical fields the user doesn't need: the file Size (in the table and in a file's details), the SHA-256 and the Backup file name. The table's "ID" column is headed "#".

## Summary

Removes the "Size" column from the shared file table (FileTable.tsx), which also removes it from Overview "Recent loads"; removes the "Size", "Backup file" and "SHA-256" rows from the file details (FileDetailCard.tsx); and relabels the "ID" column header to "#". Sorting, paging and the other columns are unchanged. The Backup file name is still used behind the scenes for "Download original" (the button stays).

## Resolved design choices

- Size is hidden in both the File log table and the file details (user decision 2026-10-05); the shared table also affects Overview "Recent loads".

## Acceptance criteria

- **AC-1** (coverage: vitest): The File log table has no "Size" column and its first column header is "#" (not "ID"); the other columns and their sorting are unchanged.
- **AC-2** (coverage: vitest): A file's details do not show Size, Backup file or SHA-256, and still show the other details and the Download original action.
- **AC-3** (coverage: vitest): Overview "Recent loads" has no "Size" column.

## Manual test checklist

- Open the File log → the first column is headed "#" and there is no Size column
- Open a file's details → there is no Size, Backup file or SHA-256, and Download original still works
- Open the Overview → Recent loads has no Size column

## Additional technical checks

1 technical check verified automatically.

## Reuse notes

FileTable.tsx column list; FileDetailCard.tsx detailFields(); formatByteCount may become unused in these components (remove only if unused elsewhere).
