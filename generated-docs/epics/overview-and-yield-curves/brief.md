# Epic brief: Overview and yield curve charts

Inherits roles, auth, data source, compliance, and styling from project.md.

**Depends on:** `app-shell-and-sign-in` (shell, navigation, sign-in, API client and proxy, shared chart/stat/table styling), `file-log` (the File log view that "Recent loads" rows open, and the shared file-table columns and status badges).

---

## Goal

The presenter opens an at-a-glance overview (latest valuation date, headline rates and their change, file counts, spot curves, recent loads) and charts curves across dates or across families.

Two views are delivered: **Overview** and **Yield curves**. Both read the live service (`http://localhost:10020/curve-data`, via the Next.js proxy). Sample data is a fallback only and must never be shown as if it were real.

---

## Data Model

Sourced from `documentation/CurveData.yaml` (authoritative), cross-checked with the design digest. All fields are as the API returns them.

**OverviewRead** (`GET /v1/overview`)

| Field | Type | Notes |
|---|---|---|
| LatestValuationDate | string (YYYY-MM-DD, UTC) | May be absent or empty when nothing has been imported (see Risks). |
| KeyRates[] | KeyRateItem | CurveCode, Name, Family, RateType, TenorLabel, RatePercent (number, percent), ChangeBp (nullable string holding a number: parse it, null means no change value). Expected items: 10Y nominal spot and 10Y implied inflation spot. |
| FileCounts | Total, Current, Failed (integers) | |
| SpotCurves[] | SpotCurveItem | CurveCode, CurveName, RateType, Family (Nominal, Real, Inflation), Segment, ObservationDate, Points[] of { TenorYears, RatePercent } |
| RecentFiles[] | FileRead | Id, FileName, CurveFamily, ReceivedAt, SizeBytes (nullable string), RecordCount, RecordsInserted (nullable string), Woid, Status (Imported, Failed, Processing), IsCurrent |

**Curve catalogue** (`GET /v1/curves`): Code, Name, Family (Nominal, Real, Inflation, OIS), RateType (Spot, Forward), Segment (Long, ShortEnd), RateUnit ("Percent"), Provider. 16 curves. The Yield curves selector offers the 8 long-end curves only.

**Availability** (`GET /v1/curves/{Code}/availability`): MinDate, MaxDate, Dates[]. Used to default the dates and to know which dates have data.

**Compare** (`GET /v1/curves/compare?Codes=&ObservationDates=`): Series[] of { Code, Name, ObservationDate, Points[] of { TenorYears, RatePercent } }. One series per code/date combination; combinations with no rates are expected to be absent.

**Rates** (`GET /v1/curves/{Code}/rates?ObservationDate=`): `Rates[]` of { TenorLabel, TenorYears, RatePercent, SourceRowId, Woid }. An unknown date returns 200 with an empty array, not an error. This is the fallback source if a single curve and date must be drawn without the compare endpoint.

Parsing rule: `ChangeBp`, `SizeBytes` and `RecordsInserted` are strings in the spec and may be null; parse explicitly and never render "NaN" or "null".

---

## Functional Requirements

**Overview**

- **R1.** (was R52, F-01, UI-01) The Overview shows the latest valuation date, taken from `LatestValuationDate`, as an ISO date, with the subtitle "Latest valuation date {date}. Source: Bank of England, daily estimated UK yield curves."
- **R2.** (was R53) The Overview shows the headline rates, "10Y nominal spot" and "10Y implied inflation", each to 4 decimals with unit "%", each with its change in basis points against the prior day, formatted "+2.1 bp vs prior day" or "−2.1 bp vs prior day" (true minus sign U+2212, 1 decimal). An increase uses the success tone, a decrease the danger tone, and the sign is always in the text so colour is never the only cue.
- **R3.** (was R54, BR-11) When a headline rate has no prior day (`ChangeBp` null or absent), no change value is shown at all. No "0.0 bp", no placeholder dash.
- **R4.** (was R55, UI-20) The Overview shows the file counts as "Files received" (the total), with the line "{n} failed, {m} current", or "{m} current" when none have failed, in a neutral tone.
- **R5.** (was R56) The Overview shows a chart titled "Spot curves on latest valuation date" (subtitle "Nominal, real, implied inflation and OIS, long end") with up to four series, "Nominal spot", "Real spot", "Inflation spot" and "OIS spot", built from `SpotCurves`. X axis "Maturity (years)" with ticks 0 to 40 in steps of 5; Y axis "Spot rate (%)" to 3 decimals. Series colours run chart-1, chart-2, chart-3, chart-4 from the design tokens.
- **R6.** (was R57) The Overview shows the last five files as "Recent loads", newest first, using the same columns and status badges as the File log. Clicking a row opens the File log with that file selected and its detail panel open.

