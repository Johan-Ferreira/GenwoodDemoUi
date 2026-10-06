# Story 4: Workflow monitor run selection and exception note in Audit history

**Slug:** story-4-workflow-monitor-selection-and-exception-note
**Requirement IDs:** R8, R9, BR4, BR5, NFR-4
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/app/(app)/workflow-monitor/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Clicking a run in "Process instances" narrows the list to that run, shows its details below, and shows the "Show all process instances" button, just like arriving from the File log. For a staging (ImportFile) run that failed to finish, Audit history also shows the file's exception note.

## Summary

R8 reuses the existing `view=single` state. In `useSelectedInstance.ts`, `select` sets both `instance=<Id>` and `view=single`, so a row click gives the same URL, and the same deep-linkable view, as "Open workflow" from the File log (BR5). `select` must also narrow when the clicked run is already selected (after "Show all"), not return early. `showAll` is unchanged: it drops `view` and keeps the selection. R9: `ProcessInstanceDetail.tsx` already resolves the run's import through `GET /v1/imports/{ProcessInstanceId}` (trace.File is FileDetailRead with ExceptionNote), and a failed lookup already yields `trace: null`. AuditHistory gets the resolved file's note and adds an "Exception note" row (plain text, wraps) only when BR4 holds. "Failed to finish" means all of: ProcessName is ImportFile; the import lookup returned a file; the run did not finish successfully, meaning CurrentStatus is anything other than Finished (Running, Suspended, Idle, Cancelled), or FaultedAt is set, or the resolved file's Status is Failed at the ImportPro (staging) stage; and File.ExceptionNote is non-blank. The predicate lives in `lib/workflow/process-status.ts` next to the existing helpers. LoadYieldCurves runs never show the note. Otherwise Audit history is unchanged, with no empty row.

## Acceptance criteria

- **AC-1** (coverage: playwright): Clicking a row in Process instances narrows the list to that one run, shows its steps, execution log and audit history below, and shows "Show all process instances"; reloading the page keeps the same view.
- **AC-2** (coverage: playwright): Choosing "Show all process instances" restores the full list with the run still selected, and clicking that same run again narrows the list once more.
- **AC-3** (coverage: vitest): For a staging (ImportFile) run that did not finish successfully and whose file has an exception note, Audit history shows an "Exception note" row with that note's text.
- **AC-4** (coverage: vitest): Audit history shows no exception-note row for a staging run that finished successfully, a rate load (LoadYieldCurves) run, or a failed staging run whose file has no note.
- **AC-5** (coverage: vitest): When the run's file cannot be looked up, Audit history still shows its usual rows with no note and no error.

## Manual test checklist

- Open the Workflow monitor and click any run → the list shrinks to that run, its details appear below, and "Show all process instances" is visible
- Reload the page → the same single run and details are still shown
- Click "Show all process instances" → the full list returns; click the same run again → it narrows again
- Select a staging (ImportFile) run for a file that failed with an exception note → Audit history shows an "Exception note" row with the same text as the file's failure alert in the File log
- Select a successful run and a rate load run → Audit history has no Exception note row

## Additional technical checks

2 technical checks verified automatically.
