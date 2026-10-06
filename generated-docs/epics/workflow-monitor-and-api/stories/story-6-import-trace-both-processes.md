# Story 6: Import trace shows both processes, and Open workflow opens the right run

**Slug:** story-6-import-trace-both-processes
**Requirement IDs:** R7, R8, BR3 (change request: two-stage status model)
**Roles:** Demo presenter
**Route:** /file-log/imports/[woid]
**Target file:** web/src/components/file-log/ImportTrace.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The Import trace page now shows both runs behind a file. The ImportPro run staged it and the RateLoad run loaded it into the tables, or the page says the rate load hasn't started yet. Each run has its own "Open workflow" link. In a file's details there are two buttons: one opens the staging run and the other opens the import (RateLoad) run once it has started.

## Summary

ImportTrace.tsx swaps the single "Workflow instance" section for two sections built from ImportRead.StagingProcessInstance and ImportRead.RateLoadProcessInstance. If the new fields are missing it falls back to the legacy ProcessInstance for the staging section. When RateLoadProcessInstance is absent, the rate load section says "Not started yet". The File log entry section adds Stage and FailedStep. Each section gets an "Open workflow" link to workflowMonitorSelectionPath(id, { single: true }); these links also carry the file Id so story 7's "Open file log entry" can return to the file. FileDetailCard replaces the single "Open workflow" with two buttons: "Open staging run" (the ImportPro run = the file's Woid, always offered) and "Open import run" (the RateLoad run = WorkflowInstanceId, offered only when WorkflowInstanceId is present, i.e. once RateLoad has started). Both link with view=single and the file Id. The "Workflow instance" detail row is relabelled to make clear it is the RateLoad run. The existing view=single and Show all behaviour stays.

## Resolved design choices

- File details: two buttons, "Open staging run" and "Open import run" (the second only once RateLoad has started).

## Acceptance criteria

- **AC-1** (coverage: vitest): The Import trace shows a staging (ImportPro) section and a rate load (RateLoad) section. Each shows process, instance ID, status, created, last executed, any finished/faulted/cancelled time and last activity. The rate load section reads "Not started yet" when the file has no RateLoad run.
- **AC-2** (coverage: vitest): The trace's File log entry section shows the file's status chip, Stage and, for Failed files, the failed step.
- **AC-3** (coverage: playwright): Each trace section's "Open workflow" opens the Workflow monitor with that run selected and only that run listed.
- **AC-4** (coverage: playwright): In a file's details, "Open staging run" opens the file's ImportPro run and "Open import run" opens its RateLoad run, each selected and shown on its own.
- **AC-5** (coverage: vitest): "Open import run" is not offered for a file with no RateLoad run (no WorkflowInstanceId); "Open staging run" is offered for every file.

## Manual test checklist

- Open "Trace import" for an Imported file → you see a staging section (ImportFile) and a rate load section (LoadYieldCurves), each with its own status and times
- Trace a file that failed while staging → the rate load section says "Not started yet"
- In each trace section choose "Open workflow" → the Workflow monitor opens on that run only
- In the details of a file that failed during the rate load, choose "Open import run" → the run that opens is the one that failed
- In the details of a file that failed during staging → "Open staging run" is offered and "Open import run" is not
- Use the browser Back button after each jump → you return to where you came from

## Additional technical checks

1 technical check verified automatically.

## Reuse notes

TraceSection / workflowFields in ImportTrace.tsx (render twice); workflowMonitorSelectionPath(id, { single: true }) in useSelectedInstance.ts (add an optional file Id); FileDetailCard action row.
