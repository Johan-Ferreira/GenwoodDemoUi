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

## Story 4: Trace a file to its import
- Added the import trace page. From a file's details, "Trace import" opens /file-log/imports/{WOID}. It shows the file's log entry, the workflow instance that processed it (with its status and timestamps), and how many rates and curves it published. An unknown WOID shows "Import not found" with a link back to the file list; any other failure shows the usual error with Retry. The step-by-step pipeline is left for the Workflow monitor epic.

## Story 5: Import finished and failed notices
- The File log now checks for updates on its own every 10 seconds while any file on screen is still Processing. It stops when nothing is Processing or the browser tab is hidden. When a file it saw as Processing turns Imported or Failed, you get a short "Import complete." or "Import failed. See the file log for details." message, once. If that file's details are open, they update too. Opening the page never shows these messages for files that were already finished.

## Manual-test fix: layout
- After manual testing, the page content now lines up on the left right beside the side menu and uses the full screen width, instead of sitting centred in a 1280px column. This applies to every signed-in page. The file log table was tightened (smaller padding, slightly smaller monospace text) so every column, including Status, fits without sideways scrolling on a normal desktop screen. Very long file names are cut short with "…" and the full name shows when you hover over it.
- Both changes were the user's decisions that differ from the design, recorded in the design digest under "Your Decisions".

## Manual-test fix: download name and automatic refresh
- Download original now saves the file under its real name (for example "GLC Nominal daily data current month.xlsx"). The service doesn't send a file name for this download, so the browser was saving it as "original". The app now uses the name it already shows in the file details.
- The File log now checks for updates every 10 seconds the whole time it's open, not only while a file is Processing. A file dropped into the Inbox shows up by itself within about 10 seconds. Checking pauses while the browser tab is hidden and runs immediately when you come back. A newly arrived file shows as a new row with no message; "Import complete." or "Import failed. See the file log for details." still appears only when a file the page already saw as Processing finishes. This replaces the earlier behaviour (polling stopped once nothing was Processing) — a user decision from manual testing.