**Yield curves**

- **R7.** (was R58, UI-06, Could) A simple yield-curve line chart is available for one chosen curve and one valuation date (rate against tenor). Because the design has no separate single-date mode, this is met by the Across dates chart showing a single series when no comparison date is set. Flagged as an assumption in Notes.
- **R8.** (was R59, F-07, UI-07, BR-09) Across dates: for one curve (long-end curves only, default "UK nominal spot curve") the presenter picks a "Valuation date" and a "Compare with" date and sees one series per date; the comparison date is drawn dashed. The chart title is the curve name and the subtitle is "{date} compared with {compare date}". Series are named by date.
- **R9.** (was R60) Across families: for one valuation date the presenter sees the Nominal, Real, Inflation and OIS curves of the same rate type and segment as the selected curve on one chart. The title is "{Spot|Forward} curves by family" and the subtitle "{date}, long end" (or "short end").
- **R10.** (was R61, BR-09) Any curve and date combination with no imported rates is left out of the chart, and the chart subtitle says so, with "No data has been imported for {curve name} on {date}." (or "… on {date} or {date}."). In Across families, name the family curve instead of the selected one.

Shared chart behaviour (applies to R5, R7 to R9): hovering shows a vertical guide and a tooltip reading "{x} years" with one line per series; axis labels are "Maturity (years)" and "Spot rate (%)" or "Forward rate (%)" by rate type; X ticks are 0 to 40 in 5s for long-end curves and 0 to 5 for short-end curves; chart height is 280px on the Overview and 340px on Yield curves; all colours come from tokens, none hard-coded in components.

---

## Business Rules

- **BR1.** (BR-11) A headline rate with no prior observation shows no change value.
- **BR2.** (BR-09) Comparisons run either across dates for one curve or across families for one date, never both at once. Combinations without rates are omitted, not drawn as empty or zero series.
- **BR3.** (BR-01, BR-07) A date with no imported data is not an error. It yields an empty result and a plain-language message. Rates are always labelled as percent, and changes as basis points.
- **BR4.** Live reads take precedence. The Overview and charts display only what the service returns. Prototype synthetic values (September 2026 business days, formula-driven rates and deltas) must not be shipped as facts.
- **BR5.** Status and badge presentation of "Recent loads" rows follows the File log (Imported success, Failed danger, Processing info), always with a text label.

---

## Key Workflows

1. **Overview at a glance.** Presenter signs in, lands on Overview, reads the latest valuation date, the 10Y nominal and implied-inflation rates with their change, the file counts, and the spot curves chart.
2. **Trace a recent load.** From "Recent loads" the presenter clicks a row, the File log opens with that file's detail panel showing.
3. **Compare across dates.** On Yield curves the presenter chooses a curve, a valuation date and a comparison date, and reads the two series (comparison dashed).
4. **Compare across families.** The presenter switches to "Across families", picks a date, and reads Nominal, Real, Inflation and OIS together.
5. **Missing data.** The presenter picks a date with no import; the series for that date is omitted and the subtitle names what is missing.

---

## Feature NFRs

- **NFR1.** The Overview makes one `GET /v1/overview` call. Charts for Yield curves use `GET /v1/curves/compare`, plus availability for default dates. All calls go through the shared API client, never raw `fetch()` in components.
- **NFR2.** Loading and error states use the shared pattern: nothing shown for the first 300 ms, then a skeleton, then a skeleton with a message after 3 s. A failed call shows a persistent message with a Retry action (NFR-base-5).
- **NFR3.** Charts are readable without colour alone (distinct dash for the comparison series, legend labels) and each chart has a text alternative or accessible summary of its series (NFR-base-1).
- **NFR4.** Chart colours and fonts come from the `globals.css` tokens (series chart-1 to chart-6); numbers, dates and IDs use the mono face with tabular figures.
- **NFR5.** Tooltip, axis and stat copy follows the voice rules: sentence case, British spelling, no exclamation marks, errors say what happened then what to do.

---

## Empty and error states (specified here because the live service returned empty data)

At smoke test on 2026-10-04 the live `GET /v1/overview` returned `KeyRates: []` and `SpotCurves: []` while `FileCounts` was Total 4, Current 4, Failed 0. The Overview must therefore read sensibly with no rates at all, and not crash, show NaN, or show zeros.

