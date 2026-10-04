# Journal — file-log

## Story 1: File log table with paging
- File log now loads every file in one go and pages it in the browser, as decided at the stories approval. The live data service accepted a page size of 1000 and returned all 4 files it holds. The app asks for 500 at a time, and if the service ever returns fewer than its total it fetches the next pages and merges them, so a hidden limit can't drop files.
- The live service sends sizes with decimals (for example "105439.00"). These parse correctly and show as e.g. "103.0 KB".
- The paging controls (5/10/20/50 rows, default 20, Previous/Next) are a shared component, so Curve data and Workflow monitor can reuse them.

## Story 2: Filter and sort the file log
- I checked the received-date filters against the live data service. ReceivedTo includes the whole end day (all 4 live files, received on 2026-10-02, came back with ReceivedTo=2026-10-02; ReceivedTo=2026-10-01 returned none). ReceivedFrom works the same way. A malformed date such as 04/10/2026 makes the service fail, so the app checks the date first and never sends a bad one.
- Filtering by Status=Imported and CurveFamily=OIS on the live service returned 1 file, matching the spec.
- Sorting runs over the whole loaded list. Missing sizes and records-inserted values sort after real values in both directions.

## Story 3: File details and original download
- Clicking a row in the file log now selects it: the row is highlighted, the address bar changes to ?file=<number>, and that file's details appear under the table. Pasting a link with ?file= opens the same file directly.
- If the file number in the address doesn't exist, the details area says "File not found" and links back to the file list. Other service errors still show the usual error with Retry. I confirmed against the live service that a missing file gives 404 with the message "File not found" (and a missing import gives "Import not found").
- "Download original" saves the real file and shows a confirmation message; a missing original shows "File not found".
