# Epic brief: Row-level import errors

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** app-shell-and-sign-in (app shell, toast, API client and rewrite proxy) and file-log (file details, import trace, original download).

---

## Goal

From the details of a Failed file in the File log, the presenter can open the row-level errors of that file's import: a data grid of the source rows that failed, each with its row number, observation date and the reason it failed. The action sits next to the existing import trace and download original actions, so the presenter can read a failed row's number and then find that row in the original file download.

The app is read-only. The grid shows what the live data service reports.

---

## Data Model

Authoritative source: `documentation/CurveData.yaml` (OpenAPI 3.0.3), served under `http://localhost:10020/curve-data`. The endpoint is new in the spec.

**Import messages, from `GET /v1/imports/{Woid}/messages`** (operationId `ImportMessageGetList`; response `ImportMessageReadList` = `ImportMessages[]`). `Woid` is the 32-hex work object ID already carried by every file (`FileRead.Woid`).

| Field | Type | Notes |
|---|---|---|
| SourceRowNumber | integer | Position of the row in the staged source file, counting the header rows of the sheet. Use it with the original download to find the row |
| ObservationDate | string (optional) | Observation date as staged from the file, for example `2026-09-30`. Not returned when the row has none, so render a neutral placeholder |
| Message | string | Why the line failed, for example "One or more rates is not a valid decimal" |

Rows without a Message are not returned, so an import with no failed lines returns an empty `ImportMessages` list. There are no paging, filter or sort parameters.

**Errors:** 404 returns `Message` = "Import not found" for an unknown import. 401 and 500 are standard (500 carries a `Message` body).

Existing data reused from the file-log epic: `FileDetailRead` (`Woid`, `Status`, `ExceptionNote`) and `GET /v1/files/{Id}/original` for the download.

---

## Functional Requirements

- **R1:** In File log file details, for files with Failed status only, next to the import trace and download original actions, the user can choose an action to view the row-level errors (for example "View row-level errors"). The action is not shown for Imported or any other status.
- **R2:** Choosing it opens a data grid of the failed rows for that file's import, loaded from `GET /v1/imports/{Woid}/messages` using the file's WOID.
- **R3:** The grid shows one row per failed line with three columns: row number (`SourceRowNumber`), observation date (`ObservationDate`) and message (`Message`).
- **R4:** The grid is ordered by row number ascending by default, and the user can sort each column ascending on first choice and descending on second, with the active sort indicated. Sorting runs in the browser.
- **R5:** A row with no observation date shows a neutral placeholder and never breaks the row or the sort.
- **R6:** The grid explains how to use the row number: it is the position in the source file counting the header rows, so the user can find the row in the original download. The original download action is available from the same view or one step away.
- **R7:** While the messages load, a skeleton is shown (nothing under 300 ms, a skeleton up to 3 s, then a skeleton with a message).
- **R8:** When a Failed file's list comes back empty, the grid is replaced by a factual empty state such as "No failed rows."
- **R9:** When the import does not exist (404), the message "Import not found" is shown with a route back to the file list.
- **R10:** For any other failure (401, 500, network), a persistent error message with a retry action is shown, reporting what happened.
- **R11:** The user can return from the row-level errors to the file's details.

---

## Business Rules

- **BR1:** The grid displays only what the service returns. The UI never infers, filters or invents failed rows, and an empty list means "no failed rows", not an error.
- **BR2:** The row number is shown exactly as returned. The UI does not offset or renumber it, because it already counts the header rows of the source sheet.
- **BR3:** The WOID used for the request is the file's full `Woid`, not the 8-character form shown in the file table.
- **BR4:** A 404 shows the specific "Import not found" message, not a generic error. Other failures show a persistent message with a retry action. (NFR-base-5)
- **BR5:** The action is shown only for files with Failed status. It is hidden for Imported and every other status, even when the file has a WOID.

---

## Key Workflows

1. **Find the failed rows of an import.**
   1. Open File log and open the details of a Failed file.
   2. Choose "View row-level errors"; the grid of failed rows is shown with row number, observation date and message.
   3. Sort by a column if needed.
2. **Locate a failed row in the source file.**
   1. From the row-level errors, note a row number.
   2. Download the original file (same view, or back in the file details).
   3. Open the download and go to that row number, counting the header rows.
3. **Import with no failed rows.**
   1. Choose "View row-level errors" for a Failed file whose list comes back empty.
   2. "No failed rows." is shown instead of the grid.
4. **Unknown import or service failure.**
   1. If the import does not exist, "Import not found" is shown with a route back to the file list.
   2. For other failures, an error message with a retry action is shown.

---

## Feature NFRs

- **NFR-1:** The grid and its states follow the shared patterns already used by the file log: skeleton timing, persistent error with retry, and "not found" with a route back.
- **NFR-2:** Row number and observation date use mono tabular figures. Long messages wrap and stay readable without horizontal scrolling at desktop width.
- **NFR-3:** The grid renders the returned rows within the project 500 ms render budget. The service returns no paging, so the grid must stay responsive for several hundred rows.
- **NFR-4:** The action and grid are keyboard operable and labelled for screen readers. Icon-only controls carry a text label. Sort state is not conveyed by colour alone.
- **NFR-5:** Copy follows the application voice: calm, precise, plain English, no exclamation marks, errors say what happened and then what to do.

---

## Out of Scope

- Editing, correcting, re-importing or dismissing failed rows. The app is read-only.
- Server-side paging, filtering or sorting (the endpoint offers none).
- Exporting the failed rows (for example to CSV). Not requested.
- Highlighting or opening the failed row inside the downloaded file. The user finds it by row number.
- Changes to the import trace, original download, file list or status derivation beyond adding the new action.

---

## Notes & Caveats

- **Row-number semantics.** `SourceRowNumber` counts the header rows of the sheet, so it matches the row number a spreadsheet application shows in the original xlsx download. Say so in the grid's helper text so the user is not tempted to subtract.
- **Placement is open.** The request says the data should sit close to where the source file can be downloaded. Whether the grid is an inline panel in the file details, a dialog/sheet, or its own route keyed by WOID (like the trace view) is decided at the stories approval. Any of them satisfies R1 to R11 provided the original download stays reachable. A route would reuse the "Import not found" pattern from the trace.
- **Visibility of the action (BR5).** Decided: the action appears only for Failed files. Imported files do not show it, so any skipped lines on an Imported file are not reachable from this view. The empty-list state still applies to a Failed file whose list comes back empty.
- **Design gap.** The prototype has no row-level errors view. Design the grid in the prototype's visual language using the Shadcn table primitives and tokens, and the existing file-log table styling.
- **Spec change not yet committed.** The endpoint definition currently exists as an uncommitted edit to `documentation/CurveData.yaml` in the main working tree. The canonical spec and generated API types must include `ImportMessageGetList` before BUILD.
- **Not smoke-tested.** The new endpoint has not been verified against the running service in this intake. Verify the empty list and the 404 body during BUILD, and report actual errors rather than assuming.