| Surface | Condition | What the presenter sees |
|---|---|---|
| Latest valuation date card | `LatestValuationDate` absent or empty | The card stays, with the value "No data" and the line "No rates have been imported yet." The subtitle drops the date: "Source: Bank of England, daily estimated UK yield curves." |
| 10Y nominal spot / 10Y implied inflation cards | the matching `KeyRates` item is missing | The card keeps its label; the value reads "No data"; no unit and no change line. |
| A key rate whose `ChangeBp` is null | no prior day | The value shows; the change line is omitted (BR1). |
| Files received card | `FileCounts` present | Shown as normal, independent of rate data (so it can read 4 total, 4 current, no failed line). |
| Spot curves chart | `SpotCurves` empty | The card and title stay; the plot area is replaced by one line: "No spot curves have been imported yet." No empty axes. |
| Spot curves chart | only some of the four families present | Draw those that exist; the subtitle adds "No data for {family}." for the rest (BR2). |
| Recent loads | `RecentFiles` empty | "No files have been received yet." (names the entity). Rows present: shown as normal. |
| Overview call fails | network or 5xx | Persistent message with the service error and a Retry action. Cards do not render partial invented values. |
| Yield curves, a date without data | empty `Rates` or missing series | Subtitle replaced by "No data has been imported for {curve name} on {date}." The chart still shows any series that do have data; if none do, the plot area shows the same line only. |
| Yield curves, no dates available at all | availability returns an empty `Dates` | The date inputs stay editable; the chart area reads "No data has been imported for {curve name}." |

Copy above is proposed in the application voice (calm, plain, one factual line naming the missing items) and is not in the design; confirm at the stories approval.

---

## Out of Scope

- Curve data tables, curve catalogue filters, by-date matrix and CSV export (Curve data epic).
- File log, file detail panel, status filter, Import file dialog and original-file download (File log epic).
- Workflow monitor and the API reference page.
- Comparing more than two dates, or more than one curve at a time, in Across dates mode. The requirements allow "several", while the chosen prototype design has two dates; a multi-date picker is not planned unless confirmed.
- Short-end curves in Across families beyond what the segment selection of the chosen curve implies (the selector offers long-end curves only).
- Writing, importing or simulating any data. The service is read-only.

---

## Notes & Caveats

**Risks**

- **Risk, high: empty overview data.** The live overview returned empty `KeyRates` and `SpotCurves`. If that persists, two of the four stat cards and the whole chart will show empty states during the demo, and the acceptance wording of R2, R3 and R5 cannot be demonstrated. Before the demo the data service needs rates imported for at least one valuation date (ideally two consecutive business days so the bp change appears). Decide whether this epic should also (a) derive the headline rates and spot curves from `/v1/curves/{Code}/availability` plus `/rates` or `/compare` when the overview arrays are empty, or (b) leave it to the service. This brief assumes (b) and the empty states above; option (a) is a scope addition and has to be confirmed by the user. A fixture fallback is not planned (mock layer: no).
- **Risk, medium: file counts and rate data disagree.** `FileCounts` 4/4/0 with no rates suggests files were logged but rates not published or not joined to the overview. Check with the service owner before treating this as a front-end fault.
- **Risk, medium: 10Y tenor and tenor grids.** The headline rates assume a 10Y tenor on the nominal and implied inflation spot curves. The prototype tenor grids (0.5 to 40Y long end, 1 to 60M short end) are inferred. Tick ranges (0 to 40 / 0 to 5) should be checked against real `Points`; if the data exceeds them, extend the axis rather than clip.
- **Risk, low: CORS.** Calls must go through the Next.js rewrite (NFR-base-6), otherwise the browser blocks them and every view in this epic shows its error state.

**Assumptions to confirm**

- R7: "simple yield-curve line chart" is delivered as Across dates with one date, since the design has no separate single-curve view.
- Defaults: Valuation date defaults to the latest available date for the selected curve (from availability), and "Compare with" to the previous available date. The prototype used a free date input, so the date pickers should either be limited to dates with data or keep the free input plus the "no data" message. The design leaves this open.
- Across families uses the rate type and segment of the selected curve (the design title "{Spot|Forward} curves by family"); the selected curve's family itself does not narrow the chart.
- Series order in Across families is Nominal, Real, Inflation, OIS (chart-1 to chart-4).

**Translate, do not copy (do NOT carry forward to production)**

- Prototype rates, 10Y values, bp deltas and the September 2026 date list are formula-generated. Build against the live service.
- The prototype's canned five file-log rows behind "Recent loads" are sample records; use `RecentFiles` from the service.
- Icons are Lucide and fonts IBM Plex, loaded from CDNs in the prototype; use local assets. No inline styles; use tokens and Shadcn primitives (cards, selects, inputs, segmented buttons) composed with a charting component built on the token palette.
- The Overview "Recent loads" table must reuse the File log table component rather than duplicating it.
- Prototype-only example values (API base URL, Windows paths, hard-coded counts) must not appear in this epic's UI.
