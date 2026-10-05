# Story 2: Run detail - step pipeline, audit history and execution log

**Slug:** story-2-run-detail-steps-and-log
**Requirement IDs:** R2, R3, R4, R5, R6, R8, BR1, BR2, BR3, BR5, NFR-2, NFR-3, NFR-5
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/app/(app)/workflow-monitor/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Selecting a run shows its full history below the table: status and every timestamp, a pipeline of step tiles (steps that have not run show "Pending"), and the execution log, oldest first, including the message of any failing activity. A run that does not exist shows "Process instance not found", and a run with no log shows "No log entries exist". Both messages offer a way back.

## Summary

Selecting a row puts the selection in the URL (`/workflow-monitor?instance=<Id>`) so it can be deep-linked, then loads `GET /v1/process-instances/{Id}` and `/execution-logs`. A steps card is titled by the process name with subtitle "{id} · {status} · {file name}". The step tile grid is sized to the service's Steps[] in service order, shows "{n} · {STATE}" and the raw step name, tinted Completed success, Faulted danger, Running info, otherwise neutral. The audit key/value block covers created, last executed, finished, cancelled and faulted times, absent values shown explicitly. The dense execution log shows Timestamp, Activity, Event and Message, oldest first; the event badge copes with or without an "Activity" prefix. 404 shows "Process instance not found" with a link back. An empty log shows "No log entries exist" with a link to the file's details, resolved via the run's ProcessInstanceId → `/v1/imports/{ProcessInstanceId}` → `/file-log?file=<Id>`; a run with no matching import (for example LoadYieldCurves) links to `/file-log`. Loading and retry via DataState.

## Resolved design choices

- Execution log subtitle: plain wording, e.g. "Each step's events, oldest first" — NOT the design's "From ProcessExecutionLogsView".

## Acceptance criteria

- **AC-1** (coverage: vitest): Selecting a run shows one step tile per step the service returns, in order. Each tile shows its position, state label and step name, the tint follows the state, and steps that have not run read "Pending".
- **AC-2** (coverage: vitest): The selected run's audit history shows its status and created, last executed, finished, cancelled and faulted times plus the last executed activity. Times the run does not have are shown as absent.
- **AC-3** (coverage: vitest): The execution log lists time, activity, event and message for each entry, oldest first, and a faulted activity's message is shown.
- **AC-4** (coverage: playwright): Opening a Workflow monitor link for a specific run shows that run already selected, with its steps and log.
- **AC-5** (coverage: playwright): Opening a run that does not exist shows "Process instance not found" with a route back to the process instance list.
- **AC-6** (coverage: vitest): A run with no log entries shows "No log entries exist" with a route back to that run's file details.

## Manual test checklist

- Click a Finished run → the step tiles appear, each showing its number, a state word and the step name, and all are tinted as completed
- Click a Faulted run → the failed step is tinted red, the steps after it read "Pending", and the log shows the failing activity's message
- Check the log → entries run oldest first, each with a time, activity, event and message
- Check the run's history → created and last executed times are shown, and missing finished or faulted times are clearly shown as absent rather than blank
- Copy the page address with a run selected, then open it in a new tab → the same run is selected
- Change the run ID in the address bar to nonsense → you see "Process instance not found" and a link back to the list

## Additional technical checks

1 technical check verified automatically.

## Reuse notes

getProcessInstance, getProcessInstanceExecutionLogs, getImport; lookUp (lib/api/not-found.ts); DataState, NotFoundMessage; fileLogSelectionPath and the useSelectedFile URL-selection pattern (`?instance=`).
