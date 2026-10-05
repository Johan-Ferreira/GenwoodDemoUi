# Story 3: Move between a file and its run

**Slug:** story-3-file-and-run-navigation
**Requirement IDs:** R7, BR3, BR5
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/components/file-log/FileDetailCard.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

In the File log, a file's details gain an "Open workflow" button that opens the Workflow monitor with that file's run selected. From a selected run, "Open file log entry" opens the File log with that run's file selected. A link target that cannot be found shows the matching "not found" message with a way back, never a raw error.

## Summary

Adds an "Open workflow" secondary button (workflow icon) to the File log file detail panel (`FileDetailCard`), linking to `/workflow-monitor?instance=<WorkflowInstanceId>`; not offered when WorkflowInstanceId is absent. Adds an "Open file log entry" secondary button (file-spreadsheet icon) to the selected run view, resolving ContextId (the WOID) via `GET /v1/imports/{Woid}` to File.Id and navigating to `/file-log?file=<Id>`. A 404 shows "Import not found" with a route back. Delivers the end-to-end "Follow a failed import to its cause" flow; the workflow monitoring link (R7) is the in-app monitor.

## Acceptance criteria

- **AC-1** (coverage: playwright): In the File log, choosing "Open workflow" on a file's details opens the Workflow monitor with that file's run selected.
- **AC-2** (coverage: playwright): From a selected run, choosing "Open file log entry" opens the File log with that run's file selected and its details shown.
- **AC-3** (coverage: playwright): Opening a failed file's workflow shows the faulted step, the Pending steps after it and the failing activity's message in the log.
- **AC-4** (coverage: vitest): "Open workflow" is offered for every file and opens the file's own import run (the run whose ID is the file's WOID, process ImportFile), not the later LoadYieldCurves run. The link also asks the Workflow monitor to show only that run in the Process instances table.
- **AC-5** (coverage: vitest): "Open file log entry" resolves the run's own ID as the import WOID (`GET /v1/imports/{ProcessInstanceId}`; the live service returns no ContextId). When no import exists for the run (for example a LoadYieldCurves run), it leads to an "Import not found" message with a route back, not a raw error.

## Manual test checklist

- In the File log, open a file's details and choose "Open workflow" → the Workflow monitor opens with that file's run selected
- From that run, choose "Open file log entry" → you are back in the File log with the same file's details open
- Open a failed file and choose "Open workflow" → you see the faulted step, Pending steps after it, and the error message in the log
- Use the browser Back button after each jump → you return to where you came from

## Additional technical checks

1 technical check verified automatically.

## Reuse notes

FileDetailCard action row (Download original, Trace import); fileLogSelectionPath; getImport + lookUp; NotFoundMessage.

## Contract correction (manual test, 2026-10-05)

The live service returns no ContextId. A file's Woid equals the ProcessInstanceId of its ImportFile run; the file's WorkflowInstanceId points at the later LoadYieldCurves run, which has no link back to a file. So: "Open workflow" uses the file Woid (works for failed files too) and adds `view=single`; "Open file log entry" uses the run's ProcessInstanceId as the Woid.

## Superseded in part (2026-10-05)

The two-stage status change (stories 5-7) replaces the single "Open workflow" button in the file details with "Open staging run" and "Open import run" (story 6), and "Open file log entry" from a RateLoad run uses the file Id carried on the link (story 7).
