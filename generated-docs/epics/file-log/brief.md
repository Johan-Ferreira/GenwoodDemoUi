# Epic brief: File log

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** app-shell-and-sign-in (app shell, side navigation, toast, API client and rewrite proxy).

---

## Goal

The presenter lists every received file with its import status, filters, pages and sorts them, opens a file's details (including why it failed and its import trace), and downloads the original.

The app is read-only. Files arrive through the Inbox pickup outside the app, so the file log shows what the live data service reports and never creates or imports a file.

---

## Data Model

Authoritative source: `documentation/CurveData.yaml` (OpenAPI 3.0.3), served under `http://localhost:10020/curve-data`. It takes precedence over the digest's inferred shapes.

**File (list row), from `GET /v1/files`** (`FileRead`; response `FileReadList` = `Files[]`, `TotalItems`, `Page`, `Size`):

| Field | Type | Notes |
|---|---|---|
| Id | integer | File log entry ID |
| FileName | string | e.g. "GLC Nominal daily data current month.xlsx" |
| CurveFamily | string | Nominal / Real / Inflation / OIS |
| ReceivedAt | string | `YYYY-MM-DD HH:MM:SS` |
| SizeBytes | string (nullable) | Typed as text in the spec; parse to a number, handle null/missing explicitly |
| RecordCount | integer | |
| RecordsInserted | string (nullable) | Typed as text; parse, handle null/missing explicitly |
| Woid | string | 32-hex; the table shows the first 8 characters |
| Status | string | Derived by the service: Imported / Failed / Processing |
| IsCurrent | boolean | |

**File detail, from `GET /v1/files/{Id}`** (`FileDetailRead`): all `FileRead` fields plus WorkflowInstanceId, InboxLocation, BackupFileName, Sha256 (show "Not recorded" when absent), ExceptionNote, CreatedBy. A 404 returns `Message` = "File not found".

**Original download, from `GET /v1/files/{Id}/original`:** binary (`application/octet-stream`). A 404 returns `Message` = "File not found". This does not fit the JSON-only API client, so it needs a dedicated download path.

**Import trace, from `GET /v1/imports/{Woid}`** (`ImportRead`): `File` (FileDetailRead), `ProcessInstance` (ProcessInstanceDetailRead: ProcessInstanceId, ProcessName, ContextId, CurrentStatus, CreatedAt, LastExecutedAt, FinishedAt, CancelledAt, FaultedAt, LastExecutedActivityName, Steps[]), `RatesCount`, `CurvesCount`. A 404 returns `Message` = "Import not found".

**Query parameters on `GET /v1/files`:** `Status`, `CurveFamily`, `ReceivedFrom` (YYYY-MM-DD, UTC), `ReceivedTo` (YYYY-MM-DD, UTC), `Page` (1-based), `Size`. There is no sort parameter.

---

## Functional Requirements

