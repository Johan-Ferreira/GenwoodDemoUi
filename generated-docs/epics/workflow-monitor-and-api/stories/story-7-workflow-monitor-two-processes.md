# Story 7: Workflow monitor understands the two processes

**Slug:** story-7-workflow-monitor-two-processes
**Requirement IDs:** R1, R2, R7, BR1, BR3, BR4, BR5 (change request: two-stage status model)
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/components/workflow-monitor/WorkflowMonitorView.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

A RateLoad run that ended on its Error step is marked as a failure instead of looking like a success. RateLoad steps appear in their real order. "Open file log entry" from a RateLoad run takes you back to the file you came from.

## Summary

The Process name filter stays as it is ("ImportFile" and "LoadYieldCurves"; the service has no process called RateLoad). For a LoadYieldCurves (RateLoad) run that is Finished with LastExecutedActivityName "Error", the status chip in the Process instances table and the step card header read "Finished (Error)" in the danger tone; the Status filter keeps the service values. RateLoad step tiles are ordered Register, Validate, Transform, Import, Complete, because the live service returns Pending steps out of order; unknown step names keep service order after these, and ImportFile steps keep service order (this overrides the original "service order drives" rule for RateLoad runs only). "Open file log entry" on a RateLoad run uses the file Id carried on the link from the file details or trace (stories 5 and 6), because /v1/imports/{id} 404s for RateLoad run IDs (confirmed live). When no file Id is carried, the run keeps today's "Import not found" with a route back. Everything from stories 1–4 stays: view=single, Show all, ImportFile Open file log entry, the plain execution log subtitle.

## Resolved design choices

- A RateLoad run that ends on Error shows a red "Finished (Error)" chip.
- RateLoad steps always show in the order Register, Validate, Transform, Import, Complete.
- The Process name filter options stay "ImportFile" and "LoadYieldCurves".

## Acceptance criteria

- **AC-1** (coverage: vitest): A RateLoad run that finished on its Error step is shown as "Finished (Error)" in the danger tone, in both the Process instances table and the step card header. A RateLoad run that finished normally still shows as Finished (success).
- **AC-2** (coverage: vitest): A RateLoad run's step tiles appear in the order Register, Validate, Transform, Import, Complete, whatever order the service sends. ImportPro run steps keep the service order.
- **AC-3** (coverage: playwright): Opening a file that failed during the rate load from its details ("Open import run") shows its RateLoad run, with the steps after the failure Pending and the Error step in the execution log.
- **AC-4** (coverage: playwright): From a RateLoad run reached from a file, "Open file log entry" opens the File log with that file selected. From a RateLoad run picked straight from the list, it still shows "Import not found" with a route back.

## Manual test checklist

- Find a RateLoad run whose last activity is "Error" → its badge reads "Finished (Error)" in red, not a green "Finished"
- Select a RateLoad run → the steps read Register, Validate, Transform, Import, Complete, left to right
- From the details of a file that failed during the rate load, choose "Open import run", then "Open file log entry" → you're back on the same file
- Pick a RateLoad run straight from the list and choose "Open file log entry" → you see "Import not found" with a link back
- Open the Workflow monitor from a file, then choose "Show all process instances" → the full list returns with the run still selected (unchanged)

## Additional technical checks

2 technical checks verified automatically.

## Reuse notes

processStatusTone in lib/workflow/process-status.ts (extend for the finished-on-Error case); RunSteps.tsx; OpenFileLogEntry.tsx (add the carried-file-Id shortcut ahead of lookUp(getImport)); PROCESS_NAMES unchanged.
