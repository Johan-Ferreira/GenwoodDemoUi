# Epic brief: Quality check and clean-up

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** app-shell-and-sign-in, file-log, curve-data, overview-and-yield-curves, workflow-monitor-and-api (all already merged).

---

## Goal

Make the existing screens easier to read and use for non-technical business users. This epic changes screens that already exist: it hides or renames technical identifiers (WOID, workflow instance), adds date pickers to the file log date filters, tidies filter and column layout, makes selecting a process instance behave like arriving from the file log, and shows a failed file's exception note in the workflow Audit history.

Scope by screen: Overview, File log, Curve data, Yield curves, Workflow monitor, Import trace. The epic adds no new data, endpoints or roles. Everything is read from the live service through the existing API client.

---

## Data Model

No new entities and no changes to existing ones. The epic reuses these existing fields:

- **File** (`FileDetailRead`): `Woid` (shown to users as "Staging instance ID" in the file log detail view), `WorkflowInstanceId` (shown as "Rate load instance ID"), `ExceptionNote` (optional text, the source for R11), `Status`.
- **ProcessInstance / ProcessInstanceDetail**: `ProcessInstanceId`, `ProcessName`, `CurrentStatus`, `FinishedAt`, `FaultedAt`, `LastExecutedActivityName`, `Steps[]`. Used to decide whether a run is an ImportFile run that failed to finish.
- **ImportTrace** (`ImportRead`): `File`, `ProcessInstance`, `RatesCount`, `CurvesCount`. Used to resolve an ImportFile run to its file log entry (an ImportFile run's `ProcessInstanceId` equals `File.Woid`).

---

## Functional Requirements

- **R1** Overview: the "Recent loads" datagrid no longer shows the "WOID" column.
- **R2** Overview: after the WOID column is removed, the columns after "File" are not pushed far to the right. Their padding is increased so they fill the freed space.
- **R3** File log: the main file log datagrid no longer shows the "WOID" column.
- **R4** File log: in the detail view that opens when a file log entry is clicked, the WOID labels are kept but renamed. "WOID" is shown as "Staging instance ID" and "Workflow instance" is shown as "Rate load instance ID".
- **R5** File log: the "Received from" and "Received to" filter boxes offer a date picker. When the picker opens it shows the current month (today's month) by default.
- **R6** Curve data, "By maturity" view: the "Source Import (WOID)" column has no header text. The links in that column read "View Import Trace" for every row, and still open the same import trace as before when clicked.
- **R7** Yield curves: the "Valuation date" and "Compare with" filter date pickers sit closer together. "Compare with" appears beside "Valuation date" and no longer drops below its label.
- **R8** Workflow monitor: clicking a row in the "Process instances" grid narrows the grid to that one record. Its details appear below and the "Show all process instances" button is visible, the same as when the page is opened from the file log. Using that button restores the full list.
- **R9** Workflow monitor: the "Audit history" panel shows the file log entry's exception note when the selected run is an ImportFile run that failed to finish and the file log entry has an exception note.
- **R10** Import trace: the "WOID" row in the "File log entry" panel is hidden. The Instance ID rows in the panels below it stay.

(R1..R10 are local to this epic, one per request bullet in the order given.)

---

## Business Rules

- **BR1** WOID is hidden or renamed only where listed in R1, R3, R4, R6 and R10. Everywhere else, the underlying values, links and deep links (for example "Open workflow" and "Open file log entry") keep working unchanged.
- **BR2** Renamed labels are fixed text: "Staging instance ID" replaces "WOID" and "Rate load instance ID" replaces "Workflow instance" in the file log detail view. The values shown are unchanged.
- **BR3** Date pickers open on the current month (today's month) when no date is chosen. If a date is already chosen, the picker may open on that date's month. A chosen date still filters the list exactly as the typed date did.
- **BR4** The exception note appears in Audit history only when all three hold: the run is an ImportFile process, it failed to finish, and the file log entry has an exception note. In every other case, Audit history is unchanged and shows no empty placeholder for the note.
- **BR5** Selecting a process instance in the Workflow monitor behaves like arriving from the file log: the grid shows only that instance, with its steps, execution log and audit history below.
- **BR6** The "View Import Trace" link text is fixed text, not data driven. The link target is unchanged.

---

## Key Workflows

**Read the file log without technical identifiers**
1. The presenter opens the File log and sees the file log datagrid without a WOID column.
2. The presenter filters by "Received from" and "Received to", choosing dates from a date picker that opens on the current month.
3. The presenter clicks a file log entry. The detail view lists "Staging instance ID" and "Rate load instance ID".

**Drill into a process instance**
1. The presenter opens the Workflow monitor and clicks a row in "Process instances".
2. The grid narrows to that instance. Details appear below and "Show all process instances" is visible.
3. For a failed ImportFile run whose file has an exception note, the Audit history panel also shows that note.
4. The presenter chooses "Show all process instances" to return to the full list.

**Open an import trace from curve data**
1. The presenter views Curve data "By maturity" and clicks "View Import Trace" in the headerless source column.
2. The import trace opens. Its "File log entry" panel has no WOID row, and the Instance ID rows in the panels below remain.

---

## Feature NFRs

- **NFR-1** Readability for non-technical users is the guiding principle: plain-language labels and no raw technical identifiers where a business user would not need them.
- **NFR-2** Date pickers are keyboard operable and labelled, meeting the WCAG 2.1 AA baseline (NFR-base-1).
- **NFR-3** The hidden "WOID" columns and the headerless link column stay accessible. Each "View Import Trace" link is a real link with that text as its accessible name, and the column stays understandable to screen readers.
- **NFR-4** No change to loading, error or empty-state behaviour on any affected screen. Existing retry affordances (NFR-base-5) continue to work.
- **NFR-5** Any new spacing, colour or text styling uses the existing design tokens in `globals.css` (styling-centralisation policy). No hex literals in components.

---

## Out of Scope

- New data, endpoints, screens or roles.
- Changing what is stored or returned by the service, or how WOIDs are generated.
- Hiding or renaming WOID anywhere not listed (for example in the API reference or in deep-link URLs).
- Redesigning the screens beyond the listed layout changes.
- Tablet and mobile layouts (the design stays desktop-only).

---

## Notes & Caveats

- **Date picker and existing filter format:** the "Received from" and "Received to" boxes currently take typed dates. Keep the existing filter value format and behaviour when switching to a picker. Typing a date remains acceptable if it is cheap to keep, but the picker is the required behaviour.
- **Process instance selection vs deep link:** the file log's "Open workflow" already opens the Workflow monitor with the grid showing only the file's own run and a "Show all process instances" button. Selecting a row (R8) reuses that same state rather than building a second mechanism. The selected instance should stay deep-linkable.
- **Exception note source:** the note is on the file log entry (`File.ExceptionNote`). An ImportFile run resolves to its file because its `ProcessInstanceId` equals `File.Woid`. A run that has no import (for example LoadYieldCurves) never shows a note. Fetching the file is read-only and goes through the existing import lookup (`GET /v1/imports/{Woid}`), and a failed lookup must not break the Audit history panel.
- **"Failed to finish" test:** the live service never reports "Faulted"; a failed RateLoad run is Finished with last activity "Error", and a stalled ImportFile run may be left Running or Suspended. How "failed to finish" is detected for an ImportFile run (status not Finished, a faulted step, or a faulted or error indicator) should be settled in the stories. The decision recorded is that the note shows when the run did not finish successfully and a note exists.
- **Column spacing on Overview:** spreading the remaining columns needs a visual check against the design (Recent loads table of 5 files) so the table keeps its alignment and number columns stay right-aligned with tabular figures.
- **Yield curves filter layout:** only the spacing and wrap behaviour of the two date filters change. The filters' behaviour, labels and available dates are unchanged.
- **Tests:** existing tests that assert the WOID column, the old detail labels or the old link text will need updating as part of this epic.

---

## Open Questions (for the stories approval)

1. **Typed entry on date filters:** keep typing as well as the picker on "Received from" and "Received to", or picker only?
2. **"Failed to finish" definition:** confirm the exact condition used to decide that an ImportFile run failed to finish (see Notes).
3. **Exception note display:** shown as a labelled row or note block inside Audit history. Confirm the label wording (for example "Exception note").
4. **Headerless link column:** confirm the column has an empty header (nothing rendered) rather than a visually hidden label, and its position in the table.
