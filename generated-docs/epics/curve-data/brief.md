# Curve data

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** app-shell-and-sign-in, file-log.

## Goal

The presenter picks a curve and valuation date to see the rate at each maturity, or rates across dates for chosen maturities, exports them as CSV, and follows any rate back to the import that produced it.

This epic delivers the "Curve data" view of the app shell: the curve catalogue and its filters, the tenor list, the by-maturity table (one date), the by-date matrix (many dates, chosen tenors), the available-dates helper, the CSV export, and the link from any rate to its source import. The user is the single Demo presenter (no role restrictions).

---

## Data Model

Shapes come from `documentation/CurveData.yaml` (authoritative) and `documentation/requirements.md` section 7. They take precedence over the design digest's inferred shapes.

**Curve** (`GET /v1/curves`, response `Curves[]`): `Id`, `Code` (e.g. `GlcNominalSpotCurve`), `Name`, `Family` (Nominal | Real | Inflation | OIS), `RateType` (Spot | Forward), `Segment` (Long | ShortEnd), `RateUnit` ("Percent"), `Provider`. 16 curves in four families. Filters: query `Family`, `RateType`, `Segment`.

**Tenor** (`GET /v1/curves/{Code}/tenors`, response `Tenors[]`): `TenorId`, `Label` (e.g. `10Y`, `6M`), `Years` (number), `Months` (integer), `SourceColumn` (e.g. `Years10`).

**Rate** (`GET /v1/curves/{Code}/rates?ObservationDate=YYYY-MM-DD`, required; response `Rates[]`): `TenorLabel`, `TenorYears`, `RatePercent` (number, percent), `SourceRowId`, `Woid`. An unknown date returns HTTP 200 with an empty `Rates` array, not an error.

**Availability** (`GET /v1/curves/{Code}/availability`): `MinDate`, `MaxDate`, `Dates[]` (all observation dates with data).

**Rate matrix** (`GET /v1/curves/{Code}/rate-matrix`, query `ObservationDateFrom`, `ObservationDateTo`, `Tenors` as comma-separated labels): `Tenors[]` (labels, column order) and `Rows[]`, each `{ ObservationDate, Rates: [{ TenorLabel, RatePercent }] }`.

**CSV export** (`GET /v1/curves/{Code}/rates.csv?ObservationDate=...`): `text/csv` binary response (not JSON). Content per RPT-01: tenor label, tenor years, rate in percent.

**Import trace** (`GET /v1/imports/{Woid}`): `File` (file detail incl. `Id`, `FileName`, `Woid`, `Status`, `ReceivedAt`, `WorkflowInstanceId`, ...), `ProcessInstance` (detail with `ProcessInstanceId`, `Steps`), `RatesCount`, `CurvesCount`. 404 with `Message` "Import not found" when unknown.

Nullable-as-string fields (`SizeBytes`, `RecordsInserted`, `ChangeBp`) are not used by this epic's views directly.

---

## Functional Requirements

- **R1.** The user can browse the curve list and filter it by family, rate type and segment; only matching curves are listed. (Source R40; F-02, UI-04)
- **R2.** When a curve is opened, the system shows its maturities (tenors) with label, years and months. (Source R41; F-03)
- **R3.** When a curve and an observation date with data are chosen, the system lists one rate per tenor, each with its source column, source row and source import. (Source R42; F-04, UI-05)
- **R4.** The observation date is required in the form YYYY-MM-DD; otherwise the system shows "Enter the observation date as YYYY-MM-DD." (Source R43; section 6.3 validation)
- **R5.** When a curve is chosen, the system offers the earliest date, the latest date and the available dates with data. (Source R44; F-06)
- **R6.** When the chosen date has no imported data, the system shows "No data imported" with an empty rate list instead of an error. (Source R45; BR-01)
- **R7.** Every rate is labelled as percent. (Source R46; BR-07)
- **R8.** The user can see the rates of a curve across a date range for chosen tenors. (Source R47; F-05, RPT-02)
- **R9.** In the by-date matrix, observation dates are rows and the chosen tenors are columns, with each rate matched to its column by tenor label. (Source R48; BR-08)
- **R10.** Tenors for the by-date matrix are entered as comma-separated labels; otherwise the system shows "Separate tenor labels with commas, for example 1Y,5Y,10Y." (Source R49; section 6.3 validation)
- **R11.** The user can export the shown curve and date as a CSV file with tenor label, tenor years and rate in percent, and the system confirms with "CSV export prepared." (Source R50; F-08, UI-08, RPT-01)
- **R12.** From any rate the user can reach the import that produced it: the rate's WOID links to that import's file log entry, with its trace. (Source R51; BR-06, F-15, UI-09)

---

## Business Rules

