# Story 4: Trace a file to its import

**Slug:** story-4-import-trace
**Requirement IDs:** R17, R18, BR6, NFR-1
**Roles:** Demo presenter
**Route:** /file-log/imports/[woid]
**Target file:** web/src/app/(app)/file-log/imports/[woid]/page.tsx
**Page action:** create_new
**Infrastructure only:** false

## Plain summary

From a file's details, open its import trace to see the file log entry, the workflow instance that processed it, and how many rates and curves it produced.

## Summary

A "Trace import" action in the file details (story 3) goes to its own page keyed by the file's WOID: `/file-log/imports/{woid}` (**user decision: its own page**). It loads GET /v1/imports/{Woid} through DataState and shows three sections — the file log entry (from File: name, family, received, status), the workflow instance (ProcessName, CurrentStatus as a StatusChip, CreatedAt, LastExecutedAt, FinishedAt / FaultedAt / CancelledAt when present, LastExecutedActivityName), and RatesCount / CurvesCount. The step pipeline stays in the Workflow monitor epic. A 404 shows "Import not found" with a link back to the file list; other failures show the persistent error with Retry. A back link returns to the file log.

## Acceptance criteria

- **AC-1** (coverage: playwright): Choosing "Trace import" in a file's details opens that file's import trace
- **AC-2** (coverage: vitest): The import trace shows the file log entry, the workflow instance (name, status and its timestamps) and the counts of rates and curves produced
- **AC-3** (coverage: playwright): When no import exists for the WOID, the trace shows "Import not found" with a way back to the file list
- **AC-4** (coverage: vitest): When the import trace cannot be loaded for any other reason, a persistent error message offers Retry

## Manual test checklist

- Open a file's details and click Trace import → you see the file's entry, its workflow instance and the rates and curves counts
- On a trace for a failed file → the workflow instance status shows it faulted or was cancelled, with the matching time
- Click the link back to File log → you return to the file list
- Change the WOID in the address bar to one that doesn't exist → you see "Import not found" with a link back to the file list

## Additional technical checks

Count: 1

## Reuse notes

- New route under the existing (app) group, so it sits inside the app frame. Reuse the files types/module from story 1, DataState, StatusChip. Later epics (Curve data's rate-to-import link, Workflow monitor) will link to this route.
