# Story 4: Export rates as CSV

**Slug:** story-4-export-csv
**Requirement IDs:** R11, BR3, NFR-5
**Roles:** Demo presenter
**Route:** /curve-data
**Target file:** web/src/app/(app)/curve-data/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Click "Export CSV" to download a real CSV file of the shown curve and valuation date (tenor label, tenor years and rate in percent). "CSV export prepared." confirms it.

## Summary

Adds the secondary "Export CSV" button (download icon) to the filter row. It calls downloadFile('/v1/curves/{Code}/rates.csv', { ObservationDate }), falling back to the name "{Code}-{date}.csv" when the service sends no Content-Disposition. On success it shows the toast "CSV export prepared." through useToast (about 2.6 s, bottom-right). A failure shows a persistent error with Retry and no confirmation. The button is disabled while the valuation date is invalid and in the By date view.

## Acceptance criteria

- **AC-1** (coverage: playwright): Choosing Export CSV downloads a CSV file for the shown curve and valuation date
- **AC-2** (coverage: vitest): After a successful export the confirmation "CSV export prepared." appears briefly
- **AC-3** (coverage: vitest): When the export fails, an error message offers Retry and no confirmation is shown
- **AC-4** (coverage: vitest): Export CSV is unavailable while the valuation date is not a valid YYYY-MM-DD date

## Manual test checklist

- With a curve and a date with data shown, click Export CSV → a .csv file downloads and "CSV export prepared." appears bottom-right
- Open the downloaded file → it lists tenor label, tenor years and rate in percent for that curve and date
- Type an invalid valuation date → Export CSV can't be clicked

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
