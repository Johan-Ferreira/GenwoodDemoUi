# Epic brief: Workflow monitor and API reference

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** app-shell-and-sign-in, file-log, curve-data.

---

## Goal

The presenter traces any import's workflow run step by step with its execution log, moves between a file and its run, and shows the API that actuarial models use for the same data.

This epic delivers two screens in the signed-in shell: the **Workflow monitor** (process instances, step pipeline, execution log) and the **API** reference (curve and valuation date choices, endpoints table, example request and response). Both read the live, read-only data service (`GET /v1/process-instances`, `GET /v1/process-instances/{Id}`, `GET /v1/process-instances/{Id}/execution-logs`, `GET /v1/imports/{Woid}`; the API screen is display-only reference content). Source requirements: F-12, F-13, F-14, UI-10, UI-11, BR-12, section 6.9 and the process-instance / API sections of the design digest.

---

## Data Model

Entities this epic reads (from `documentation/CurveData.yaml`, authoritative; the digest's inferred shapes are overridden where they differ). All fields arrive as strings unless noted; dates are `YYYY-MM-DD HH:MM:SS` UTC text.

- **ProcessInstance** (list row, `ProcessInstanceRead`): `ProcessInstanceId`, `ProcessName`, `ContextId` (the WOID of the import), `CurrentStatus`, `CreatedAt`, `LastExecutedAt`, `FinishedAt`, `CancelledAt`, `FaultedAt`, `LastExecutedActivityName`. List envelope `ProcessInstanceReadList`: `ProcessInstances`, `TotalItems`, `Page` (1-based), `Size`.
- **ProcessInstanceDetail** (`ProcessInstanceDetailRead`): the same fields plus `Steps[]`, each `{ Name, State }`.
- **ExecutionLogEntry** (`ExecutionLogRead`): `Timestamp`, `ActivityName`, `EventName`, `Message` (optional). Envelope `ExecutionLogReadList`: `ExecutionLogs`.
- **ImportTrace** (`ImportRead`, used to resolve a run to its file): `File` (`FileDetailRead`, includes `Id`, `FileName`, `Woid`, `Status`, `WorkflowInstanceId`, `ExceptionNote`), `ProcessInstance`, `RatesCount`, `CurvesCount`.
- **Message** (error body): `{ Message }`, used by the 404 responses ("Process instance not found", "Import not found").
- **Curve** (for the API screen's Curve choice): `Code`, `Name`, `Family`, `RateType`, `Segment`, `RateUnit`, `Provider`, read from `GET /v1/curves` (already consumed by the curve-data epic; reuse its client and the 16-curve list).

Enumerations and observed vocabularies:

- Process `CurrentStatus`: Idle, Running, Suspended, Finished, Cancelled, Faulted (requirements). The design only styles Finished, Faulted and Running; the others need a neutral badge (see Notes).
- Step `State`: Pending, Running, Completed, Faulted (requirements and spec example "Completed").
- Log `EventName`: spec example "Completed"; the design shows Started / Completed / Faulted.

---

## Functional Requirements

- **R1** The user can list process instances with paging (page size choice of 5, 10, 20 or 50, default 20) and filter them by status or by process name; only matching instances are listed. The list is ordered newest first. (F-12)
- **R2** When a process instance is opened (selected), the system lists its steps with their states, shown as a pipeline of step tiles, each with its position number, state label and step name. Tile tint follows state (Completed success, Faulted danger, Running info, otherwise neutral) and the state is always conveyed by its text label as well as colour. (F-13, UI-11)
- **R3** A step that has not run yet shows the state "Pending". (BR-12)
- **R4** The system shows the execution log of the selected process instance with time, activity, event and message per entry, oldest first. (F-14)
- **R5** When the execution log has no entries, the system shows "No log entries exist" with a route back to the file details of the instance's file.
- **R6** When the process instance does not exist (404 from the service), the system shows "Process instance not found" with a route back to the process instance list.
- **R7** The user can move between a file and its run: from a file's details, "Open workflow" opens the Workflow monitor with that file's process instance selected (using the file's `WorkflowInstanceId`); from a selected process instance, "Open file log entry" opens the File log with that instance's file selected (resolved from `ContextId` as the WOID). The process instance view also offers a workflow monitoring link. (UI-10)
- **R8** The process instance's audit history is visible: status, created / last executed / finished / cancelled / faulted timestamps, last executed activity, steps and execution logs. All history remains visible in the process instance list and details. (section 6.9)
- **R9** The API reference screen offers a "Curve" choice (all 16 curves) and a "Valuation date" choice, shows an endpoints table (method and path) and an example request and response for the chosen curve and date. The endpoints and example address show the live service's paths (`/v1/...` under the service base address), not the prototype's example address.

(Ordering note: R1..R9 are local to this epic; the assigned inventory IDs map as R62..R70 in order.)

---

## Business Rules

- **BR1** A step that has not run yet is shown as Pending (source BR-12). Step names are rendered as supplied by the service.
- **BR2** The execution log is always shown oldest first, regardless of any other sorting on the process instance list.
- **BR3** A process instance is linked to its file by the WOID: `ProcessInstance.ContextId` equals `File.Woid`; a file is linked to its run by `File.WorkflowInstanceId`. If a link target cannot be resolved, the user sees the matching "not found" message with a route back, never a raw error.
- **BR4** Process-instance status chips follow intent with a text label (Finished success, Faulted danger, Running info, others neutral) and colour is never the only cue (source UI-14).
- **BR5** A failed or faulted run shows the failing activity's message in the log so the cause can be read (source flow "Follow a failed import to its cause").
- **BR6** The API screen shows only the live service's operations, which are read-only (GET). It never presents the prototype's example address or its four-endpoint illustrative contract as the contract.
- **BR7** No role restrictions apply; every function is available to the demo presenter (source BR-10).

---

## Key Workflows

**Trace an import's run**
1. The presenter opens Workflow monitor from the side navigation.
2. The process instance table lists runs, newest first; the presenter optionally filters by status or process name and pages through.
3. The presenter selects an instance; the step pipeline and the execution log appear below the table.
4. The presenter reads each step's state and each log entry (time, activity, event, message), oldest first.
5. The presenter chooses "Open file log entry" to jump to the file this run processed.

**Follow a failed import to its cause** (continues from the file-log epic)
1. In the File log the presenter opens a failed file and chooses "Open workflow".
2. The Workflow monitor opens with that file's instance selected, showing the faulted step and Pending steps after it.
3. The presenter reads the failing activity's message in the log, then returns to the file via "Open file log entry".

**Recover from a missing run or log**
1. The presenter opens a run whose instance does not exist: sees "Process instance not found" and chooses the route back to the list.
2. The presenter opens a run with no log entries: sees "No log entries exist" and chooses the route back to the file details.

**Show the API to actuarial model consumers**
1. The presenter opens API from the side navigation.
2. The presenter chooses a curve and a valuation date.
3. The endpoints table lists the live service's operations; the example request and response update to the chosen curve and date.

---

## Feature NFRs

- **NFR-1** Process instance and log tables render within 500 ms for 200 records at p95 (source section 6.6.2).
- **NFR-2** Loading states: nothing shown under 300 ms, a skeleton up to 3 s, then a skeleton with a message (source UI-17). A skeleton is shown while steps and logs load.
- **NFR-3** Service errors on the process instance list, detail and log calls show a persistent message with a retry action (inherits NFR-base-5).
- **NFR-4** Lists support ascending-then-descending sorting per column with the active sort indicated (source UI-13) for the process instance table; the execution log stays fixed oldest first (BR2).
- **NFR-5** Calls to the service go through the project's API client and the Next.js proxy (NFR-base-6); `SizeBytes`-style nullable text fields and missing timestamps (`CancelledAt`, `FaultedAt`, `FinishedAt`) are handled explicitly as absent.
- **NFR-6** Filtered lists with no results show the active filters and a clear-all action; an empty list names its entity ("process instances") (source UI-15, UI-16).

---

## Out of Scope

- Starting, cancelling, retrying or otherwise controlling a workflow; the frontend only shows state (requirements assumption on the workflow engine).
- Importing a file (the Import file dialog and its simulation); handled, or excluded, in the file-log epic.
- Real authorisation or role switching.
- Calling the example API endpoints from the API screen (it is reference content; the live service has no write operations).
- Date-range filtering of process instances (the service only filters by status and process name).

---

## Notes & Caveats

- **Do NOT carry forward from the prototype:** the five canned process instances and their canned logs; the simulated 2 s run resolution; the hard-coded step message templates ("26 source rows", "5,460 rates", "260 tenors across 4 curves and 21 valuation dates", "/yield-curves/v1"); the example API address `https://api.genwood-demo.example/yield-curves/v1` and the illustrative four-endpoint contract (`/curves`, `/curves/{code}/tenors`, `/curves/{code}/rates`, `/imports/{woid}` without `/v1` and with an `observationDate` parameter); the prototype's Windows paths; synthetic example response values. Use live data and the live paths from `documentation/CurveData.yaml`.
- **Live paths for the API screen** (under the service base `http://localhost:10020/curve-data`): `GET /v1/overview`, `/v1/files`, `/v1/files/{Id}`, `/v1/files/{Id}/original`, `/v1/curves`, `/v1/curves/{Code}/tenors`, `/v1/curves/{Code}/rates?ObservationDate=...`, `/v1/curves/{Code}/rate-matrix`, `/v1/curves/{Code}/availability`, `/v1/curves/compare`, `/v1/curves/{Code}/rates.csv`, `/v1/process-instances`, `/v1/process-instances/{Id}`, `/v1/process-instances/{Id}/execution-logs`, `/v1/imports/{Woid}`. Which subset the endpoints table lists is not fixed (see Open Questions). The example response should reflect the real `RateReadList` shape (`{ Rates: [{ TenorLabel, TenorYears, RatePercent, SourceRowId, Woid }] }`), ideally from a live call, not the prototype's invented wrapper (`curve`, `source`, `count`, `note`). The `ObservationDate` query parameter name and PascalCase fields come from the spec.
- **Data mismatches between design and live service:**
  - Process name is "ImportCurveFile" in the spec example; the design shows "BoE yield curve import". Show what the service returns.
  - Step states from the service are Pending / Running / Completed / Faulted; the design labels are Done / Faulted / Running / Not run. Requirements (BR-12) require "Pending", so use the service vocabulary and map tile styling only.
  - The service returns step names such as "PublishRates", the design shows seven human step names ("Receive file" ... "Publish to API"). The service's step set and order drive the pipeline; do not hard-code seven tiles. Any friendlier display naming is a design decision to confirm.
  - Log event names come as "Completed" etc.; the design strips an "Activity" prefix. Handle both forms.
  - Process instance IDs are 32-hex strings; the design truncates to 12 characters plus an ellipsis.
  - The design's "Last activity" column maps to `LastExecutedActivityName`.
- **"Open workflow" entry point** lives in the file-log epic's file detail panel; this epic owns the destination (Workflow monitor with a deep-linkable selected instance, so the file-log epic can link in) and the return link.
- **Footer copy "From ProcessExecutionLogsView"** exposes a database view name; see Open Questions.
- Desktop-only layout per the design; the step pipeline is a multi-column tile grid sized to the number of steps returned.

---

## Open Questions (for the stories approval)

1. **Workflow monitoring link (UI-10):** the requirements say a "link to workflow monitoring" opens from a process instance, but no external monitoring URL is given in the spec or project facts. Is this the in-app Workflow monitor (assumed here), or an external workflow-engine monitoring address that must be supplied?
2. **Process name filter source:** the service takes a free-text `ProcessName`. Should the filter be a text input, or a select built from names seen in the list (only one name is likely)?
3. **Step display names:** show the service's raw step names (e.g. "PublishRates") or map them to the design's friendlier names?
4. **Statuses beyond Finished / Faulted / Running** (Idle, Suspended, Cancelled): confirm neutral styling and labels.
5. **API screen scope:** list all 15 live operations, or the four-endpoint subset the design shows (with `/v1` paths)? Should the example response come from a live call for the chosen curve and date, or from a static documented example?
6. **Internal view name** in the Execution log subtitle ("From ProcessExecutionLogsView"): keep, or replace with a plain subtitle?
7. **Empty states** with no instances (nothing designed): assumed "No process instances found." naming the entity (UI-15).