- **BR1.** A date with no imported data yields an empty rate list and the "No data imported" message, never an error state (R6). The service returns 200 with an empty array for this case.
- **BR2.** Every rate carries the WOID of the import that produced it and its source row, and the user can always reach that import (R3, R12).
- **BR3.** Rates are always stated and labelled in percent (R7).
- **BR4.** In a rate matrix, dates are rows and requested tenors are columns, matched by tenor label, not by position (R9).
- **BR5.** Dates are YYYY-MM-DD in UTC (R4).
- **BR6.** The Demo presenter can use every function here without role restriction.

---

## Key Workflows

**Explore a curve by observation date**
1. Open Curve data and choose a curve from the catalogue (optionally narrowing by family, rate type, segment); its maturities and available dates are shown.
2. Choose an observation date (typed as YYYY-MM-DD or picked from the available dates).
3. The by-maturity table lists one rate per tenor with source column, source row and source import (WOID).
4. If the date has no data, "No data imported" appears with an empty list; choose another available date.

**Compare rates across dates**
1. Switch to the by-date view.
2. Enter a date range and comma-separated tenor labels (e.g. 1Y,5Y,10Y).
3. The matrix shows one row per observation date and one column per chosen tenor.

**Export**
1. With a curve and date shown, choose Export CSV.
2. A CSV file of tenor label, years and rate (percent) is provided and "CSV export prepared." confirms it.

**Trace a rate to its import**
1. In the by-maturity table, choose a rate's WOID link.
2. The File log opens with that import's entry selected (and its trace: file log entry, workflow instance, rates and curves counts).
3. If the import cannot be found, "Import not found" is shown with a way back to the file list.

---

## Feature NFRs

- **NFR-1.** Tables render quickly for the largest case (about 60 monthly short-end or 80 half-year long-end tenors, or a date matrix of up to a few hundred rows) within the 500 ms budget for 200 records at p95.
- **NFR-2.** Loading shows nothing under 300 ms, a skeleton up to 3 s, then a skeleton with a message. A service error shows a persistent message with a retry action (extends NFR-base-5).
- **NFR-3.** Numeric columns use IBM Plex Mono with tabular figures; rates show 4 decimal places per the design.
- **NFR-4.** The by-maturity table has a sticky header and scrolls inside a card of max height 520px.
- **NFR-5.** The transient confirmation for export follows the app's toast pattern (about 2.6 s, bottom-right).

---

## Out of Scope

- Yield curve charts and comparison across dates or families (the separate "Yield curves" view; F-07, UI-06, UI-07).
- File log listing, file detail, original-file download and importing a file (file-log epic).
- Workflow monitor, process instances and execution logs.
- Overview dashboard and API reference views.
- Any write operation: the data service is read-only.

---

## Notes & Caveats

- **Design vs spec.** Where the design digest and `CurveData.yaml` / `requirements.md` differ, the spec wins. The digest's example copy for no-data ("No data has been imported for {curve name} on {date}. ...") reads well but the requirement wording is "No data imported". Confirm final copy at the stories approval.
- **Design shows a single date input and By maturity / By date views.** The by-date view in the design lists key tenors for each date; the requirement (F-05) asks for chosen tenors over a date range via comma-separated labels. Confirm at the stories approval whether the design's fixed key tenors (long end 1Y, 2Y, 5Y, 10Y, 20Y, 30Y; short end 1M, 3M, 6M, 1Y, 2Y, 5Y) serve as the default when no tenors are entered.
- **Tenor grids.** The digest guessed grids (long 0.5-40Y, forwards 0.5-30Y, short end 1-60M). Do not hard-code; use the tenors returned by the service.
- **Catalogue filters.** The design shows a single 16-curve select; the requirement adds family / rate type / segment filters on the catalogue (UI-04). Filter via the service query parameters or in memory (16 records).
- **Valuation date.** Offer the earliest, latest and available dates (R5). Defaulting to the latest available date is a suggestion to confirm.
- **Trace link.** A rate holds a WOID, while the file log is selected by file `Id`. Resolve the WOID to the file via `GET /v1/imports/{Woid}` (returns `File.Id`) or the file log's own WOID match. Handle "Import not found" (404).
- **CSV export is binary.** `rates.csv` returns `text/csv`, which does not fit the JSON-only API client; it needs the dedicated download path noted in project.md. The prototype's toast-only behaviour is NOT to be carried forward: the export must deliver a real file.
- **CORS.** Calls go through the Next.js rewrite proxy (NFR-base-6) to `http://localhost:10020/curve-data`.
- **Do NOT carry forward from the prototype:** synthetic rates and the September 2026 business-day list, inline styles, remote CDN icons and fonts, and the toast-only "Export CSV".
- **Live smoke test.** The overview returned empty `KeyRates` and `SpotCurves` at intake, so check early that `/v1/curves/{Code}/availability` and `/rates` return real data on the running service.
- **Observation-date source for the file log link.** The file-log epic must accept an incoming selection (file Id or WOID) so this epic can deep-link to it.
