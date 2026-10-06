# Story 3: Curve data import-trace links and Yield curves date filter spacing

**Slug:** story-3-curve-data-links-and-yield-curves-layout
**Requirement IDs:** R6, R7, BR1, BR6, NFR-3, NFR-5
**Roles:** Demo presenter
**Route:** /curve-data
**Target file:** web/src/app/(app)/curve-data/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

On Curve data "By maturity", the source column has no heading and every row's link reads "View Import Trace", opening the same import trace as before. On Yield curves, "Compare with" sits right beside "Valuation date" instead of dropping below it.

## Summary

In `RatesByMaturity.tsx`, the last column's visible header text is removed, but the header cell keeps a visually hidden label ("Source import") so screen readers still announce the column (NFR-3). The column stays last. Each row's link reads the fixed text "View Import Trace" (BR6) with `href={importTracePath(rate.Woid)}` unchanged, and rows with no import still show the em dash. The `title` tooltip showing the raw WOID goes. In `YieldCurvesView.tsx`, only the spacing and wrap of the two ValuationDateField items change: tighter gap, aligned so the "Dates with data…" line under Valuation date no longer pushes Compare with down or onto a new row. Labels, behaviour and available dates are unchanged. Existing tests asserting "Source import (WOID)" or shortened-WOID link text (epic-curve-data-story-1, Vitest and e2e) get updated.

## Acceptance criteria

- **AC-1** (coverage: vitest): In the By maturity table, the source column shows no visible heading but is still announced to screen readers as "Source import".
- **AC-2** (coverage: vitest): Every row with an import shows a link reading "View Import Trace" (its accessible name), and rows without an import still show a dash.
- **AC-3** (coverage: playwright): Clicking "View Import Trace" opens the import trace for that row's file, as before.
- **AC-4** (coverage: none): On Yield curves, "Compare with" sits on the same row as "Valuation date", close beside it, with its label above its own field.

## Manual test checklist

- Open Curve data, By maturity → the last column has no heading text and each row's link reads "View Import Trace"
- Click "View Import Trace" on any row → the import trace for that file opens
- Open Yield curves (Across dates) → "Compare with" sits right beside "Valuation date" on the same line, not underneath
- Change both dates on Yield curves → the chart updates exactly as before

## Additional technical checks

0 additional technical checks.
