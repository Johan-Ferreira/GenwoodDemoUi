# Story 1: Rates by maturity for a curve and valuation date

**Slug:** story-1-rates-by-maturity
**Requirement IDs:** R2, R3, R4, R5, R6, R7, R12, BR1, BR2, BR3, BR5, BR6, NFR-1, NFR-2, NFR-3, NFR-4
**Roles:** Demo presenter
**Route:** /curve-data
**Target file:** web/src/app/(app)/curve-data/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Open Curve data, pick a curve and a valuation date, and see the rate at each maturity. Each rate shows its source column, source row and source import, and you can open the import that produced it. The earliest, latest and available dates are offered, and a date with no data shows "No data imported" instead of an error.

## Summary

Replaces the placeholder Curve data page with a "Curve" select (all 16 curves from GET /v1/curves) and a "Valuation date" input. The input is checked with isIsoDate, and an invalid date shows "Enter the observation date as YYYY-MM-DD.". GET /v1/curves/{Code}/availability supplies the earliest, latest and available dates, and the date defaults to the latest one. The by-maturity table builds its rows from the service's tenors (GET /tenors), never a hard-coded grid, joined by tenor label to GET /rates?ObservationDate=, with columns Tenor, Years, Months, Source column, Rate (%), Source row and Source import (WOID). The WOID links to the import trace page (importTracePath). Numbers use IBM Plex Mono with tabular figures and 4 decimal places. The table sits in a card of max height 520px with a sticky header. An empty Rates array shows "No data imported" with an empty list. Loading and errors use DataState: a skeleton while loading, and a persistent error with Retry.

## Acceptance criteria

- **AC-1** (coverage: vitest): With a curve and a date that has data chosen, the table lists one row per maturity with tenor, years, months, source column, rate (%), source row and source import, rates to 4 decimal places
- **AC-2** (coverage: vitest): Choosing a curve offers its earliest date, latest date and the available dates, and the valuation date starts at the latest available date
- **AC-3** (coverage: vitest): A valuation date not written as YYYY-MM-DD shows "Enter the observation date as YYYY-MM-DD." and no rates are requested
- **AC-4** (coverage: vitest): A valuation date with no imported data shows "No data imported" with an empty rate list, not an error
- **AC-5** (coverage: playwright): Choosing a rate's source import link opens the trace of the import that produced it
- **AC-6** (coverage: vitest): When the curve data cannot be loaded, a persistent error message offers Retry, and Retry reloads it

## Manual test checklist

- Open Curve data → a curve is selected, the valuation date shows the latest date with data, and the table lists one rate per maturity
- Check the table → every rate column is headed "Rate (%)" and shows 4 decimal places
- Pick another date from the available dates → the table updates to that date's rates
- Type 04/10/2026 as the valuation date → you see "Enter the observation date as YYYY-MM-DD."
- Type a date with no data (e.g. a weekend) → you see "No data imported" and an empty list, not an error
- Click a rate's source import (WOID) → the import trace opens with its file log entry, workflow instance, and rates and curves counts
- Switch to a long-end curve with many maturities → the header stays put while the table scrolls inside its card

## Additional technical checks

Count: 2

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
