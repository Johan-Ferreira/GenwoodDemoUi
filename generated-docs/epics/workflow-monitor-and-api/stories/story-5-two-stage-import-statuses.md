# Story 5: New import statuses across the File log and Overview

**Slug:** story-5-two-stage-import-statuses
**Requirement IDs:** R7, BR3, BR5 (change request: two-stage status model)
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/components/file-log/FileLogView.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Files now show where they are in both steps of an import. They are Staging or Staged while ImportPro takes them in, Importing while RateLoad loads them into the tables, and Imported or Failed at the end. You can filter the File log by these five statuses. A file's details show its stage and, if it failed, the step that failed. The Overview "Files received" card breaks the total down by status.

## Summary

ImportPro stages the data; RateLoad (the GenwoodDemo LoadYieldCurves process) completes the import to the target tables. A file is only Imported once RateLoad has finished without ending on Error. Replaces the three-value status model (Imported/Failed/Processing) with Staging, Staged, Importing, Imported and Failed in FILE_STATUSES (types/files.ts), FILE_STATUS_TONE (lib/files/file-format.ts), the File log status filter, StatusChip use in the File log table, file details and Overview Recent loads, and useImportStatusNotices. Tones: Imported success, Failed danger, Staging and Importing info, Staged neutral (grey). Any in-progress status (Staging/Staged/Importing) moving to Imported or Failed raises the existing notices. FileRow and the file details gain Stage and FailedStep (regenerate api-generated.ts from the updated documentation/CurveData.yaml). The failure alert falls back to a stage and step line when ExceptionNote is absent (the case for live RateLoad failures). The Overview filesReceivedLine is rebuilt from the new FileCounts fields and lists only the non-zero statuses, e.g. "2 imported, 19 importing, 10 failed". Mocks and fixtures for all statuses (file.ts, file-detail.ts, import.ts, overview.ts, process-instance*.ts) move to the new vocabulary and existing tests asserting "Processing" are updated.

## Resolved design choices

- Staged badge is grey (neutral).
- Overview "Files received" line lists only non-zero statuses, e.g. "2 imported, 19 importing, 10 failed".

## Acceptance criteria

- **AC-1** (coverage: playwright): The File log status filter offers "All statuses", "Staging", "Staged", "Importing", "Imported" and "Failed" ("Processing" is gone), and choosing one lists only files with that status.
- **AC-2** (coverage: vitest): Every status chip in the File log table, the file details and Overview "Recent loads" shows its text label with the agreed tone (Imported success, Failed danger, Staging and Importing info, Staged neutral). An unknown status is shown neutral with its own text.
- **AC-3** (coverage: vitest): A file's details show a "Stage" row (ImportPro or RateLoad, as the service returns it). A Failed file also shows a "Failed step" row. Files that are not Failed show no failed step.
- **AC-4** (coverage: vitest): A Failed file always shows the danger alert. Its first line is the exception note when there is one; otherwise it reads "Failed at the {step} step of {stage}." It is followed by the existing guidance line.
- **AC-5** (coverage: vitest): A file first seen as Staging, Staged or Importing that becomes Imported raises "Import complete." once, and one that becomes Failed raises "Import failed. See the file log for details." once. Moves between Staging, Staged and Importing, and files seen for the first time, raise no notice.
- **AC-6** (coverage: vitest): The Overview "Files received" card shows the total and a breakdown line of only the non-zero statuses from the service's Staging, Staged, Importing, Imported and Failed counts, e.g. "2 imported, 19 importing, 10 failed".

## Manual test checklist

- Open the File log status filter → you see All statuses, Staging, Staged, Importing, Imported and Failed. Pick Importing → only Importing files are listed
- Open a file that failed during the rate load → the red alert says which step failed, and the details show Stage "RateLoad" and a Failed step
- Open a file that failed during staging → the red alert shows the error message, and the details show Stage "ImportPro" and its failed step
- Open an Imported file → you see Stage "RateLoad" and no failed step or red alert
- On the Overview, the "Files received" breakdown adds up to the total, and Recent loads shows the same status labels as the File log
- Leave the File log open while a new file is imported → its status moves through the in-progress statuses, and you get one "Import complete." or "Import failed." notice at the end

## Additional technical checks

2 technical checks verified automatically.

## Reuse notes

FILE_STATUSES / FILE_STATUS_TONE; web/src/mocks/data/file.ts (own copy of statuses); useImportStatusNotices; filesReceivedLine / filesReceivedTotal in lib/overview/overview-format.ts; detailFields() and FileDetails in FileDetailCard.tsx. Curve data and Yield curves have no status assumptions.
