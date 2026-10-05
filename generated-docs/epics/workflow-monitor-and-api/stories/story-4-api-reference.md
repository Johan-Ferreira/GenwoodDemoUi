# Story 4: API reference

**Slug:** story-4-api-reference
**Requirement IDs:** R9, BR6, NFR-3, NFR-5
**Roles:** Demo presenter
**Route:** /api-reference
**Target file:** web/src/app/(app)/api-reference/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The presenter opens API and picks a curve (all 16) and a valuation date. The page lists the live service's endpoints from the design and shows an example request and response for that curve and date, using the real service address instead of the prototype's example address.

## Summary

Replaces the placeholder `/api-reference` page with title, subtitle, a Curve select (CurveSelect, `GET /v1/curves`) and a Valuation date picker (ValuationDateField, per the curve-data decision). Two-column layout 1 : 1.4. Left: an Endpoints table (Method, Path) listing ONLY the four endpoints the design shows (curves, tenors, rates, import trace), using the live `/v1` paths. Right: an "Example request and response" pre block showing `GET <service base>/v1/curves/{Code}/rates?ObservationDate={date}` and a response in `RateReadList` shape (`{ Rates: [{ TenorLabel, TenorYears, RatePercent, SourceRowId, Woid }] }`). The example response comes from a LIVE call for the chosen curve and date (real rates, or an empty list when there is no data). Prototype addresses are not used. A curve-list error shows Retry.

## Resolved design choices

- Endpoints listed: only the four the design shows, with live `/v1` paths (not all 15).
- Example response: a live call for the chosen curve and valuation date.

## Acceptance criteria

- **AC-1** (coverage: vitest): The Endpoints table lists the four endpoints the design shows (curves, tenors, rates, import trace), each with method GET and its live `/v1/...` path.
- **AC-2** (coverage: vitest): The Curve choice offers all 16 curves, and the Valuation date can be picked or typed.
- **AC-3** (coverage: vitest): The example request shows the service address with the chosen curve and valuation date, and it updates when either choice changes.
- **AC-4** (coverage: vitest): The example response shows the rates returned live for the chosen curve and date in the service's response shape (tenor label, tenor years, rate percent, source row, WOID), or an empty list when there is no data.
- **AC-5** (coverage: vitest): The page never shows the prototype's example address or its illustrative contract.
- **AC-6** (coverage: playwright): Opening API from the side menu shows the endpoints and example, and the page passes an accessibility scan.

## Manual test checklist

- Open API from the side menu → you see the Endpoints table and the example request and response side by side
- Check the Endpoints table → every row is GET with a path starting "/v1/"
- Open the Curve choice → all 16 curves are listed
- Pick a different curve and valuation date → the example request and response change to match
- Look over the page → "genwood-demo.example" does not appear anywhere

## Additional technical checks

2 technical checks verified automatically.

## Reuse notes

CurveSelect, ValuationDateField (components/curve-data/); PageHeader; DataState.
