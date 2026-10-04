# Story 3: Rates by date across a date range

**Slug:** story-3-rates-by-date
**Requirement IDs:** R7, R8, R9, R10, BR3, BR4, BR5, NFR-1, NFR-2, NFR-3
**Roles:** Demo presenter
**Route:** /curve-data
**Target file:** web/src/app/(app)/curve-data/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Switch to "By date", give a date range and the maturities you want (e.g. 1Y,5Y,10Y), and see one row per valuation date with one column per chosen maturity.

## Summary

Adds the "By maturity" / "By date" segmented switch. The By date view has From / To date inputs (checked as YYYY-MM-DD; default to the curve's available range) and a comma-separated tenor input. An invalid tenor input shows "Separate tenor labels with commas, for example 1Y,5Y,10Y.". Calls GET /v1/curves/{Code}/rate-matrix with ObservationDateFrom, ObservationDateTo and Tenors. Rows are dates; columns follow the response's Tenors[], each headed "{label} (%)". Cells are matched by TenorLabel, not position; a missing cell shows a dash. Mono, 4 decimals, sticky header, scrolls inside the card. When no tenors are entered, the key tenors are used. A range with no rows shows "No data imported".

## Acceptance criteria

- **AC-1** (coverage: playwright): Switching to By date and entering a date range and tenors shows one row per observation date and one column per chosen tenor, labelled in percent
- **AC-2** (coverage: vitest): Each rate appears under the column of its own tenor label, even when the service lists a row's rates in a different order or leaves one out
- **AC-3** (coverage: vitest): Tenors not entered as comma-separated labels show "Separate tenor labels with commas, for example 1Y,5Y,10Y."
- **AC-4** (coverage: vitest): A From or To date not written as YYYY-MM-DD shows the date-format message and no matrix is requested
- **AC-5** (coverage: vitest): A date range with no imported data shows "No data imported" instead of an error
- **AC-6** (coverage: vitest): Switching back to By maturity shows the single-date table for the same curve again

## Manual test checklist

- Click "By date" → the table shows one row per valuation date with a column per maturity
- Enter 1Y,5Y,10Y and a date range → only those three maturities appear as columns, each headed with (%)
- Enter "1Y 5Y" (spaces, no commas) → you see "Separate tenor labels with commas, for example 1Y,5Y,10Y."
- Enter a range with no imported data → you see "No data imported"
- Click "By maturity" → you are back on the single-date table

## Additional technical checks

Count: 1

## Reuse notes

- Endpoint functions already in web/src/lib/api/endpoints.ts: getCurves, getCurveTenors, getCurveRates, getCurveAvailability, getCurveRateMatrix.
- CSV: use downloadFile() in web/src/lib/api/download.ts (downloadCurveRatesCSV only returns a Blob).
- Trace link: importTracePath(woid) from components/file-log/FileDetailCard.tsx (consider moving to lib/); trace page at /file-log/imports/[woid].
- Date validation: isIsoDate from web/src/lib/validation/iso-date.ts; add constant "Enter the observation date as YYYY-MM-DD.".
- DataState/useDataState, useToast, PageHeader, shadcn select/input/label/table/card/button/skeleton/alert/badge.
- No curve mocks exist yet in web/src/mocks/data; create curve, tenor, rate, availability, rate-matrix fixtures per CurveData.yaml.

## Resolved design choices

- WOID link opens the existing import trace page (/file-log/imports/[woid]).
- Valuation date starts on the latest date with data; earliest, latest and available dates offered; any date can be typed.
- No-data message: "No data imported" followed by the hint "Choose another valuation date or import a file."
- By date with no tenors typed uses key tenors: long end 1Y,2Y,5Y,10Y,20Y,30Y; short end 1M,3M,6M,1Y,2Y,5Y.
- Export CSV is unavailable in the By date view; it works from By maturity.
