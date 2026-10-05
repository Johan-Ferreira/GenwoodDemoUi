# Story 2: Filter the curve catalogue

**Slug:** story-2-curve-catalogue-filters
**Requirement IDs:** R1, BR6
**Roles:** Demo presenter
**Route:** /curve-data
**Target file:** web/src/app/(app)/curve-data/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

Narrow the curve list by family (Nominal, Real, Inflation, OIS), rate type (Spot, Forward) and segment (Long, ShortEnd), so only the curves that match can be chosen.

## Summary

Adds Family, Rate type and Segment filter selects beside the Curve select. Each defaults to "All". They filter the 16-curve catalogue (in memory, or through the GET /v1/curves Family/RateType/Segment query, whichever the developer picks consistently). The filters combine. If the selected curve drops out of the filtered list, the selection moves to the first matching curve and the table reloads. When nothing matches, a message explains it and offers to clear the filters.

## Acceptance criteria

- **AC-1** (coverage: playwright): Choosing a family, rate type and/or segment lists only the curves that match all the chosen filters
- **AC-2** (coverage: vitest): When the selected curve no longer matches the filters, the first matching curve is selected and its rates are shown
- **AC-3** (coverage: vitest): When no curve matches the filters, a message says so and offers to clear the filters
- **AC-4** (coverage: vitest): Clearing the filters lists all 16 curves again

## Manual test checklist

- Set Family to Inflation → the Curve list shows only inflation curves
- Also set Rate type to Forward and Segment to Long → only the matching curve(s) remain
- With a Nominal curve selected, change Family to Real → a Real curve becomes selected and the table shows its rates
- Clear the filters → all 16 curves are listed again

## Additional technical checks

Count: 0

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
