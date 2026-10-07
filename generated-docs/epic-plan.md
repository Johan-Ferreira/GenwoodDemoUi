# Epic Plan — BoE Yield Curve Data Solution

Every epic in this project, what it delivers, and what it builds on. Live status
(not started / in flight / done) is shown by `/status` and the dashboard.

> Plan only — edited during planning on `main`, never on an epic branch.

## Epics

| # | Epic | Delivers | Builds on |
|---|---|---|---|
| 1 | App frame and sign-in (`app-shell-and-sign-in`) | One-click sign-in, the Genwood app frame with all six menu items, sign-out, and live data access with consistent loading, error and message handling. | — |
| 2 | File log (`file-log`) | List, filter, page and sort received files; file details with failure cause and import trace; download the original. | App frame and sign-in (`app-shell-and-sign-in`) |
| 3 | Curve data (`curve-data`) | Pick a curve and date to see rates by maturity or across dates, export CSV, follow any rate back to its import. | App frame and sign-in (`app-shell-and-sign-in`), File log (`file-log`) |
| 4 | Overview and yield curve charts (`overview-and-yield-curves`) | At-a-glance overview (latest date, headline rates and change, file counts, spot curves, recent loads) and curve comparison charts. | App frame and sign-in (`app-shell-and-sign-in`), File log (`file-log`) |
| 5 | Workflow monitor and API reference (`workflow-monitor-and-api`) | Trace an import's workflow run step by step with its execution log, move between a file and its run, and the API screen. | App frame and sign-in (`app-shell-and-sign-in`), File log (`file-log`), Curve data (`curve-data`) |
| 6 | Quality check and clean-up (`quality-check-and-clean-up`) | Readability and usability clean-up for non-technical users across Overview, File log, Curve data, Yield curves, Workflow monitor and Import trace: hide technical IDs, friendlier labels, date pickers, tighter filters, row-click focus in the monitor, exception note in audit history. | App frame and sign-in (`app-shell-and-sign-in`), File log (`file-log`), Curve data (`curve-data`), Overview and yield curve charts (`overview-and-yield-curves`), Workflow monitor and API reference (`workflow-monitor-and-api`) |
| 7 | Row-level import errors (`row-level-import-errors`) | From a file's details in the File log, open a data grid of the source rows that failed validation or transformation, with row number, observation date and the reason, so users can find and fix the row in the original file. | App frame and sign-in (`app-shell-and-sign-in`), File log (`file-log`) |

## Coverage

Everything in the spec is assigned to an epic:

| What you asked for | Epic |
|---|---|
| Sign-in, app frame, sign-out, no role restrictions (R1–R4) | App frame and sign-in (`app-shell-and-sign-in`) |
| Live data access, downloads layer, errors, loading, messages (R5–R10) | App frame and sign-in (`app-shell-and-sign-in`) |
| Status chips, spoken labels, session limits, speed budgets, look and feel, wording, accessibility (R11–R17) | App frame and sign-in (`app-shell-and-sign-in`) |
| File list, filters, status rules, paging, sorting, empty and no-match states (R18–R28) | File log (`file-log`) |
| File details, audit history, failure cause, original download, import trace, import messages, current marker (R29–R37, R39) | File log (`file-log`) |
| Curve catalogue, maturities, rates for a date, dates available, no-data message, percent labels (R40–R46) | Curve data (`curve-data`) |
| Rates by date, by-date layout, CSV export, rate-to-import link (R47–R51) | Curve data (`curve-data`) |
| Overview: latest date, headline rates, file counts, spot curves, last five files (R52–R57) | Overview and yield curve charts (`overview-and-yield-curves`) |
| Yield-curve chart and comparisons (R58–R61) | Overview and yield curve charts (`overview-and-yield-curves`) |
| Workflow runs list, steps, execution log, not-found messages, file/run links, audit history (R62–R69) | Workflow monitor and API reference (`workflow-monitor-and-api`) |
| API reference screen (R70) | Workflow monitor and API reference (`workflow-monitor-and-api`) |

_69 requirements, all assigned. The prototype's "Import file" dialog (R38) was dropped by decision at intake: the app is read-only and files arrive through the Inbox pickup outside it._
