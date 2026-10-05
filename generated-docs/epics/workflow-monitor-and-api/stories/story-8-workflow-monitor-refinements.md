# Story 8: Workflow monitor refinements (step cards, error step, status filter, execution log)

**Slug:** story-8-workflow-monitor-refinements
**Requirement IDs:** R1, R2, R3, R4, BR1, BR4 (manual-test feedback 2026-10-05)
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/components/workflow-monitor/WorkflowMonitorView.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The step cards stop where the run stopped: a finished ImportFile run no longer shows a row of grey "Hold…" and "Clear…" cards after ImportData, and a RateLoad run that ended on Error ends on a red card instead of a green one followed by Pending cards. The Status filter offers "Finished (Error)" instead of "Faulted", so those failed RateLoad runs can be found. The Execution log shows only the "Executed" row when an activity has both an "Executing" and an "Executed" row.

## Summary

1. **ImportFile step cards.** The Hold… and Clear… steps are the alternative hold/clean-up branch. A Pending step whose name starts with "Hold" or "Clear" is not shown; one of them is shown (in its own state, e.g. Running) only if the process actually stopped on it. All other Pending steps keep showing as "Pending" (e.g. upcoming steps of a run that is still in progress). Step order is unchanged.
2. **RateLoad error step.** For a LoadYieldCurves run that is Finished with LastExecutedActivityName "Error", the step that failed (the last step of Register, Validate, Transform, Import, Complete that ran) is shown as the stopping card in the danger tone with the label "ERROR" instead of "COMPLETED", and the Pending steps after it are not shown. RateLoad steps keep the real order Register, Validate, Transform, Import, Complete. RateLoad runs that did not end on Error are unchanged.
3. **Status filter.** The Status filter's "Faulted" option (the service reports no Faulted runs) is replaced by "Finished (Error)". Choosing it lists exactly the runs that are Finished with LastExecutedActivityName "Error" (the app asks the service for Finished runs and filters them on the page, because the service cannot filter on the last activity; paging is done on the page for this option). The other status options still go to the service. The active-filter chip and Clear all work as before. Process name and Finished (Error) combine.
4. **Execution log.** When the log has an "Executing" row and an "Executed" row for the same activity (the Executed row following the Executing one), only the "Executed" row is shown. An "Executing" row with no Executed row after it (still running) is shown. Order stays oldest first; a failing activity's message still shows.

## Resolved design choices

- Status filter: "Finished (Error)" replaces "Faulted" (user decision 2026-10-05).

## Acceptance criteria

- **AC-1** (coverage: vitest): For a finished ImportFile run whose Hold… and Clear… steps are Pending, the step cards show only the other steps (through ImportData) and none of the Hold… or Clear… cards. A run that stopped on a Hold… step shows that one card in its real state; other Pending steps still show "Pending".
- **AC-2** (coverage: vitest): For a LoadYieldCurves run that finished on Error, the last step that ran is a red "ERROR" card and the Pending steps after it are not shown. A LoadYieldCurves run that did not end on Error shows its steps as before.
- **AC-3** (coverage: vitest): The Status filter offers its existing statuses with "Faulted" replaced by "Finished (Error)" (same position), and choosing "Finished (Error)" lists only runs that are Finished with last activity "Error".
- **AC-4** (coverage: playwright): In the Workflow monitor, choosing Status "Finished (Error)" lists the failed RateLoad runs, and Clear all brings every run back.
- **AC-5** (coverage: vitest): The execution log shows only the "Executed" row for an activity that has both "Executing" and "Executed" rows, keeps an "Executing" row that has no "Executed" row after it, and keeps oldest-first order and failing messages.

## Manual test checklist

- Open a finished ImportFile run → the step cards end at ImportData; no grey Hold… or Clear… cards
- Open an ImportFile run that is paused on a Hold… step → that one card shows
- Open a LoadYieldCurves run that finished with Error → the cards stop at a red card for the step that failed, with no Pending cards after it
- Open the Status filter → "Finished (Error)" is offered instead of "Faulted"; pick it → only those failed RateLoad runs are listed
- Open a run's Execution log → each activity shows one row (Executed), not an Executing and an Executed pair

## Additional technical checks

1 technical check verified automatically.

## Reuse notes

orderRunSteps, runStatusDisplay in lib/workflow/process-status.ts; RunSteps.tsx; ExecutionLogCard.tsx and lib/workflow/execution-log.ts; ProcessInstanceFilters.tsx / useProcessInstanceFilters.ts / ProcessInstanceList.tsx (page-level filtering for Finished (Error)); the live Status values are Idle, Running, Suspended, Finished, Cancelled (check the Status options in ProcessInstanceFilters).
