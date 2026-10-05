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