- **R1:** The file log lists every received file, newest first, in pages. Each row shows ID, file, curve family, received time, size, records inserted, WOID and status. (F-09)
- **R2:** The user can filter the list by status, curve family and received date range (from and to). (F-09, UI-03)
- **R3:** The received-date filters accept `YYYY-MM-DD`. Any other entry shows the message "Enter the date as YYYY-MM-DD." and does not run the filter. (§6.3)
- **R4:** Each file shows exactly one status: Imported, Failed or Processing. The status is derived and never entered by the user. (UI-02, BR-02)
- **R5:** A file is Failed when its workflow instance is faulted or cancelled, or the file carries an exception note. (BR-03)
- **R6:** A file is Imported when its latest workflow instance is finished and the file carries no exception note. (BR-04)
- **R7:** A file is Processing when it is neither finished nor failed. (BR-05)
- **R8:** The page size offers 5, 10, 20 and 50, with 20 as the default. (UI-12)
- **R9:** Every column can be sorted ascending on first choice and descending on second, and the active sort is indicated. The API has no sort parameter, so sorting runs in the browser. (UI-13)
- **R10:** When no files exist, the empty list names files (a factual line such as "No files have been received yet."). (UI-15)
- **R11:** When filters match nothing, the list shows the active filters and a clear-all action. (UI-16)
- **R12:** The user can open a file's details, showing file name, curve family, received time, size, record counts, status, workflow instance, locations (Inbox and backup), SHA-256 hash and exception note. (F-10)
- **R13:** The file's audit history is visible: received time, status, record counts, exception note, content hash and created-by. (§6.9)
- **R14:** For a failed import the details show why it failed: the exception note (for example "Row 12: invalid rate") followed by "Fix the source file or re-import once the Bank of England republishes it." (F-16)
- **R15:** The user can download the original (backed-up) source file of a file. (F-11, UI-19)
- **R16:** When the file record does not exist, the message "File not found" is shown with a route back to the file list.
- **R17:** The user can trace a file to its import, showing its file log entry, its workflow instance, and the counts of rates and curves produced. (F-15, UI-09)
- **R18:** When no import exists for the chosen identifier, the message "Import not found" is shown with a route back to the file list.
- **R19:** When a file's status becomes Imported, the app shows the transient message "Import complete." (NT-01)
- **R20:** When a file's status becomes Failed, the app shows an import-failed message (NT-02), for example "Import failed. See the file log for details." The file list checks the service at intervals to detect these changes.
- **R21:** The file that is the current version is marked " · current" in its details subtitle (for example "File log entry 101 · Imported · current").

---

## Business Rules

- **BR1:** Status is never entered or computed from user input. The UI displays the `Status` the service derives (R4 to R7) and filters by sending it as the `Status` query parameter.
- **BR2:** Status is always shown as a labelled badge. Colour follows intent (Imported success, Failed danger, Processing info) and is never the only cue. (UI-14)
- **BR3:** The "current" marker follows the service's `IsCurrent` flag only. The UI does not infer it.
- **BR4:** Absent or null `SizeBytes` and `RecordsInserted` render as a neutral placeholder and never break the row or the sort.
- **BR5:** The exception note and its guidance line appear only when the file has failed.
- **BR6:** A 404 from the file, original or import endpoints shows the specific "not found" message, not a generic error. Other failures show a persistent error message with a retry action. (NFR-base-5)

---

## Key Workflows

1. **Follow a failed import to its cause.**
   1. Open File log.
   2. Filter by status Failed; only failed files are listed.
   3. Open a failed file; its exception note and the guidance line are shown.
   4. Open its import trace to see the file log entry, workflow instance and counts.
2. **Trace an import from the file.**
   1. Open a file's details.
   2. Open the import trace for its WOID; the file log entry, workflow instance and rates and curves counts are shown.
   3. If the import does not exist, "Import not found" is shown with a route back to the file list.
3. **Download the original.**
   1. Open a file's details.
   2. Choose "Download original"; the backed-up source file downloads.
   3. If the record is missing, "File not found" is shown with a route back.
4. **Browse and narrow the list.**
   1. Open File log; the newest 20 files are shown.
   2. Change page size, page, sort column or filters.
   3. When filters match nothing, use "Clear all" to restore the list.
5. **See an import finish.**
   1. Keep the file log open (a newly dropped file appears in the list by itself).
   2. The list checks the service every 10 s while the tab is visible and shows "Import complete." or the failure message when a file it saw as Processing changes status.

---

## Feature NFRs

- **NFR-1:** The file list and file details show a skeleton while loading: nothing under 300 ms, a skeleton up to 3 s, then a skeleton with a message. (UI-17)
- **NFR-2:** Completed actions (for example a download) appear as transient messages. States needing action (service errors) appear as persistent messages. (UI-18)
- **NFR-3:** The table renders 50 rows within the 500 ms budget at p95 (project target: 200 records in 500 ms).
- **NFR-4:** Status is conveyed by label as well as colour. Icon-only controls carry a text label that screen readers announce.
- **NFR-5:** Copy follows the application voice: calm, precise, plain English, no exclamation marks, errors say what happened and then what to do.

