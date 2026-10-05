# Journal - workflow-monitor-and-api

## Story 1: Process instance list

- Cancelled workflow runs now show a grey (neutral) status chip, like Idle and Suspended; only Finished, Faulted and Running are coloured (BR4). This also changes the Cancelled chip on the import trace page, which used to be amber.
- The Process name filter is a free-text box that applies on leaving the field or pressing Enter. Status is a dropdown with "All statuses" plus the six service statuses.

## Story 2: Run detail

- Selecting a run puts its ID in the address (?instance=...), so the selection can be shared as a link. Below the table: the steps card (tiles in service order), the audit history, and the execution log (oldest first). Missing timestamps show as an em dash.

## Story 3: File and run navigation

- "Open file log entry" reuses the file found when the run was loaded, so it usually opens the File log at once; it only asks the service again when that file could not be found, and then shows "Import not found" with a link back to the process instance list.

## Story 4: API reference

- The API page shows the real data service address in the example request (the same setting the app proxy uses), not the prototype address. The example response is a live read of the chosen curve rates for the chosen date. The subtitle was reworded because the design said "Illustrative contract for the demo".

## Manual-test fix cycle 1

- The live service has no ContextId on process runs. An ImportFile run ID is the same as its file WOID, so the app finds a run's file using the run ID. Open workflow on any file (failed ones included) opens that file's own import run, and the monitor lists only that run until you choose "Show all process instances". LoadYieldCurves runs have no file, so Open file log entry on one shows "Import not found" with a link back.
- The Process name filter is now a dropdown: All processes, ImportFile, LoadYieldCurves (hardcoded for the demo).

## Story 5: Two-stage import statuses

- Files now move through Staging, Staged and Importing before they end Imported or Failed. The File log filter, the status chips (Staged is grey) and the "Import complete" / "Import failed" notices all follow the new statuses.
- A file's details now show its Stage, plus the Failed step for failed files. When a RateLoad failure has no error note, the red alert reads "Failed at the {step} step of {stage}."
- The Overview "Files received" card lists only the statuses that have files, for example "2 imported, 19 importing, 10 failed".

## Story 6: Import trace shows both processes

- The Import trace now shows two runs instead of one "Workflow instance" block: "Staging run" (ImportPro, ImportFile) and "Rate load run" (RateLoad, LoadYieldCurves) or "Not started yet". Each has its own "Open workflow" link that opens the Workflow monitor on just that run. The File log entry section also shows Stage and, for failed files, the failed step.
- A file's details have two buttons where "Open workflow" used to be: "Open staging run" (always) and "Open import run" (only once RateLoad has started). Both carry the file Id so the Workflow monitor can return to the file.