---

## Out of Scope

- **Importing a file from within the app (user decision at intake).** The prototype's "Import file" button, dialog and import simulator are removed entirely. Files arrive through the Inbox pickup outside the app, and the app is read-only.
- Re-import actions and a Table/Chart toggle on file details (from the superseded UI kit).
- Server-side sorting (the API offers none).
- The Overview "Recent loads" table and file counts (separate epic).
- The Workflow monitor and its process-instance list, step pipeline and execution log (separate epic). The file details may link to it, but the destination is built there.
- Curve data and charts (separate epics). A "View data" link from the file details is delivered with the curve data epic.
- Real authentication (handled by app-shell-and-sign-in).

---

## Notes & Caveats

- **Sorting scope.** Because the API has no sort parameter and returns pages, browser sorting can only order the rows of the page currently loaded. Sort order therefore does not span pages. Confirm at the stories approval whether this is acceptable, or whether the epic should load all files (the volume is small) and page, filter and sort in the browser.
- **Polling interval (R19, R20).** The requirements say the list "checks the service at intervals" but give no interval. Use 10 s. Polling continues for as long as the File log is visible, whether or not any file is Processing, so newly dropped files appear without a manual refresh (user decision at manual test, 2026-10-04); it pauses while the tab is hidden and refreshes immediately when visible again. A file that newly appears never raises a notice. The transition must be detected by comparing against the previously seen status, so the message does not repeat on every poll or on first load.
- **Date-range semantics.** Verified against the live service during BUILD: both `ReceivedFrom` and `ReceivedTo` are inclusive of the whole day (files received 2026-10-02 at 09:09–09:27 are returned by `ReceivedTo=2026-10-02` and by `ReceivedFrom=ReceivedTo=2026-10-02`, and not by `ReceivedTo=2026-10-01`). A malformed date (e.g. `04/10/2026`) makes the service fail with an error, so the app never sends one.
- **"Clear all" and invalid dates.** An invalid date entry blocks the request and shows the inline message. It is not sent to the service.
- **Nullable text numbers.** `SizeBytes` and `RecordsInserted` arrive as strings. Parse them, format size as a human-readable value (for example "238.8 KB") in the list and as bytes with thousands separators in the details, and handle null explicitly.
- **Cross-epic links from file details.** The prototype shows "Open workflow" (to the Workflow monitor with this file's process instance selected) and "View data" (to Curve data, disabled when the import failed or is still processing). Both depend on other epics, so wire the destinations when those epics exist, and do not show dead links.
- **Do NOT carry forward to production (translate, don't copy):**
  - The prototype's five canned file-log rows and synthetic workflow logs. Use the live service.
  - The "Import file" button, dialog, "Source file" and "File condition" selects, simulated Processing state and its 2 s timer.
  - The prototype "Download original" toast-only behaviour. Download the real file from `/v1/files/{Id}/original`.
  - Example values such as the Windows Inbox path, "26" records and "5,460 rates". Display what the API returns.
  - Remote CDN icons and fonts, and inline styles. Use local Lucide components, local IBM Plex fonts, Shadcn primitives and design tokens.
- **Design-vs-requirements gaps.**
  - The prototype filters only by status and shows the detail as an inline panel below the table. The requirements add curve family and received-date filters, paging, sorting, and a separate "file not found" and "import not found" route with a way back. Design those additions in the prototype's visual language.
  - The empty state is not designed. The line for no matches is the requirement's "active filters plus clear all", with the readme's "No files match these filters." as the likely wording.
  - Status label text in the prototype is "Imported", "Failed", "Processing", matching the API.
- **Number and date formatting.** Mono tabular figures for ID, file, received time, size, records inserted and WOID. Received time shows `YYYY-MM-DD HH:MM:SS` as returned (24h).
- **Open question for the stories approval.** Whether the trace view (R17) is its own route keyed by WOID (the "Import not found" case suggests so) or a section of the file details. Either satisfies R17 and R18.
